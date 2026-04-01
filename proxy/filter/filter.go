package filter

import (
	"github.com/AdguardTeam/dnsproxy/proxy"
	"github.com/ivpn/dns/proxy/requestcontext"
)

type Filter interface {
	Execute(reqCtx *requestcontext.RequestContext, dctx *proxy.DNSContext) error
}

const (
	FilterTypeDomain = "domain"
	FilterTypeIP     = "ip"
)
