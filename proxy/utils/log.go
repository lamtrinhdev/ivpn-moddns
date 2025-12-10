package utils

import (
	adlog "github.com/AdguardTeam/golibs/log"
	"github.com/rs/zerolog"
	"github.com/rs/zerolog/log"
)

// ParseAdGuardLogLevel converts a string log level to adlog.Level
func ParseAdGuardLogLevel(levelStr string) adlog.Level {
	switch levelStr {
	case "error":
		return adlog.ERROR
	case "info":
		return adlog.INFO
	case "debug":
		return adlog.DEBUG
	default:
		log.Warn().Str("level", levelStr).Msg("Invalid AdGuard log level, defaulting to INFO")
		return adlog.INFO
	}
}

// ParseZerologLevel converts a string log level to zerolog.Level
func ParseZerologLevel(levelStr string) zerolog.Level {
	switch levelStr {
	case "trace":
		return zerolog.TraceLevel
	case "debug":
		return zerolog.DebugLevel
	case "info":
		return zerolog.InfoLevel
	case "warn", "warning":
		return zerolog.WarnLevel
	case "error":
		return zerolog.ErrorLevel
	case "fatal":
		return zerolog.FatalLevel
	case "panic":
		return zerolog.PanicLevel
	case "disabled":
		return zerolog.Disabled
	default:
		log.Warn().Str("level", levelStr).Msg("Invalid zerolog log level, defaulting to INFO")
		return zerolog.InfoLevel
	}
}
