package mailtrap

type From struct {
	Email string `json:"email"`
	Name  string `json:"name"`
}

type To struct {
	Email string `json:"email"`
}

// SendEmailRequest represents the payload necessary to send an email in Mailtrap service
type SendEmailRequest struct {
	From              From
	To                []To              `json:"to"`
	Subject           string            `json:"subject"`
	Text              string            `json:"text"`
	Category          string            `json:"category"`
	TemplateUUID      string            `json:"template_uuid"`
	TemplateVariables map[string]string `json:"template_variables"`
}

// SendEmailResponse represents the response from the Mailtrap email service
type SendEmailResponse struct {
	Success    bool     `json:"success"`
	MessageIds []string `json:"message_ids"`
}

type SendEmailErrors struct {
	Errors []string `json:"errors"`
}
