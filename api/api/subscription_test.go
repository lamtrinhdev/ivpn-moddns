package api

import (
	"bytes"
	"encoding/json"
	"net/http"
	"net/http/httptest"
	"testing"
	"time"

	"github.com/gofiber/fiber/v2"
	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/mock"
	"github.com/stretchr/testify/suite"

	"github.com/ivpn/dns/api/api/requests"
	"github.com/ivpn/dns/api/config"
	dbErrors "github.com/ivpn/dns/api/db/errors"
	"github.com/ivpn/dns/api/internal/auth"
	"github.com/ivpn/dns/api/internal/validator"
	"github.com/ivpn/dns/api/mocks"
	"github.com/ivpn/dns/api/model"
	"github.com/ivpn/dns/api/service"
	"github.com/ivpn/dns/libs/urlshort"
)

type SubscriptionAPITestSuite struct {
	suite.Suite
	mockService *mocks.Servicer
	mockDB      *mocks.Db
	validator   *validator.APIValidator
	config      *config.Config
}

func (suite *SubscriptionAPITestSuite) SetupSuite() {
	var err error
	suite.validator, err = validator.NewAPIValidator()
	suite.Require().NoError(err)
	suite.config = &config.Config{
		API: &config.APIConfig{
			ApiAllowOrigin: "http://localhost:3000",
			ApiAllowIP:     "*",
			PSK:            "test-psk-token",
		},
		Server:  &config.ServerConfig{Name: "modDNS Test", FQDN: "test.local"},
		Service: &config.ServiceConfig{SubscriptionCacheExpiration: 15 * time.Minute},
	}
}

func (suite *SubscriptionAPITestSuite) SetupTest() {
	suite.mockService = mocks.NewServicer(suite.T())
	suite.mockDB = mocks.NewDb(suite.T())
}

func (suite *SubscriptionAPITestSuite) createTestServer() *APIServer {
	// Create a service.Service struct with Store and SubscriptionServicer
	testService := service.Service{
		Store:                suite.mockDB,
		SubscriptionServicer: suite.mockService,
	}
	// Other dependencies required by NewServer
	mockCache := mocks.NewCachecache(suite.T())
	mockIDGen := mocks.NewGeneratoridgen(suite.T())
	mockMailer := mocks.NewMaileremail(suite.T())
	mockShortener := urlshort.NewURLShortener()

	server, err := NewServer(
		suite.config,
		testService,
		suite.mockDB,
		mockCache,
		mockIDGen,
		suite.validator,
		mockMailer,
		mockShortener,
		nil,
	)
	suite.Require().NoError(err, "Failed to create test server")
	server.RegisterRoutes()
	return server
}

func (suite *SubscriptionAPITestSuite) TestAddSubscription_Success() {
	subscriptionID := "550e8400-e29b-41d4-a716-446655440000" // valid UUIDv4
	activeUntil := time.Now().Add(24 * time.Hour).UTC().Format(time.RFC3339)
	suite.mockService.On("AddSubscription", mock.Anything, subscriptionID, activeUntil).Return(nil)
	payload := requests.SubscriptionReq{ID: subscriptionID, ActiveUntil: activeUntil}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/subscription/add", bytes.NewReader(body))
	req.Header.Set("Content-Type", fiber.MIMEApplicationJSON)
	req.Header.Set("Authorization", "Bearer "+suite.config.API.PSK)
	// Also set auth cookie as fallback for PSK middleware token extraction
	req.AddCookie(&http.Cookie{Name: auth.AUTH_COOKIE, Value: suite.config.API.PSK})
	server := suite.createTestServer()
	resp, err := server.App.Test(req, -1)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusOK, resp.StatusCode)
}

func (suite *SubscriptionAPITestSuite) TestAddSubscription_InvalidID() {
	payload := requests.SubscriptionReq{ID: "not-a-uuid", ActiveUntil: time.Now().UTC().Format(time.RFC3339)}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/subscription/add", bytes.NewReader(body))
	req.Header.Set("Content-Type", fiber.MIMEApplicationJSON)
	req.Header.Set("Authorization", "Bearer "+suite.config.API.PSK)
	req.AddCookie(&http.Cookie{Name: auth.AUTH_COOKIE, Value: suite.config.API.PSK})
	server := suite.createTestServer()
	resp, err := server.App.Test(req, -1)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusBadRequest, resp.StatusCode)
}

func (suite *SubscriptionAPITestSuite) TestAddSubscription_InvalidTimestamp() {
	// Provide an obviously invalid timestamp; handler should return 400 without calling service
	subscriptionID := "550e8400-e29b-41d4-a716-446655440000"
	payload := requests.SubscriptionReq{ID: subscriptionID, ActiveUntil: "not-a-date"}
	body, _ := json.Marshal(payload)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/subscription/add", bytes.NewReader(body))
	req.Header.Set("Content-Type", fiber.MIMEApplicationJSON)
	req.Header.Set("Authorization", "Bearer "+suite.config.API.PSK)
	req.AddCookie(&http.Cookie{Name: auth.AUTH_COOKIE, Value: suite.config.API.PSK})
	server := suite.createTestServer()
	resp, err := server.App.Test(req, -1)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusBadRequest, resp.StatusCode)
}

func (suite *SubscriptionAPITestSuite) TestAddSubscription_InvalidBody() {
	// malformed JSON: active_until should be string, we pass number
	body := []byte(`{"id": 123, "active_until": 456}`)
	req := httptest.NewRequest(http.MethodPost, "/api/v1/subscription/add", bytes.NewReader(body))
	req.Header.Set("Content-Type", fiber.MIMEApplicationJSON)
	req.Header.Set("Authorization", "Bearer "+suite.config.API.PSK)
	req.AddCookie(&http.Cookie{Name: auth.AUTH_COOKIE, Value: suite.config.API.PSK})
	server := suite.createTestServer()
	resp, err := server.App.Test(req, -1)
	assert.NoError(suite.T(), err)
	assert.True(suite.T(), resp.StatusCode >= 400)
}

// --- New GET /api/v1/subscription endpoint tests ---

func (suite *SubscriptionAPITestSuite) TestGetSubscription_Success() {
	accountID := "507f1f77bcf86cd799439011"
	sessionToken := "test-session-token"
	// Auth middleware requires a valid session cookie; mock session retrieval
	suite.mockDB.On("GetSession", mock.Anything, sessionToken).Return(model.Session{AccountID: accountID}, true, nil)
	sub := &model.Subscription{Type: model.Managed}
	// Mock subscription service call
	suite.mockService.On("GetSubscription", mock.Anything, accountID).Return(sub, nil)

	server := suite.createTestServer()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/sub", nil)
	req.AddCookie(&http.Cookie{Name: auth.AUTH_COOKIE, Value: sessionToken})

	resp, err := server.App.Test(req, -1)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusOK, resp.StatusCode)
}

func (suite *SubscriptionAPITestSuite) TestGetSubscription_Unauthorized() {
	server := suite.createTestServer()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/sub", nil)
	resp, err := server.App.Test(req, -1)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusUnauthorized, resp.StatusCode)
}

func (suite *SubscriptionAPITestSuite) TestGetSubscription_NotFound() {
	accountID := "507f1f77bcf86cd799439011"
	sessionToken := "test-session-token"

	// Mock auth session & service call returning not found
	suite.mockDB.On("GetSession", mock.Anything, sessionToken).Return(model.Session{AccountID: accountID}, true, nil)
	suite.mockService.On("GetSubscription", mock.Anything, accountID).Return(nil, dbErrors.ErrSubscriptionNotFound)

	server := suite.createTestServer()
	req := httptest.NewRequest(http.MethodGet, "/api/v1/sub", nil)
	req.AddCookie(&http.Cookie{Name: auth.AUTH_COOKIE, Value: sessionToken})

	resp, err := server.App.Test(req, -1)
	assert.NoError(suite.T(), err)
	assert.Equal(suite.T(), http.StatusNotFound, resp.StatusCode)
}

func TestSubscriptionAPITestSuite(t *testing.T) {
	suite.Run(t, new(SubscriptionAPITestSuite))
}
