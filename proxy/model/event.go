package model

// EventQueryLog holds a DNS query log data with additional retention information
type EventQueryLog struct {
	QueryLog QueryLog
	Metadata Metadata
}

// EventStatistics holds a statistics data
type EventStatistics struct {
	Statistics *Statistics
}

type Metadata struct {
	Retention Retention
}

type Retention string

const (
	RetentionOneHour  Retention = "1h"
	RetentionSixHours Retention = "6h"
	RetentionOneDay   Retention = "1d"
	RetentionOneWeek  Retention = "1w"
	RetentionOneMonth Retention = "1m"
)
