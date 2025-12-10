package requests

type WebAuthnReauthBeginRequest struct {
	Purpose string `json:"purpose" validate:"required,oneof=email_change account_deletion"`
}
