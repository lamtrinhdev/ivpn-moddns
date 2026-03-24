package sendgrid

import (
	"context"
	"errors"
	"fmt"
	"regexp"

	"github.com/rs/zerolog/log"
	"github.com/sendgrid/rest"
	sg "github.com/sendgrid/sendgrid-go"
	"github.com/sendgrid/sendgrid-go/helpers/mail"
)

// Template IDs removed – implementation now always sends plain/HTML emails without dynamic templates.

var (
	ErrFailedToSendEmail = errors.New("failed to send email")
)

// Option pattern for easier testing/injection
type Option func(*Mailer)

// WithClient allows providing custom sendgrid client (e.g., mock)
func WithClient(client interface {
	Send(*mail.SGMailV3) (*rest.Response, error)
}) Option {
	return func(m *Mailer) { m.client = client }
}

// Mailer implements email.Mailer for SendGrid
type Mailer struct {
	serverName string
	apiKey     string
	client     interface {
		Send(*mail.SGMailV3) (*rest.Response, error)
	}
	// simple email regex for Verify fallback (not production-grade)
	emailRegex *regexp.Regexp
}

// New creates new SendGrid mailer
// New creates a new SendGrid Mailer without template usage.
// Backwards compatibility: signature changed (removed template IDs); callers should pass only serverName, apiKey, fromEmail, fromName.
func New(serverName, apiKey string, opts ...Option) *Mailer {
	m := &Mailer{
		serverName: serverName,
		apiKey:     apiKey,
		client:     sg.NewSendClient(apiKey),
		emailRegex: regexp.MustCompile(`^[^@\s]+@[^@\s]+\.[^@\s]+$`),
	}
	for _, o := range opts {
		o(m)
	}
	return m
}

// SendWelcomeEmail sends welcome email with template dynamic data
func (m *Mailer) SendWelcomeEmail(ctx context.Context, sendTo, _ string) error {
	subject := "Welcome to modDNS"
	verifyURL := fmt.Sprintf("%s/account-preferences", m.serverName)
	homeURL := fmt.Sprintf("%s/home", m.serverName)
	plain := fmt.Sprintf("Hello,\n\nWelcome to modDNS. Get started with using the service here: %s \n\nWarning: your email is not verified. Account recovery and critical service notification emails are disabled of unverified addresses. Follow this link to verify your email in modDNS settings: %s\n\nSent by modDNS", homeURL, verifyURL)
	html := fmt.Sprintf("<p>Hello,</p><p>Welcome to modDNS. Get started with using the service here: <a href=\"%s\">%s</a></p><p><strong>Warning:</strong> your email is not verified. Account recovery and critical service notification emails are disabled for unverified addresses. Follow this link to verify your email in modDNS settings: <a href=\"%s\">%s</a></p><p>Sent by modDNS</p>", homeURL, homeURL, verifyURL, verifyURL)
	return m.sendBasic(ctx, sendTo, subject, plain, html)
}

// SendEmailVerificationOTP sends a 6-digit OTP code for email verification.
func (m *Mailer) SendEmailVerificationOTP(ctx context.Context, sendTo, otp string) error {
	subject := "modDNS Email address verification"
	plain := fmt.Sprintf("Hello,\n\nHere is a one-time code to verify your modDNS registered email address: %s  \n\nIt expires in 15 minutes.\n\nNote: Unverified recipients will not receive account recovery emails.\n\nSent by modDNS", otp)
	html := fmt.Sprintf("<p>Hello,</p><p>Here is a one-time code to verify your modDNS registered email address: <strong>%s</strong></p><p>It expires in 15 minutes.</p><p><em>Note: Unverified recipients will not receive account recovery emails.</em></p><p>Sent by modDNS</p>", otp)
	return m.sendBasic(ctx, sendTo, subject, plain, html)
}

// SendPasswordResetEmail sends password reset email with template dynamic data
func (m *Mailer) SendPasswordResetEmail(ctx context.Context, sendTo, passwordResetToken string) error {
	resetLink := fmt.Sprintf("%s/reset-password/%s", m.serverName, passwordResetToken)
	subject := "Reset your modDNS password"
	plain := fmt.Sprintf("Hello,\n\nYou have requested a password reset for your modDNS account.\n\nFollow this link to reset your password: %s\n\nThe URL is live for 60 minutes after generation.\n\nIf you did not request the password reset, please ignore this message or contact support at moddns@ivpn.net.\n\nRegards,\nmodDNS team", resetLink)
	html := fmt.Sprintf("<p>Hello,</p><p>You have requested a password reset for your modDNS account.</p><p>Follow this link to reset your password: <a href=\"%s\">%s</a></p><p>The URL is live for 60 minutes after generation.</p><p>If you did not request the password reset, please ignore this message or contact support at <a href=\"mailto:moddns@ivpn.net\">moddns@ivpn.net</a>.</p><p>Regards,<br>modDNS team</p>", resetLink, resetLink)
	return m.sendBasic(ctx, sendTo, subject, plain, html)
}

// Verify performs basic syntax validation. Extend with more advanced service if needed.
func (m *Mailer) Verify(email string) error {
	if email == "" {
		return errors.New("email is empty")
	}
	if !m.emailRegex.MatchString(email) {
		return errors.New("invalid email format")
	}
	return nil
}

// sendBasic sends a plain/html email (subject, plain and html parts)
func (m *Mailer) sendBasic(ctx context.Context, toEmail, subject, plainContent, htmlContent string) error {
	from := mail.NewEmail("modDNS", "info@moddns.net")
	to := mail.NewEmail("User", toEmail)
	message := mail.NewSingleEmail(from, subject, to, plainContent, htmlContent)
	res, err := m.client.Send(message)
	log.Debug().Str("email", toEmail).Str("sendgrid_response", res.Body).Msg("SendGrid: request sent")
	if err != nil {
		return err
	}
	if res.StatusCode >= 400 {
		log.Error().Str("email", toEmail).Int("status", res.StatusCode).Msg("SendGrid: failed to send basic email")
		return ErrFailedToSendEmail
	}
	log.Info().Str("email", toEmail).Str("subject", subject).Msg("SendGrid: basic email sent")
	return nil
}
