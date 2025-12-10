package requests

import "github.com/ivpn/dns/api/model"

type SubscriptionUpdates struct {
	Updates []model.SubscriptionUpdate `json:"updates" validate:"required,dive"`
}

// SubscriptionReq represents a subscription creation request
// ActiveUntil is accepted as-is (no format validation at handler level)
type SubscriptionReq struct {
	// ID is the external Subscription ID (UUIDv4)
	ID          string `json:"id" validate:"required,uuid4"`
	ActiveUntil string `json:"active_until" validate:"required"`
}
