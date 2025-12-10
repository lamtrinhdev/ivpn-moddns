package model

const RECURSOR_SDNS = "sdns"
const RECURSOR_UNBOUND = "unbound"
const RECURSOR_DEFAULT = RECURSOR_SDNS

var RECURSORS = []string{RECURSOR_SDNS, RECURSOR_UNBOUND}

type Advanced struct {
	Recursor string `json:"recursor" bson:"recursor" redis:"recursor" binding:"required"`
}
