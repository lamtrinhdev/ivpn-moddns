package maxmind

import (
	"fmt"
	"net"

	"github.com/rs/zerolog/log"

	"github.com/oschwald/geoip2-golang"
)

type GeoLookupManager struct {
	DBFile    string
	DBASNFile string
}

func NewGeoLookupManager(dbFile, dbASNFile string) *GeoLookupManager {
	return &GeoLookupManager{
		DBFile:    dbFile,
		DBASNFile: dbASNFile,
	}
}

func (g *GeoLookupManager) GetGeoLookup(ip string) (*GeoLookup, error) {
	ipnet := net.ParseIP(ip)
	ipDB, err := geoip2.Open(g.DBFile)
	if err != nil {
		return nil, fmt.Errorf("cannot open geoip database: %v", err)
	}
	defer ipDB.Close()

	ispDB, err := geoip2.Open(g.DBASNFile)
	if err != nil {
		return nil, fmt.Errorf("cannot open geoip ISP database: %v", err)
	}
	defer ispDB.Close()

	asn, err := ispDB.ASN(ipnet)
	if err != nil {
		log.Error().Err(err).Msg("cannot get ASN")
	}

	return &GeoLookup{
		IPAddress:       ipnet.String(),
		ASN:             asn.AutonomousSystemNumber,
		ASNOrganization: asn.AutonomousSystemOrganization,
	}, nil
}
