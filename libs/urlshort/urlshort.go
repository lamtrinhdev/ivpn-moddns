package urlshort

import (
	"crypto/rand"
	"encoding/base64"
	"errors"
	"sync"
	"time"

	"github.com/rs/zerolog/log"
)

// Option is a function that configures the URLShortener
type Option func(*URLShortener)

// URLEntry represents a shortened URL with expiration metadata
type URLEntry struct {
	OriginalURL string
	Data        []byte
	CreatedAt   time.Time
	ExpiresAt   time.Time
}

// URLShortener manages URL shortening with TTL-based expiration
type URLShortener struct {
	urls            map[string]URLEntry
	mutex           sync.RWMutex
	defaultTTL      time.Duration
	shortLength     int
	stopCleanup     chan struct{}
	statsInterval   time.Duration // New field for stats logging interval
	enableStatsLog  bool          // Flag to enable stats logging
	stopStatsLogger chan struct{} // Channel to stop stats logger
}

// NewURLShortener creates a new URL shortener with configurable defaults
func NewURLShortener(options ...Option) *URLShortener {
	// Default configuration
	s := &URLShortener{
		urls:            make(map[string]URLEntry),
		defaultTTL:      time.Hour, // Default 1 hour expiration
		shortLength:     6,         // Default 6 character short URLs
		stopCleanup:     make(chan struct{}),
		enableStatsLog:  false,
		statsInterval:   60 * time.Minute, // Default interval if enabled
		stopStatsLogger: make(chan struct{}),
	}

	// Apply any provided options
	for _, option := range options {
		option(s)
	}

	// Start the cleanup routine
	go s.cleanupRoutine()

	// Start stats logging routine if enabled
	if s.enableStatsLog {
		go s.statsLoggingRoutine()
	}

	return s
}

// WithStatsLogging enables periodic logging of URL shortener statistics
func WithStatsLogging(interval time.Duration) Option {
	return func(s *URLShortener) {
		s.enableStatsLog = true
		if interval > 0 {
			s.statsInterval = interval
		}
	}
}

// statsLoggingRoutine periodically logs statistics about the URL shortener
func (s *URLShortener) statsLoggingRoutine() {
	ticker := time.NewTicker(s.statsInterval)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			stats := s.Stats()
			log.Info().
				Int("total_urls", stats["total_urls"].(int)).
				Int("expired_urls", stats["expired_urls"].(int)).
				Str("default_ttl", stats["default_ttl"].(string)).
				Msg("URL shortener statistics")
		case <-s.stopStatsLogger:
			return
		}
	}
}

// Close stops the cleanup goroutine and stats logger if enabled
func (s *URLShortener) Close() {
	close(s.stopCleanup)
	if s.enableStatsLog {
		close(s.stopStatsLogger)
	}
}

// URLEntryWithData extends URLEntry to include file data
type URLEntryWithData struct {
	URLEntry
	Data []byte
}

// ShortenWithData creates a short URL and stores associated data
func (s *URLShortener) ShortenWithData(originalURL string, data []byte) (string, error) {
	if originalURL == "" {
		return "", errors.New("original URL cannot be empty")
	}

	token, err := s.generateShortURLToken()
	if err != nil {
		return "", err
	}

	s.mutex.Lock()
	defer s.mutex.Unlock()

	now := time.Now()
	s.urls[token] = URLEntry{
		OriginalURL: originalURL,
		Data:        data,
		CreatedAt:   now,
		ExpiresAt:   now.Add(s.defaultTTL),
	}

	return token, nil
}

// GetData retrieves file data associated with a short URL
func (s *URLShortener) GetData(shortURL string) ([]byte, error) {
	s.mutex.RLock()
	entry, exists := s.urls[shortURL]
	s.mutex.RUnlock()
	if !exists {
		return nil, errors.New("short URL not found")
	}

	if time.Now().After(entry.ExpiresAt) {
		s.mutex.Lock()
		delete(s.urls, shortURL)
		s.mutex.Unlock()
		return nil, errors.New("short URL has expired")
	}

	return entry.Data, nil
}

// WithDefaultTTL sets the default time-to-live for generated URLs
func WithDefaultTTL(ttl time.Duration) Option {
	return func(s *URLShortener) {
		if ttl > 0 {
			s.defaultTTL = ttl
		}
	}
}

// WithShortLength sets the length of generated short URLs
func WithShortLength(length int) Option {
	return func(s *URLShortener) {
		if length > 0 {
			s.shortLength = length
		}
	}
}

// Shorten creates a short URL for the original URL with default TTL
func (s *URLShortener) Shorten(originalURL string) (string, error) {
	return s.ShortenWithTTL(originalURL, s.defaultTTL)
}

// ShortenWithTTL creates a short URL with specific TTL
func (s *URLShortener) ShortenWithTTL(originalURL string, ttl time.Duration) (string, error) {
	if originalURL == "" {
		return "", errors.New("original URL cannot be empty")
	}

	if ttl <= 0 {
		ttl = s.defaultTTL
	}

	token, err := s.generateShortURLToken()
	if err != nil {
		return "", err
	}

	s.mutex.Lock()
	defer s.mutex.Unlock()

	now := time.Now()
	s.urls[token] = URLEntry{
		OriginalURL: originalURL,
		CreatedAt:   now,
		ExpiresAt:   now.Add(ttl),
	}
	// TODO: get domain from original URL, return short URL with domain
	return token, nil
}

// Resolve gets the original URL from a short URL if it exists and hasn't expired
func (s *URLShortener) Resolve(shortURL string) (string, error) {
	s.mutex.RLock()
	entry, exists := s.urls[shortURL]
	s.mutex.RUnlock()

	if !exists {
		return "", errors.New("short URL not found")
	}

	if time.Now().After(entry.ExpiresAt) {
		// URL has expired, clean it up
		s.mutex.Lock()
		delete(s.urls, shortURL)
		s.mutex.Unlock()
		return "", errors.New("short URL has expired")
	}

	return entry.OriginalURL, nil
}

// cleanupRoutine periodically removes expired URLs
func (s *URLShortener) cleanupRoutine() {
	ticker := time.NewTicker(5 * time.Minute)
	defer ticker.Stop()

	for {
		select {
		case <-ticker.C:
			s.cleanup()
		case <-s.stopCleanup:
			return
		}
	}
}

// cleanup removes expired URLs from the cache
func (s *URLShortener) cleanup() {
	s.mutex.Lock()
	defer s.mutex.Unlock()

	now := time.Now()
	for shortURL, entry := range s.urls {
		if now.After(entry.ExpiresAt) {
			delete(s.urls, shortURL)
		}
	}
}

// generateShortURL creates a random short URL of configured length
func (s *URLShortener) generateShortURLToken() (string, error) {
	// Create a buffer with enough randomness for our short URL length
	// We need more bytes than the final length to account for base64 encoding
	bytes := make([]byte, (s.shortLength*6+7)/8)

	for attempts := 0; attempts < 5; attempts++ {
		_, err := rand.Read(bytes)
		if err != nil {
			return "", err
		}

		encoded := base64.RawURLEncoding.EncodeToString(bytes)
		shortKey := encoded[:s.shortLength] // Truncate to desired length
		// Check if the key already exists
		s.mutex.RLock()
		_, exists := s.urls[shortKey]
		s.mutex.RUnlock()

		if !exists {
			return shortKey, nil
		}
	}

	return "", errors.New("failed to generate unique short URL after multiple attempts")
}

// Stats returns statistics about the URL shortener
func (s *URLShortener) Stats() map[string]interface{} {
	s.mutex.RLock()
	defer s.mutex.RUnlock()

	// Count expired URLs
	now := time.Now()
	expiredCount := 0
	for _, entry := range s.urls {
		if now.After(entry.ExpiresAt) {
			expiredCount++
		}
	}

	return map[string]interface{}{
		"total_urls":   len(s.urls),
		"expired_urls": expiredCount,
		"default_ttl":  s.defaultTTL.String(),
	}
}
