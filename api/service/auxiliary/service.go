package auxiliary

import (
	"context"
	"encoding/base64"
	"fmt"
	"io"
	"net/http"
	"sync"
	"time"

	"github.com/ivpn/dns/api/cache"
)

const LogoTTL = 30 * 24 * time.Hour // 1 month

type BrandLogoResult struct {
	Logos  map[string]string
	Errors map[string]string
}

type Service struct {
	clientId   string
	Cache      cache.Cache
	httpClient *http.Client
}

const httpClientTimeout = 10 * time.Second

func NewService(clientId string, c cache.Cache) *Service {
	client := &http.Client{Timeout: httpClientTimeout}
	return &Service{
		clientId:   clientId,
		Cache:      c,
		httpClient: client,
	}
}

// FetchBrandLogos fetches logos for the given domains from Brandfetch concurrently, using cache with 1 month TTL.
func (s *Service) FetchBrandLogos(ctx context.Context, domains []string) BrandLogoResult {
	// Do not fetch logos if clientId is empty
	if s.clientId == "" {
		return BrandLogoResult{
			Logos:  make(map[string]string),
			Errors: make(map[string]string),
		}
	}

	results := make(map[string]string)
	errMap := make(map[string]string)
	var mu sync.Mutex
	var wg sync.WaitGroup

	setResult := func(domain, logo string) {
		mu.Lock()
		results[domain] = logo
		mu.Unlock()
	}
	setError := func(domain, errMsg string) {
		mu.Lock()
		errMap[domain] = errMsg
		mu.Unlock()
	}

	for _, domain := range domains {
		wg.Add(1)
		go func(domain string) {
			defer wg.Done()
			cacheKey := "brandlogo:" + domain
			// Try cache first
			logo, err := s.Cache.Get(ctx, cacheKey)
			if err == nil && logo != "" {
				setResult(domain, logo)
				return
			}
			// Not in cache, fetch from Brandfetch
			// TODO: symbol parameter added after domain gives better results, but also returns Brandfetch logo if not found
			brandfetchURL := fmt.Sprintf("https://cdn.brandfetch.io/%s?c=%s", domain, s.clientId)
			resp, err := s.httpClient.Get(brandfetchURL)
			if err != nil {
				setError(domain, err.Error())
				return
			}
			defer resp.Body.Close()
			if resp.StatusCode == http.StatusOK {
				data, err := io.ReadAll(resp.Body)
				if err != nil {
					setError(domain, err.Error())
					return
				}
				contentType := resp.Header.Get("Content-Type")
				encoded := "data:" + contentType + ";base64," + base64.StdEncoding.EncodeToString(data)
				// Save to cache
				if err := s.Cache.Set(ctx, cacheKey, encoded, LogoTTL); err != nil {
					setError(domain, "cache set error: "+err.Error())
				}
				setResult(domain, encoded)
			} else {
				setError(domain, fmt.Sprintf("logo not found, status: %d", resp.StatusCode))
			}
		}(domain)
	}
	wg.Wait()
	return BrandLogoResult{Logos: results, Errors: errMap}
}
