package api

import (
	"strings"

	"github.com/araddon/dateparse"
	"github.com/gofiber/fiber/v2"
	"github.com/ivpn/dns/api/api/requests"
	"github.com/ivpn/dns/api/internal/auth"
	"github.com/ivpn/dns/api/model"
	"github.com/rs/zerolog/log"
)

// @Summary Add subscription
// @Description Add subscription and cache its presence
// @Tags Subscription
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param body body requests.SubscriptionReq true "Subscription request"
// @Success 200 {object} fiber.Map
// @Failure 400 {object} ErrResponse
// @Failure 500 {object} ErrResponse
// @Router /api/v1/subscription/add [post]
func (s *APIServer) addSubscription() fiber.Handler {
	handler := func(c *fiber.Ctx) error {
		req := new(requests.SubscriptionReq)
		if err := c.BodyParser(req); err != nil {
			return HandleError(c, err, ErrInvalidRequestBody.Error())
		}

		// Validate request body
		errMsgs := s.Validator.ValidateRequest(c, req, ErrInvalidRequestBody.Error())
		if len(errMsgs) > 0 {
			return HandleError(c, ErrInvalidRequestBody, strings.Join(errMsgs, " and "))
		}

		// Attempt flexible timestamp parse; on failure treat as invalid request body
		if _, err := dateparse.ParseAny(req.ActiveUntil); err != nil {
			log.Error().Err(err).Msg("invalid active_until timestamp")
			return HandleError(c, ErrInvalidRequestBody, "invalid active_until timestamp")
		}

		// Add subscription info in cache via service
		if err := s.Service.AddSubscription(c.Context(), req.ID, req.ActiveUntil); err != nil {
			return HandleError(c, err, "failed to add subscription")
		}

		return c.Status(200).JSON(fiber.Map{"message": "subscription added"})
	}
	return handler
}

// reference model.Subscription to satisfy import for swagger annotations
var _ model.Subscription

// @Summary Get subscription data
// @Description Get subscription data for the authenticated account
// @Tags Subscription
// @Produce json
// @Security ApiKeyAuth
// @Success 200 {object} model.Subscription
// @Failure 401 {object} ErrResponse
// @Failure 404 {object} ErrResponse
// @Failure 500 {object} ErrResponse
// @Router /api/v1/sub [get]
func (s *APIServer) getSubscription() fiber.Handler {
	return func(c *fiber.Ctx) error {
		accountId := auth.GetAccountID(c)

		subscription, err := s.Service.GetSubscription(c.Context(), accountId)
		if err != nil {
			return HandleError(c, err, ErrFailedToGetSubscription.Error())
		}
		return c.Status(200).JSON(subscription)
	}
}
