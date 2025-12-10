package server

import (
	"context"
	"strconv"
	"time"

	"github.com/AdguardTeam/dnsproxy/proxy"
	"github.com/getsentry/sentry-go"
	"github.com/ivpn/dns/proxy/model"
	"github.com/ivpn/dns/proxy/requestcontext"
	"github.com/miekg/dns"
)

func (s *Server) EmitStatistics(reqCtx *requestcontext.RequestContext, dctx *proxy.DNSContext) {
	defer sentry.Recover()

	// Use the contextual logger from the request context
	logger := reqCtx.Logger

	statsSettings, err := s.Cache.GetProfileStatisticsSettings(context.Background(), reqCtx.ProfileId)
	if err != nil {
		logger.Err(err).Msg("Error getting profile statistics settings")
	}
	statsEnabled, err := strconv.ParseBool(statsSettings["enabled"])
	if err != nil {
		logger.Err(err).Msg("Error parsing profile logs settings")
	}
	if statsEnabled {
		logger.Trace().Msg("Sending optional statistics")
		// TODO: Emit optional statistics, not implemented yet
	}
	// emit query number statistics (obligatory)
	logger.Trace().Str("protocol", string(dctx.Proto)).Str("qtype", dns.Type(dctx.Req.Question[0].Qtype).String()).Msg("Sending statistics event to channel")
	stats := &model.Statistics{
		Timestamp: time.Now().UTC(),
		ProfileID: reqCtx.ProfileId,
		DeviceId:  reqCtx.DeviceId,
		Queries: model.Queries{
			Total: 1,
		},
	}
	if reqCtx.FilterResult.Status == model.StatusBlocked {
		stats.Queries.Blocked = 1
	}

	if dctx.Res != nil && dctx.Res.AuthenticatedData {
		stats.Queries.DNSSEC = 1
	}

	if err = s.CollectorChannels[model.TYPE_STATISTICS].Send(
		model.EventStatistics{
			Statistics: stats,
		},
	); err != nil {
		logger.Err(err).Msg("Failed to send statistics event to channel")
	}
}
