package model

import (
	"time"

	"go.mongodb.org/mongo-driver/bson/primitive"
)

type Statistics struct {
	ID        primitive.ObjectID `json:"-" bson:"_id"`
	Timestamp time.Time          `json:"timestamp" bson:"timestamp"`
	ProfileID string             `json:"profile_id" bson:"profile_id"`
	DeviceId  string             `json:"device_id" bson:"device_id"`
	Queries   Queries            `json:"queries" bson:"queries"`
}

func (s *Statistics) Aggregate(other *Statistics) {
	s.Timestamp = other.Timestamp
	s.Queries.Total += other.Queries.Total
	s.Queries.Blocked += other.Queries.Blocked
	s.Queries.DNSSEC += other.Queries.DNSSEC
}

type Queries struct {
	Total   int `json:"total" bson:"total"`
	Blocked int `json:"blocked" bson:"blocked"`
	DNSSEC  int `json:"dnssec" bson:"dnssec"`
}
