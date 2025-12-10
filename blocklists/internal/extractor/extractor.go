package extractor

import (
	"fmt"
	"strings"
	"time"

	"github.com/rs/zerolog/log"
)

const (
	TypeAdguard     = "adguard"
	TypeHagezi      = "hagezi"
	TypeOISD        = "oisd"
	TypeStevenBlack = "steven_black"
)

type Extractor interface {
	ExtractMetadata(blocklistBytes []byte) (time.Time, string, int, error)
	ProcessLine(line string) (string, error)
	Convert(blocklistBytes []byte) ([]byte, error)
}

// NewExtractor creates a new Extractor instance based on the blocklist ID
func NewExtractor(blocklistID string) (Extractor, error) {
	switch {
	case strings.HasPrefix(blocklistID, "hagezi"):
		return NewHageziExtractor(), nil
	case strings.HasPrefix(blocklistID, "oisd"):
		return NewOISDExtractor(), nil
	case strings.HasPrefix(blocklistID, "adguard"):
		return NewAdguardExtractor(), nil
	case strings.HasPrefix(blocklistID, "steven_black"):
		return NewStevenBlackExtractor(), nil
	default:
		log.Error().Msg("Unknown blocklist ID")
		return nil, fmt.Errorf("unknown blocklist ID: %s", blocklistID)
	}
}
