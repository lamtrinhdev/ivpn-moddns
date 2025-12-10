package model

import (
	"time"

	"github.com/google/uuid"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type SubscriptionType string

const (
	Free    SubscriptionType = "Free"
	Managed SubscriptionType = "Managed"
)

// Subscription represents a subscription with its properties
type Subscription struct {
	// ID is the primary key (UUIDv4) stored in Mongo _id
	ID          uuid.UUID          `json:"-" bson:"_id"`
	AccountID   primitive.ObjectID `json:"-" bson:"account_id"`
	Type        SubscriptionType   `json:"type" bson:"type"`
	ActiveUntil time.Time          `json:"active_until" bson:"active_until"`
	Limits      SubscriptionLimits `json:"-" bson:"limits"`
}

func (s *Subscription) IsActive() bool {
	return s.ActiveUntil.After(time.Now())
}

type SubscriptionLimits struct {
	MaxQueriesPerMonth int `json:"max_queries_per_month" bson:"max_queries_per_month"`
}

// SubscriptionUpdate represents subscription update
// RFC6902 JSON Patch format is used
type SubscriptionUpdate struct {
	Operation string `json:"operation" validate:"required,oneof=remove add replace move copy"`
	Path      string `json:"path" validate:"required,oneof=/not_implemented"`
	Value     any    `json:"value" validate:"required"`
}
