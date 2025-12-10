package dns

import (
	"github.com/dnscheck/cache"
	"github.com/dnscheck/config"
	"github.com/dnscheck/internal/maxmind"
	"github.com/miekg/dns"
)

// DNSServer represents a DNS server
type DNSServer struct {
	Config *config.Config

	DNSUDP *dns.Server
	DNSTCP *dns.Server

	Cache     cache.Cache
	GeoLookup *maxmind.GeoLookupManager
}

// New creates a new DNS server
func New(config *config.Config, cache cache.Cache) (*DNSServer, error) {
	srv := &DNSServer{
		Config: config,
		Cache:  cache,
	}

	srv.GeoLookup = maxmind.NewGeoLookupManager(config.GeoLookupConfig.DBFile, config.GeoLookupConfig.DBASNFile)

	// DNS
	srv.DNSTCP = &dns.Server{Addr: ":53", Net: "tcp"}
	srv.DNSTCP.Handler = &Handler{
		srv: srv,
	}

	// DNS
	srv.DNSUDP = &dns.Server{Addr: ":53", Net: "udp"}
	srv.DNSUDP.Handler = &Handler{
		srv: srv,
	}

	return srv, nil
}
