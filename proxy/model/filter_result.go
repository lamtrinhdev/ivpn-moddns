package model

const (
	StatusBlocked   Status = "blocked"
	StatusProcessed Status = "processed"
)

type Status string

type FilterResult struct {
	Status  Status   `json:"status"`
	Reasons []string `json:"reasons"`
}
