package middleware

import (
	"testing"

	"github.com/gofiber/fiber/v2"
	"github.com/ivpn/dns/api/internal/auth"
	"github.com/valyala/fasthttp"
)

func TestGetToken(t *testing.T) {
	tests := []struct {
		name           string
		authorization  string
		cookie         string
		expectedResult string
	}{
		{
			name:           "Valid Bearer token in Authorization header",
			authorization:  "Bearer validtoken",
			cookie:         "",
			expectedResult: "validtoken",
		},
		{
			name:           "Valid token in cookie",
			authorization:  "",
			cookie:         "validtoken",
			expectedResult: "validtoken",
		},
		{
			name:           "No token in Authorization header or cookie",
			authorization:  "",
			cookie:         "",
			expectedResult: "",
		},
		{
			name:           "Invalid Authorization header format",
			authorization:  "Invalid validtoken",
			cookie:         "",
			expectedResult: "",
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			app := fiber.New()
			req := &fasthttp.RequestCtx{}
			c := app.AcquireCtx(req)
			c.Request().Header.Set("Authorization", tt.authorization)
			c.Request().Header.SetCookie(auth.AUTH_COOKIE, tt.cookie)

			result := GetToken(c)
			if result != tt.expectedResult {
				t.Errorf("expected %s, got %s", tt.expectedResult, result)
			}
		})
	}
}
