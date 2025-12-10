package config

import (
	"errors"
	"os"
	"strconv"
	"time"
)

// Config represents the application configuration
type Config struct {
	Server          *ServerConfig
	API             *APIConfig
	Cache           *CacheConfig
	GeoLookupConfig *GeoLookupConfig
}

// ServerConfig represents the server configuration
type ServerConfig struct {
	Domain     string
	IPAddress  string
	OurASN     uint
	OurIPRange string
}

// APIConfig represents the API configuration
type APIConfig struct {
	Port              string
	JWTSigningKey     string
	JWTExpirationTime time.Duration
	BasicAuthUser     string
	BasicAuthPassword string
	ApiAllowOrigin    string
}

// CacheConfig represents the cache configuration
type CacheConfig struct {
	TTL time.Duration
}

// GeoLookupConfig represents access to MaxMind GeoIP database
type GeoLookupConfig struct {
	DBFile    string
	DBASNFile string
}

// IsValid check whether config section is valid
func (cfg *GeoLookupConfig) IsValid() error {
	if cfg.DBFile == "" {
		return errors.New("[GeoIP] DBFile is required")

	}
	if cfg.DBASNFile == "" {
		return errors.New("[GeoIP] DBISP is required")

	}
	return nil
}

// New creates a new Config instance
func New() (*Config, error) {
	cacheTTL := os.Getenv("CACHE_TTL")
	ttl, err := time.ParseDuration(cacheTTL)
	if err != nil {
		ttl = 1 * time.Minute
	}

	asn := os.Getenv("SERVER_OUR_ASN")
	asnUint, err := strconv.ParseUint(asn, 0, 32)
	if err != nil {
		asnUint = 123456 // non-existent ASN
	}

	return &Config{
		Server: &ServerConfig{
			Domain:     os.Getenv("SERVER_DOMAIN"),
			IPAddress:  os.Getenv("SERVER_IP_ADDRESS"),
			OurASN:     uint(asnUint),
			OurIPRange: os.Getenv("SERVER_OUR_IP_RANGE"),
		},
		API: &APIConfig{
			Port:           os.Getenv("API_PORT"),
			ApiAllowOrigin: os.Getenv("API_ALLOW_ORIGIN"),
		},
		Cache: &CacheConfig{
			TTL: ttl,
		},
		GeoLookupConfig: &GeoLookupConfig{
			DBFile:    os.Getenv("GEOIP_DB_FILE"),
			DBASNFile: os.Getenv("GEOIP_DB_ASN_FILE"),
		},
	}, nil
}
