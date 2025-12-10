package subscription

import (
	"context"
	"errors"

	"github.com/araddon/dateparse"
	"github.com/google/uuid"
	"github.com/ivpn/dns/api/cache"
	"github.com/ivpn/dns/api/config"
	dbErrors "github.com/ivpn/dns/api/db/errors"
	"github.com/ivpn/dns/api/db/repository"
	"github.com/ivpn/dns/api/model"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

type SubscriptionService struct {
	ServiceCfg             config.ServiceConfig
	SubscriptionRepository repository.SubscriptionRepository
	Cache                  cache.Cache
}

// NewSubscriptionService creates a new blocklist service
func NewSubscriptionService(db repository.SubscriptionRepository, cache cache.Cache, cfg config.ServiceConfig) *SubscriptionService {
	return &SubscriptionService{
		SubscriptionRepository: db,
		Cache:                  cache,
		ServiceCfg:             cfg,
	}
}

// GetSubscription returns subscription data by account ID
func (s *SubscriptionService) GetSubscription(ctx context.Context, accountId string) (*model.Subscription, error) {
	subscription, err := s.SubscriptionRepository.GetSubscriptionByAccountId(ctx, accountId)
	if err != nil {
		if errors.Is(err, dbErrors.ErrSubscriptionNotFound) {
			return nil, dbErrors.ErrSubscriptionNotFound
		}
		return nil, err
	}

	return subscription, nil
}

// UpdateSubscription updates subscription data
func (s *SubscriptionService) UpdateSubscription(ctx context.Context, accountId string, updates []model.SubscriptionUpdate) (*model.Subscription, error) {
	subscription, err := s.SubscriptionRepository.GetSubscriptionByAccountId(ctx, accountId)
	if err != nil {
		return nil, err
	}

	err = s.SubscriptionRepository.Upsert(ctx, *subscription)
	return subscription, err
}

// CreateSubscription creates a new subscription for an account if one does not already exist
func (s *SubscriptionService) CreateSubscription(ctx context.Context, accountId, subscriptionId, activeUntil string) error {
	// Parse account ObjectID
	accOID, err := primitive.ObjectIDFromHex(accountId)
	if err != nil {
		return err
	}

	// Parse activeUntil using flexible date parser (supports multiple timestamp formats)
	activeUntilTime, err := dateparse.ParseAny(activeUntil)
	if err != nil {
		return err
	}

	subUUID, err := uuid.Parse(subscriptionId)
	if err != nil {
		return err
	}
	subscription := model.Subscription{
		ID:          subUUID,
		AccountID:   accOID,
		Type:        model.Managed,
		ActiveUntil: activeUntilTime,
		Limits: model.SubscriptionLimits{
			MaxQueriesPerMonth: 0, // default
		},
	}

	return s.SubscriptionRepository.Create(ctx, subscription)
}

// AddSubscription creates a new subscription and writes a cache marker with expiration
func (s *SubscriptionService) AddSubscription(ctx context.Context, subscriptionId, activeUntil string) error {
	return s.Cache.AddSubscription(ctx, subscriptionId, activeUntil, s.ServiceCfg.SubscriptionCacheExpiration)
}

// GetSubscriptionById returns subscription by its UUID
func (s *SubscriptionService) GetSubscriptionById(ctx context.Context, subscriptionId string) (*model.Subscription, error) {
	return s.SubscriptionRepository.GetSubscriptionById(ctx, subscriptionId)
}
