package dns

const (
	StatusConfigured   = "ok"
	StatusUnconfigured = "unconfigured"
)

type DNSLogRecord struct {
	Status          string `json:"status"`
	ProfileId       string `json:"profile_id"`
	IPAddress       string `json:"ip_address"`
	ASN             uint   `json:"asn"`
	ASNOrganization string `json:"asn_organization"`
}
