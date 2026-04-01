package model

import (
	"testing"

	intvldtr "github.com/ivpn/dns/api/internal/validator"
	"github.com/stretchr/testify/assert"
)

// Valid IPv4 address returns SYNTAX_IPV4 and nil error
func TestNewCustomRuleSyntaxValidIPv4(t *testing.T) {
	vldtr, err := intvldtr.NewAPIValidator()
	if err != nil {
		t.Fatalf("Error creating validator: %v", err)
	}

	tests := []struct {
		name        string
		input       string
		wantSyntax  CustomRuleSyntax
		expectedErr error
	}{
		{
			name:        "ValidIPv4Address",
			input:       "192.168.1.1",
			wantSyntax:  SYNTAX_IPV4,
			expectedErr: nil,
		},
		{
			name:        "InvalidIPv4Address",
			input:       "256.256.256.256",
			wantSyntax:  SYNTAX_UNKNOWN,
			expectedErr: ErrInvalidCustomRuleSyntax,
		},
		{
			name:        "ValidFQDN",
			input:       "google.com",
			wantSyntax:  SYNTAX_FQDN,
			expectedErr: nil,
		},
		{
			name:        "Valid FQDN with wildcard",
			input:       "*.google.com",
			wantSyntax:  SYNTAX_FQDN_WILDCARD,
			expectedErr: nil,
		},
		{
			name:        "Valid FQDN with wildcard 2",
			input:       "*ads.google.com",
			wantSyntax:  SYNTAX_FQDN_WILDCARD,
			expectedErr: nil,
		},
		{
			name:        "Valid ASN with prefix",
			input:       "AS15169",
			wantSyntax:  SYNTAX_ASN,
			expectedErr: nil,
		},
		{
			name:        "Valid ASN without prefix",
			input:       "15169",
			wantSyntax:  SYNTAX_ASN,
			expectedErr: nil,
		},
		{
			name:        "Invalid ASN (zero)",
			input:       "AS0",
			wantSyntax:  SYNTAX_UNKNOWN,
			expectedErr: ErrInvalidCustomRuleSyntax,
		},
		{
			name:        "EmptyInput",
			input:       "",
			wantSyntax:  SYNTAX_UNKNOWN,
			expectedErr: ErrInvalidCustomRuleSyntax,
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			gotSyntax, err := NewCustomRuleSyntax(vldtr.Validator, tt.input)

			assert.Equal(t, err, tt.expectedErr)
			assert.Equal(t, tt.wantSyntax, gotSyntax)
		})
	}
}
