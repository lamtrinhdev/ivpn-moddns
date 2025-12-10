package api

import (
	"encoding/json"
	"fmt"
	"strings"

	"github.com/dnscheck/dns"
	"github.com/gofiber/fiber/v2"
	"github.com/rs/zerolog/log"
)

func (s *APIServer) DnsCheck() fiber.Handler {
	handler := func(c *fiber.Ctx) error {
		host := c.Hostname()
		log.Debug().Str("host", host).Msg("Host")
		hostParts := strings.Split(host, ".")
		if len(hostParts) < 1 {
			log.Error().Msg(ErrInvalidHostHeader)
			err := fmt.Errorf("invalid header: %s", host)
			return HandleError(c, err, ErrInvalidHostHeader)
		}

		// get data from cache
		log.Debug().Str("ID", hostParts[0]).Msg("Getting query data")
		data, err := s.Cache.GetQueryData(hostParts[0])
		if err != nil {
			return HandleError(c, err, ErrFailedToGetQueryData)
		}
		var dnsRecord dns.DNSLogRecord
		if err = json.Unmarshal(data, &dnsRecord); err != nil {
			log.Error().Err(err).Msg(ErrFailedToUnmarshalRecord)
			return HandleError(c, err, ErrFailedToUnmarshalRecord)
		}

		return c.Status(200).JSON(dnsRecord)
	}
	return handler
}
