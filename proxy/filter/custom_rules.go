package filter

import (
	"context"
	"net"
	"regexp"
	"strings"

	"github.com/AdguardTeam/dnsproxy/proxy"
	"github.com/getsentry/sentry-go"
	"github.com/ivpn/dns/proxy/model"
	"github.com/ivpn/dns/proxy/requestcontext"
	"github.com/miekg/dns"
	"github.com/rs/zerolog/log"
)

const (
	ACTION_ALLOW        = "allow"
	ACTION_BLOCK        = "block"
	REASON_CUSTOM_RULES = "custom_rules"
	WILDCARD            = "*"
)

// matchDomain checks if the domain matches the pattern, handling wildcards
func (f *DomainFilter) matchDomain(domain, pattern string) bool {
	if !strings.Contains(pattern, WILDCARD) {
		return strings.EqualFold(domain, pattern)
	}

	// Get or compile regex pattern
	var re *regexp.Regexp
	if cached, ok := f.patternCache.Load(pattern); ok {
		re = cached.(*regexp.Regexp)
	} else {
		regexPattern := "^" + strings.ReplaceAll(regexp.QuoteMeta(pattern), "\\*", ".*") + "$"
		compiled, err := regexp.Compile(regexPattern)
		if err != nil {
			log.Error().Err(err).Str("pattern", pattern).Msg("Error compiling pattern")
			return false
		}
		f.patternCache.Store(pattern, compiled)
		re = compiled
	}
	return re.MatchString(domain)
}

// filterCustomRules checks if the domain is allowed or blocked by custom rules; method is executed before the DNS request is sent.
func (f *DomainFilter) filterCustomRules(reqCtx *requestcontext.RequestContext, dctx *proxy.DNSContext) (*model.FilterResult, error) {
	defer sentry.Recover()
	customRuleHashes, err := f.Cache.GetCustomRulesHashes(context.Background(), reqCtx.ProfileId)
	if err != nil {
		return nil, err
	}

	question := dctx.Req.Question[0].Name
	fqdn, _ := strings.CutSuffix(question, ".")

	var result model.FilterResult = model.FilterResult{Status: model.StatusProcessed}

	for _, customRuleHash := range customRuleHashes {
		hash, err := f.Cache.GetCustomRulesHash(context.Background(), customRuleHash)
		if err != nil {
			return nil, err
		}

		if f.matchDomain(fqdn, hash["value"]) {
			switch hash["action"] {
			case ACTION_BLOCK:
				reqCtx.Logger.Debug().
					Str("reason", REASON_CUSTOM_RULES).
					Str("pattern", hash["value"]).
					Str("protocol", string(dctx.Proto)).
					Str("qtype", dns.TypeToString[dctx.Req.Question[0].Qtype]).
					Str("domain", question).
					Msg("Domain blocked")
				result.Status = model.StatusBlocked
				result.Reasons = append(result.Reasons, REASON_CUSTOM_RULES)
				return &result, nil

			case ACTION_ALLOW:
				reqCtx.Logger.Debug().
					Str("reason", REASON_CUSTOM_RULES).
					Str("pattern", hash["value"]).
					Msgf("Allowing domain: %s", question)
				result.Reasons = append(result.Reasons, REASON_CUSTOM_RULES)
				return &result, nil
			}
		}
	}

	return &result, nil
}

// filterCustomRules checks if the IP address is allowed or blocked by custom rules; method is executed after the DNS request is sent.
func (f *IPFilter) filterCustomRules(reqCtx *requestcontext.RequestContext, dctx *proxy.DNSContext) (*model.FilterResult, error) {
	defer sentry.Recover()

	customRuleHashes, err := f.Cache.GetCustomRulesHashes(context.Background(), reqCtx.ProfileId)
	if err != nil {
		return nil, err
	}

	var result model.FilterResult = model.FilterResult{Status: model.StatusProcessed}

	for _, customRuleHash := range customRuleHashes {
		hash, err := f.Cache.GetCustomRulesHash(context.Background(), customRuleHash)
		if err != nil {
			return nil, err
		}
		syntax, ok := hash["syntax"]
		if !ok || syntax == "" {
			log.Debug().Str("hash", customRuleHash).Msg("Old custom rule detected, syntax is empty")
			continue
		}
		if !strings.Contains(syntax, "ip") {
			continue
		}
		if dctx.Res != nil {
			for _, a := range dctx.Res.Answer {
				f.filterIPs(&result, a, hash)
			}
		}

	}
	return &result, nil
}

func (f *IPFilter) filterIPs(result *model.FilterResult, rr dns.RR, hash map[string]string) {
	switch ip := rr.(type) {
	case *dns.A:
		if ip.A.Equal(net.ParseIP(hash["value"])) {
			switch hash["action"] {
			case ACTION_BLOCK:
				log.Debug().
					Str("reason", REASON_CUSTOM_RULES).
					Str("pattern", hash["value"]).
					Msgf("Blocked IP: %s", ip.A.String())
				result.Status = model.StatusBlocked
				result.Reasons = append(result.Reasons, REASON_CUSTOM_RULES)

			case ACTION_ALLOW:
				log.Debug().
					Str("reason", REASON_CUSTOM_RULES).
					Str("pattern", hash["value"]).
					Msgf("Allowing IP: %s", rr.String())
				result.Reasons = append(result.Reasons, REASON_CUSTOM_RULES)
			}
		}
	case *dns.AAAA:
		if ip.AAAA.Equal(net.ParseIP(hash["value"])) {
			switch hash["action"] {
			case ACTION_BLOCK:
				log.Debug().
					Str("reason", REASON_CUSTOM_RULES).
					Str("pattern", hash["value"]).
					Msgf("Blocked IP: %s", ip.AAAA.String())
				result.Status = model.StatusBlocked
				result.Reasons = append(result.Reasons, REASON_CUSTOM_RULES)

			case ACTION_ALLOW:
				log.Debug().
					Str("reason", REASON_CUSTOM_RULES).
					Str("pattern", hash["value"]).
					Msgf("Allowing IP: %s", rr.String())
				result.Reasons = append(result.Reasons, REASON_CUSTOM_RULES)
			}
		}
	}
}
