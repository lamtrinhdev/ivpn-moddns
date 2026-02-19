package mailpit

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	"github.com/rs/zerolog/log"
)

const (
	WelcomeEmail  = "welcome_email"
	PasswordReset = "password_reset"
)

var (
	ErrFailedToSendEmail = "failed to send email"
)

// Mailpit is a struct that represents the Mailpit email service
type Mailpit struct {
	httpClient  *http.Client
	serverName  string
	apiEndpoint string
}

// NewMailpit creates a new Mailpit instance
func NewMailpit(serverName string) *Mailpit {
	mailpitSvc := "email"
	mailpitPort := "8025"
	apiEndpoint := fmt.Sprintf("http://%s:%s/api/v1/send", mailpitSvc, mailpitPort) // Default Mailpit API endpoint
	return &Mailpit{
		serverName:  serverName,
		httpClient:  &http.Client{},
		apiEndpoint: apiEndpoint,
	}
}

type Email struct {
	Email string `json:"Email"`
	Name  string `json:"Name"`
}

// mailpitSendRequest represents the payload for sending an email via Mailpit
type mailpitSendRequest struct {
	From    Email   `json:"From"`
	To      []Email `json:"To"`
	Subject string  `json:"Subject"`
	Text    string  `json:"Text"`
}

// SendWelcomeEmail sends a welcome email to the user using Mailpit
func (m *Mailpit) SendWelcomeEmail(ctx context.Context, sendTo, _ string) error {
	subject := "Welcome to modDNS"
	verifyURL := fmt.Sprintf("%s/account-preferences", m.serverName)
	homeURL := fmt.Sprintf("%s/home", m.serverName)
	body := fmt.Sprintf("Hello,\n\nWelcome to modDNS. Get started with using the service here: %s \n\nWarning: your email is not verified. Account recovery and critical service notification emails are disabled for unverified addresses. Follow this link to verify your email in modDNS settings: %s\n\nSent by modDNS", homeURL, verifyURL)

	reqBody := mailpitSendRequest{
		From:    Email{Email: "info@moddns.net", Name: "modDNS"},
		To:      []Email{{Email: sendTo, Name: "User"}},
		Subject: subject,
		Text:    body,
	}
	return m.sendEmail(ctx, sendTo, reqBody)
}

// SendPasswordResetEmail sends a password reset email to the user using Mailpit
func (m *Mailpit) SendPasswordResetEmail(ctx context.Context, sendTo, passwordResetToken string) error {
	passResetLink := fmt.Sprintf("%s/reset-password/%s", m.serverName, passwordResetToken)
	subject := "modDNS Password Reset"
	body := fmt.Sprintf("You requested a password reset.\n\nReset your password using the following link:\n%s", passResetLink)

	reqBody := mailpitSendRequest{
		From: Email{
			Email: "info@moddns.net",
			Name:  "modDNS",
		},
		To: []Email{
			{
				Email: sendTo,
				Name:  "User",
			},
		},
		Subject: subject,
		Text:    body,
	}

	return m.sendEmail(ctx, sendTo, reqBody)
}

// SendEmailVerificationOTP sends the OTP code to the user.
func (m *Mailpit) SendEmailVerificationOTP(ctx context.Context, sendTo, otp string) error {
	subject := "modDNS Email address verification"
	body := fmt.Sprintf("Hello,\n\nHere is a one-time code to verify your modDNS registered email address: %s  \n\nIt expires in 15 minutes.\n\nNote: Unverified recipients will not receive account recovery emails.\n\nSent by modDNS", otp)
	reqBody := mailpitSendRequest{
		From:    Email{Email: "info@moddns.net", Name: "modDNS"},
		To:      []Email{{Email: sendTo, Name: "User"}},
		Subject: subject,
		Text:    body,
	}
	return m.sendEmail(ctx, sendTo, reqBody)
}

// sendEmail sends an email using the Mailpit API
func (m *Mailpit) sendEmail(ctx context.Context, email string, reqBody mailpitSendRequest) error {
	payload, err := json.Marshal(reqBody)
	if err != nil {
		log.Err(err).Str("email", email).Msg("Mailpit: Failed to marshal email payload")
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, m.apiEndpoint, bytes.NewReader(payload))
	if err != nil {
		log.Err(err).Str("email", email).Msg("Mailpit: Failed to create request")
		return err
	}
	req.Header.Add("Content-Type", "application/json")
	// Mailpit does not require authentication by default, but if needed:
	// req.Header.Add("Authorization", fmt.Sprintf("Bearer %s", m.authToken))

	res, err := m.httpClient.Do(req) //nolint:gosec // G704 - request to configured internal mail endpoint
	if err != nil {
		log.Err(err).Str("email", email).Msg("Mailpit: Failed to send HTTP request")
		return err
	}
	defer res.Body.Close()

	responseBody, err := io.ReadAll(res.Body)
	if err != nil {
		log.Err(err).Str("email", email).Msg("Mailpit: Failed to read response body")
		return err
	}

	if res.StatusCode != http.StatusOK {
		log.Error().Str("email", email).Int("status", res.StatusCode).Str("body", string(responseBody)).Msg(ErrFailedToSendEmail)
		return errors.New(ErrFailedToSendEmail)
	}

	log.Info().Str("email", email).Msg("Mailpit: Email sent successfully")
	return nil
}

// Verify checks if the provided email is valid (basic syntax check)
func (m *Mailpit) Verify(email string) error {
	// For demonstration, only check for empty string. Extend as needed.
	if email == "" {
		return errors.New("email is empty")
	}
	// Optionally, add regex or use a library for more robust validation.
	return nil
}
