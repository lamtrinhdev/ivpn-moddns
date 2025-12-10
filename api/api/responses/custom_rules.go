package responses

// CreateProfileCustomRulesBatchResponse represents the payload returned after attempting to create
// a batch of custom rules for a profile.
type CreateProfileCustomRulesBatchResponse struct {
	Action         string                   `json:"action"`
	TotalRequested int                      `json:"total_requested"`
	Created        []CustomRuleBatchCreated `json:"created"`
	Skipped        []CustomRuleBatchSkipped `json:"skipped"`
}

// CustomRuleBatchCreated holds information about a successfully created rule within a batch request.
type CustomRuleBatchCreated struct {
	ID    string `json:"id"`
	Value string `json:"value"`
}

// CustomRuleBatchSkipped contains metadata about a rule that was not created within a batch request.
type CustomRuleBatchSkipped struct {
	Value   string `json:"value"`
	Reason  string `json:"reason"`
	Message string `json:"message"`
}
