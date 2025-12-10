package api

import (
	"strings"

	"github.com/gofiber/fiber/v2"
	"github.com/ivpn/dns/api/api/requests"
	"github.com/ivpn/dns/api/api/responses"
	"github.com/ivpn/dns/api/internal/auth"
	"github.com/rs/zerolog/log"
)

// @Summary Create profile custom rule
// @Description Create profile custom rule
// @Tags Profile
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path string true "Profile ID"
// @Param body body requests.CreateProfileCustomRuleBody true "Create custom rule request"
// @Success 201
// @Failure 400 {object} ErrResponse
// @Failure 500 {object} ErrResponse
// @Router /api/v1/profiles/{id}/custom_rules [post]
func (s *APIServer) createProfileCustomRule() fiber.Handler {
	handler := func(c *fiber.Ctx) error {
		profileId := c.Params("id")

		p := new(requests.CreateProfileCustomRuleBody)
		if err := c.BodyParser(p); err != nil {
			return HandleError(c, err, ErrInvalidRequestBody.Error())
		}

		errMsgs := s.Validator.ValidateRequest(c, p, ErrFailedToCreateCustomRule.Error())
		if len(errMsgs) > 0 {
			return HandleError(c, ErrInvalidCustomRuleSyntax, strings.Join(errMsgs, " and "))
		}

		accountId := auth.GetAccountID(c)
		if err := s.Service.CreateCustomRule(c.Context(), accountId, profileId, p.Action, p.Value); err != nil {
			return HandleError(c, err, ErrFailedToCreateCustomRule.Error())
		}

		return c.SendStatus(201)
	}
	return handler
}

// @Summary Create profile custom rules (batch)
// @Description Create up to 20 custom rules for a profile in a single request
// @Tags Profile
// @Accept json
// @Produce json
// @Security ApiKeyAuth
// @Param id path string true "Profile ID"
// @Param body body requests.CreateProfileCustomRulesBatchBody true "Create custom rules batch request"
// @Success 200 {object} responses.CreateProfileCustomRulesBatchResponse
// @Failure 400 {object} ErrResponse
// @Failure 500 {object} ErrResponse
// @Router /api/v1/profiles/{id}/custom_rules/batch [post]
func (s *APIServer) createProfileCustomRulesBatch() fiber.Handler {
	handler := func(c *fiber.Ctx) error {
		profileId := c.Params("id")

		p := new(requests.CreateProfileCustomRulesBatchBody)
		if err := c.BodyParser(p); err != nil {
			return HandleError(c, err, ErrInvalidRequestBody.Error())
		}

		errMsgs := s.Validator.ValidateRequest(c, p, ErrFailedToCreateCustomRule.Error())
		if len(errMsgs) > 0 {
			return HandleError(c, ErrInvalidCustomRuleSyntax, strings.Join(errMsgs, " and "))
		}

		accountId := auth.GetAccountID(c)
		result, err := s.Service.CreateCustomRulesBulk(c.Context(), accountId, profileId, p.Action, p.Values)
		if err != nil {
			return HandleError(c, err, ErrFailedToCreateCustomRule.Error())
		}

		response := responses.CreateProfileCustomRulesBatchResponse{
			Action:         string(result.Action),
			TotalRequested: result.TotalRequested,
			Created:        make([]responses.CustomRuleBatchCreated, len(result.Created)),
			Skipped:        make([]responses.CustomRuleBatchSkipped, len(result.Skipped)),
		}

		for i, rule := range result.Created {
			response.Created[i] = responses.CustomRuleBatchCreated{
				ID:    rule.ID.Hex(),
				Value: rule.Value,
			}
		}

		for i, skipped := range result.Skipped {
			response.Skipped[i] = responses.CustomRuleBatchSkipped{
				Value:   skipped.Value,
				Reason:  string(skipped.Reason),
				Message: skipped.Message,
			}
		}

		return c.Status(fiber.StatusOK).JSON(response)
	}
	return handler
}

// @Summary Delete profile custom rule
// @Description Delete profile custom rule
// @Tags Profile
// @Param id path string true "Profile ID"
// @Param custom_rule_id path string true "Custom rule ID"
// @Produce json
// @Security ApiKeyAuth
// @Success 200
// @Failure 400 {object} ErrResponse
// @Failure 404 {object} ErrResponse
// @Failure 500 {object} ErrResponse
// @Router /api/v1/profiles/{id}/custom_rules/{custom_rule_id} [delete]
func (s *APIServer) deleteProfileCustomRule() fiber.Handler {
	handler := func(c *fiber.Ctx) error {
		profileId := c.Params("profile_id")
		customRuleId := c.Params("custom_rule_id")
		accountId := auth.GetAccountID(c)

		if err := s.Service.DeleteCustomRule(c.Context(), accountId, profileId, customRuleId); err != nil {
			log.Error().Err(err).Msg(ErrFailedToDeleteCustomRule.Error())
			return HandleError(c, err, ErrFailedToDeleteCustomRule.Error())
		}

		return c.SendStatus(200)
	}
	return handler
}
