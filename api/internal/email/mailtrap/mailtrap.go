package mailtrap

import (
	"bytes"
	"context"
	"encoding/json"
	"errors"
	"fmt"
	"io"
	"net/http"

	emailverifier "github.com/AfterShip/email-verifier"
	"github.com/rs/zerolog/log"
)

const (
	WelcomeEmail      = "welcome_email"
	WelcomeEmailUUID  = "3a3f383b-e72c-4e79-8aaa-12469dd9d34f"
	PasswordReset     = "password_reset"
	PasswordResetUUID = "1541b133-9896-4ada-b857-d8fe5962ae09"
)

var (
	ErrEmailIsDisposable = "email address is disposable"
	ErrFailedToSendEmail = "failed to send email"
)

// Mailtrap is a struct that represents Mailtrap email service
type Mailtrap struct {
	httpClient   *http.Client
	serverName   string
	inboxId      string
	templates    map[string]string
	authToken    string
	verifier     *emailverifier.Verifier
	sendEndpoint string
}

// NewMailtrap creates a new Mailtrap instance
func NewMailtrap(serverName, inboxId, authToken string) *Mailtrap {
	emailTemplates := map[string]string{
		WelcomeEmail:  WelcomeEmailUUID,
		PasswordReset: PasswordResetUUID,
	}
	verifier := emailverifier.NewVerifier().EnableDomainSuggest()
	sendEndpoint := fmt.Sprintf("https://sandbox.api.mailtrap.io/api/send/%s", inboxId)
	return &Mailtrap{
		templates:    emailTemplates,
		serverName:   serverName,
		inboxId:      inboxId,
		authToken:    authToken,
		httpClient:   &http.Client{},
		verifier:     verifier,
		sendEndpoint: sendEndpoint,
	}
}

// SendWelcomeEmail sends a welcome email to the user
// confirmation link removed; instruct in-app verification
func (m *Mailtrap) SendWelcomeEmail(ctx context.Context, sendTo, _ string) error {
	homeURL := fmt.Sprintf("%s/home", m.serverName)
	verifyURL := fmt.Sprintf("%s/account-preferences", m.serverName)
	subject := "Welcome to modDNS"
	text := fmt.Sprintf("Hello,\n\nWelcome to modDNS. Get started with using the service here: %s \n\nWarning: your email is not verified. Account recovery and critical service notification emails are disabled for unverified addresses. Follow this link to verify your email in modDNS settings: %s\n\nSent by modDNS", homeURL, verifyURL)
	req := SendEmailRequest{
		From:              From{Email: "moddns@demomailtrap.com", Name: "modDNS"},
		To:                []To{{Email: sendTo}},
		Subject:           subject,
		Text:              text,
		Category:          WelcomeEmail,
		TemplateUUID:      "", // send raw text instead of template
		TemplateVariables: map[string]string{},
	}
	if err := m.sendEmail(ctx, sendTo, req); err != nil {
		return err
	}
	log.Info().Str("email", sendTo).Msg("Welcome email sent successfully")
	return nil
}

// SendPasswordResetEmail sends a password reset email to the user
func (m *Mailtrap) SendPasswordResetEmail(ctx context.Context, sendTo, passwordResetToken string) error {
	passResetLink := fmt.Sprintf("%s/reset-password/%s", m.serverName, passwordResetToken)
	req := SendEmailRequest{
		From: From{
			Email: "moddns@demomailtrap.com",
			Name:  "modDNS Team",
		},
		To: []To{
			{
				Email: sendTo,
			},
		},
		TemplateUUID: m.templates[PasswordReset],
		TemplateVariables: map[string]string{
			"pass_reset_link": passResetLink,
		},
	}

	if err := m.sendEmail(ctx, sendTo, req); err != nil {
		return err
	}

	log.Info().Str("email", sendTo).Msg("Password reset email sent successfully")
	return nil
}

// SendEmailVerificationOTP sends the verification code email using a basic template (reuse password reset template or create new if needed)
func (m *Mailtrap) SendEmailVerificationOTP(ctx context.Context, sendTo, otp string) error {
	subject := "modDNS Email address verification"
	body := fmt.Sprintf("Hello,\n\nHere is a one-time code to verify your modDNS registered email address: %s  \n\nIt expires in 15 minutes.\n\nNote: Unverified recipients will not receive account recovery emails.\n\nSent by modDNS", otp)
	req := SendEmailRequest{
		From:    From{Email: "moddns@demomailtrap.com", Name: "modDNS Team"},
		To:      []To{{Email: sendTo}},
		Subject: subject,
		Text:    body,
	}
	if err := m.sendEmail(ctx, sendTo, req); err != nil {
		return err
	}
	log.Info().Str("email", sendTo).Msg("Email verification OTP sent successfully")
	return nil
}

// Verify checks if email provided is valid
func (m *Mailtrap) Verify(email string) error {
	initVerRes, err := m.verifier.Verify(email)
	if err != nil {
		fmt.Println("verify email address failed, error is: ", err)
		return err
	}
	if !initVerRes.Syntax.Valid {
		log.Debug().Str("email", email).Msg("email address syntax is invalid")
		if initVerRes.Suggestion != "" {
			log.Debug().Str("email", email).Str("suggested_domain", initVerRes.Suggestion).Msg("suggested domain")
		}
		return err
	}

	if initVerRes.Disposable {
		// TODO: decide whether disposable emails should be allowed
		log.Debug().Str("email", email).Msg(ErrEmailIsDisposable)
		return err
	}

	// TODO: decide wheter smtp verification is needed

	return nil
}

func (m *Mailtrap) sendEmail(ctx context.Context, email string, sendEmailReq SendEmailRequest) error {
	payload, err := json.Marshal(sendEmailReq)
	if err != nil {
		log.Err(err).Str("email", email).Msg("Failed to marshal email")
		return err
	}

	req, err := http.NewRequestWithContext(ctx, http.MethodPost, m.sendEndpoint, bytes.NewReader(payload))
	if err != nil {
		log.Err(err).Str("email", email).Msg("Failed to create request")
		return err
	}
	req.Header.Add("Authorization", fmt.Sprintf("Bearer %s", m.authToken))
	req.Header.Add("Content-Type", "application/json")

	res, err := m.httpClient.Do(req) //nolint:gosec // G704 - request to configured internal mail endpoint
	if err != nil {
		log.Err(err).Str("email", email).Msg("Failed to send http request")
		return err
	}
	defer res.Body.Close()

	responseBody, err := io.ReadAll(res.Body)
	if err != nil {
		log.Err(err).Str("email", email).Msg("Failed to read response body")
		return err
	}

	switch res.StatusCode {
	case http.StatusOK:
		break
	case http.StatusBadRequest:
		var errRes SendEmailErrors
		if err = json.Unmarshal(responseBody, &errRes); err != nil {
			log.Err(err).Str("email", email).Msg("Failed to unmarshal error response body")
			return err
		}
		log.Error().Err(err).Str("email", email).Strs("errors", errRes.Errors).Msg(ErrFailedToSendEmail)
		return errors.New(ErrFailedToSendEmail)
	default:
		err = errors.New(string(responseBody))
		log.Err(err).Str("email", email).Msg("Unknown send email error")
		return err
	}

	var response SendEmailResponse
	if err = json.Unmarshal(responseBody, &response); err != nil {
		log.Err(err).Str("email", email).Msg("Failed to unmarshal response body")
		return err
	}
	log.Debug().Str("response body", string(responseBody))
	return nil
}
