package cache

// Config represents the cache configuration
type Config struct {
	Address               string
	FailoverAddresses     []string
	Username              string
	Password              string
	FailoverUsername      string
	FailoverPassword      string
	MasterName            string
	TLSEnabled            bool
	CertFile              string
	KeyFile               string
	CACertFile            string
	TLSInsecureSkipVerify bool // Only for testing & development, use false in production
}
