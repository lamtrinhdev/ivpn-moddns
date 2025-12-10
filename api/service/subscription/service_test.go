package subscription

import (
	"context"
	"testing"
	"time"

	"github.com/ivpn/dns/api/config"
	dbErrors "github.com/ivpn/dns/api/db/errors"
	"github.com/ivpn/dns/api/mocks"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"go.mongodb.org/mongo-driver/bson/primitive"
)

func TestCreateSubscription(t *testing.T) {
	mockRepo := mocks.NewSubscriptionRepository(t)
	mockCache := mocks.NewCachecache(t)
	serv := NewSubscriptionService(mockRepo, mockCache, config.ServiceConfig{SubscriptionCacheExpiration: 0})

	accID := "507f1f77bcf86cd799439011"
	subID := "550e8400-e29b-41d4-a716-446655440000" // valid UUIDv4
	activeUntilStr := time.Now().Add(time.Hour).UTC().Format(time.RFC3339)

	tests := []struct {
		name           string
		setup          func()
		accountID      string
		subscriptionID string
		activeUntil    string
		wantErr        error
	}{
		{
			name: "success",
			setup: func() {
				mockRepo.On("Create", context.Background(), mock.AnythingOfType("model.Subscription")).Return(nil).Once()
			},
			accountID:      accID,
			subscriptionID: subID,
			activeUntil:    activeUntilStr,
			wantErr:        nil,
		},
		{
			name:           "invalid account id",
			setup:          func() {},
			accountID:      "not-a-hex-objectid",
			subscriptionID: subID,
			activeUntil:    activeUntilStr,
			wantErr:        primitive.ErrInvalidHex,
		},
		{
			name:           "invalid subscription id",
			setup:          func() {},
			accountID:      accID,
			subscriptionID: "not-a-uuid",
			activeUntil:    activeUntilStr,
			wantErr:        assert.AnError, // placeholder for assertion branch
		},
		{
			name: "duplicate subscription UUID",
			setup: func() {
				mockRepo.On("Create", context.Background(), mock.AnythingOfType("model.Subscription")).Return(dbErrors.ErrSubscriptionAlreadyExists).Once()
			},
			accountID:      accID,
			subscriptionID: subID,
			activeUntil:    activeUntilStr,
			wantErr:        dbErrors.ErrSubscriptionAlreadyExists,
		},
		{
			name: "repository error",
			setup: func() {
				mockRepo.On("Create", context.Background(), mock.AnythingOfType("model.Subscription")).Return(assert.AnError).Once()
			},
			accountID:      accID,
			subscriptionID: subID,
			activeUntil:    activeUntilStr,
			wantErr:        assert.AnError,
		},
	}

	for _, tc := range tests {
		mockRepo.ExpectedCalls = nil
		mockRepo.Calls = nil
		mockCache.ExpectedCalls = nil
		mockCache.Calls = nil
		if tc.setup != nil {
			tc.setup()
		}
		err := serv.CreateSubscription(context.Background(), tc.accountID, tc.subscriptionID, tc.activeUntil)
		if tc.wantErr == nil {
			assert.NoError(t, err, tc.name)
		} else {
			assert.Error(t, err, tc.name)
			if tc.name == "invalid subscription id" {
				assert.Contains(t, err.Error(), "invalid", tc.name)
			} else if tc.wantErr == primitive.ErrInvalidHex {
				assert.Equal(t, tc.wantErr.Error(), err.Error(), tc.name)
			} else if tc.wantErr == dbErrors.ErrSubscriptionAlreadyExists || tc.wantErr == assert.AnError {
				assert.Equal(t, tc.wantErr.Error(), err.Error(), tc.name)
			}
		}
		mockRepo.AssertExpectations(t)
	}
}

func TestAddSubscription(t *testing.T) {
	mockRepo := mocks.NewSubscriptionRepository(t)
	mockCache := mocks.NewCachecache(t)
	cfg := config.ServiceConfig{SubscriptionCacheExpiration: time.Minute}
	serv := NewSubscriptionService(mockRepo, mockCache, cfg)

	accID := "507f1f77bcf86cd799439011"
	activeUntil := time.Now().Add(time.Hour).UTC().Format(time.RFC3339)

	tests := []struct {
		name    string
		setup   func()
		id      string
		ts      string
		wantErr error
	}{
		{
			name: "success",
			setup: func() {
				mockCache.On("AddSubscription", mock.Anything, accID, activeUntil, cfg.SubscriptionCacheExpiration).Return(nil).Once()
			},
			id:      accID,
			ts:      activeUntil,
			wantErr: nil,
		},
		{
			name: "cache error",
			setup: func() {
				mockCache.On("AddSubscription", mock.Anything, accID, activeUntil, cfg.SubscriptionCacheExpiration).Return(assert.AnError).Once()
			},
			id:      accID,
			ts:      activeUntil,
			wantErr: assert.AnError,
		},
	}

	for _, tc := range tests {
		mockCache.ExpectedCalls = nil
		mockCache.Calls = nil
		if tc.setup != nil {
			tc.setup()
		}
		err := serv.AddSubscription(context.Background(), tc.id, tc.ts)
		if tc.wantErr == nil {
			assert.NoError(t, err, tc.name)
		} else {
			assert.Error(t, err, tc.name)
			assert.Equal(t, tc.wantErr.Error(), err.Error(), tc.name)
		}
		mockCache.AssertExpectations(t)
	}
}
