package repository

import (
	"context"

	"github.com/ivpn/dns/api/model"
)

// SubscriptionRepository represents a Subscription repository
type SubscriptionRepository interface {
	GetSubscriptionByAccountId(ctx context.Context, accountId string) (*model.Subscription, error)
	GetSubscriptionById(ctx context.Context, subscriptionId string) (*model.Subscription, error)
	Upsert(ctx context.Context, subscription model.Subscription) error
	Create(ctx context.Context, subscription model.Subscription) error
}
