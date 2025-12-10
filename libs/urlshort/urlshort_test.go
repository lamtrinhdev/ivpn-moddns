package urlshort

import (
	"bytes"
	"testing"
	"time"

	"github.com/google/uuid"
)

func TestURLShortener(t *testing.T) {
	tests := []struct {
		name        string
		originalURL string
		ttl         time.Duration
		data        []byte
		wantErr     bool
	}{
		{
			name:        "Valid URL",
			originalURL: "https://example.com" + uuid.NewString(),
			ttl:         time.Hour,
			wantErr:     false,
		},
		{
			name:        "Empty URL",
			originalURL: "",
			ttl:         time.Hour,
			wantErr:     true,
		},
		{
			name:        "URL with Data",
			originalURL: "https://example.com/file" + uuid.NewString(),
			data:        []byte("test data"),
			ttl:         time.Hour,
			wantErr:     false,
		},
		{
			name:        "Zero TTL",
			originalURL: "https://example.com" + uuid.NewString(),
			ttl:         0,
			wantErr:     false,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			shortener := NewURLShortener(WithDefaultTTL(time.Hour))
			defer shortener.Close()

			var shortURL string
			var err error

			if tt.data != nil {
				shortURL, err = shortener.ShortenWithData(tt.originalURL, tt.data)
			} else {
				shortURL, err = shortener.ShortenWithTTL(tt.originalURL, tt.ttl)
			}

			if (err != nil) != tt.wantErr {
				t.Errorf("ShortenWithTTL() error = %v, wantErr %v", err, tt.wantErr)
				return
			}

			if !tt.wantErr {
				// Test URL resolution
				resolvedURL, err := shortener.Resolve(shortURL)
				if err != nil {
					t.Errorf("Resolve() error = %v", err)
					return
				}

				if resolvedURL != tt.originalURL {
					t.Errorf("Resolve() got = %v, want %v", resolvedURL, tt.originalURL)
				}

				// Test data retrieval if data was provided
				if tt.data != nil {
					retrievedData, err := shortener.GetData(shortURL)
					if err != nil {
						t.Errorf("GetData() error = %v", err)
						return
					}

					if !bytes.Equal(retrievedData, tt.data) {
						t.Errorf("GetData() got = %v, want %v", retrievedData, tt.data)
					}
				}
			}
		})
	}
}

func TestURLShortenerExpiration(t *testing.T) {
	tests := []struct {
		name        string
		originalURL string
		ttl         time.Duration
		sleepTime   time.Duration
		wantErr     bool
	}{
		{
			name:        "Not Expired",
			originalURL: "https://example.com",
			ttl:         time.Second * 2,
			sleepTime:   time.Second,
			wantErr:     false,
		},
		{
			name:        "Expired",
			originalURL: "https://example.com",
			ttl:         time.Millisecond * 100,
			sleepTime:   time.Millisecond * 200,
			wantErr:     true,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			shortener := NewURLShortener(WithDefaultTTL(time.Hour))
			defer shortener.Close()

			shortURL, err := shortener.ShortenWithTTL(tt.originalURL, tt.ttl)
			if err != nil {
				t.Fatalf("ShortenWithTTL() error = %v", err)
			}

			time.Sleep(tt.sleepTime)

			_, err = shortener.Resolve(shortURL)
			if (err != nil) != tt.wantErr {
				t.Errorf("Resolve() error = %v, wantErr %v", err, tt.wantErr)
			}
		})
	}
}

func TestURLShortenerStats(t *testing.T) {
	shortener := NewURLShortener(WithDefaultTTL(time.Hour))
	defer shortener.Close()

	// Add some URLs
	urls := []string{
		"https://example1.com",
		"https://example2.com",
		"https://example3.com",
	}

	for _, url := range urls {
		_, err := shortener.Shorten(url)
		if err != nil {
			t.Fatalf("Shorten() error = %v", err)
		}
	}

	stats := shortener.Stats()

	if stats["total_urls"].(int) != len(urls) {
		t.Errorf("Stats() total_urls = %v, want %v", stats["total_urls"], len(urls))
	}

	if stats["expired_urls"].(int) != 0 {
		t.Errorf("Stats() expired_urls = %v, want 0", stats["expired_urls"])
	}

	if stats["default_ttl"].(string) != time.Hour.String() {
		t.Errorf("Stats() default_ttl = %v, want %v", stats["default_ttl"], time.Hour.String())
	}
}
