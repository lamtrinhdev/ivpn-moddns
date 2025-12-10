package model

// Security represents security settings
type Security struct {
	DNSSECSettings DNSSECSettings `json:"dnssec" bson:"dnssec" redis:"dnssec" binding:"required"`
}

type DNSSECSettings struct {
	Enabled   bool `json:"enabled" bson:"enabled" redis:"enabled" binding:"required"`
	SendDoBit bool `json:"send_do_bit" bson:"send_do_bit" redis:"send_do_bit" binding:"required"`
}
