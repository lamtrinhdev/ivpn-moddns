package maxmind

type GeoLookup struct {
	IPAddress       string `json:"ip_address"`
	ASN             uint   `json:"asn"`
	ASNOrganization string `json:"asn_organization"`
	IsIvpnServer    bool   `json:"is_ivpn_server"`
}
