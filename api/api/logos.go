package api

import (
	"strings"

	"github.com/gofiber/fiber/v2"
)

type LogoRequest struct {
	Domains []string `json:"domains" validate:"required,dive,fqdn,max=50"`
}

// @Summary Download brand logo(s) from Brandfetch
// @Description Download brand logo(s) from Brandfetch. Accepts a list of domains and returns a JSON object mapping each domain to its logo as a base64-encoded data URL. Errors for each domain are also included.
// @Tags Auxiliary
// @Accept json
// @Produce json
// @Param body body LogoRequest true "Domains to fetch logos for"
// @Success 200 {object} map[string]interface{} "Map of domains to base64-encoded logo data URLs and errors"
// @Failure 400 {object} ErrResponse
// @Failure 404 {object} ErrResponse
// @Failure 500 {object} ErrResponse
// @Router /api/v1/auxiliary/logos [post]
func (s *APIServer) getBrandLogos() fiber.Handler {
	return func(c *fiber.Ctx) error {
		payload := new(LogoRequest)
		if err := c.BodyParser(payload); err != nil {
			return HandleError(c, err, ErrInvalidRequestBody.Error())
		}

		errMsgs := s.Validator.ValidateRequest(c, payload, ErrFailedToGetLogos.Error())
		if len(errMsgs) > 0 {
			return HandleError(c, ErrInvalidRequestBody, strings.Join(errMsgs, " and "))
		}

		if len(payload.Domains) == 0 {
			return c.Status(fiber.StatusBadRequest).JSON(fiber.Map{
				"error": "No domains provided",
			})
		}

		result := s.Service.FetchBrandLogos(c.Context(), payload.Domains)

		if len(result.Logos) == 0 {
			return c.Status(fiber.StatusNotFound).JSON(fiber.Map{
				"error":   "Logo not found for any of the given domains",
				"details": result.Errors,
			})
		}

		return c.JSON(fiber.Map{
			"logos":  result.Logos,
			"errors": result.Errors,
		})
	}
}
