package servicescatalog

import (
	"testing"

	"github.com/stretchr/testify/assert"
	"github.com/stretchr/testify/require"
)

func TestValidate_DomainRules(t *testing.T) {
	tests := []struct {
		name    string
		cat     *Catalog
		wantErr string
	}{
		{
			name: "valid catalog with domains",
			cat: &Catalog{Services: []Service{
				{ID: "a", Name: "A", Domains: []string{"example.com", "foo.com"}},
				{ID: "b", Name: "B", Domains: []string{"bar.com"}},
			}},
		},
		{
			name: "uppercase domain rejected",
			cat: &Catalog{Services: []Service{
				{ID: "a", Name: "A", Domains: []string{"Example.com"}},
			}},
			wantErr: "must be lowercase",
		},
		{
			name: "trailing dot rejected",
			cat: &Catalog{Services: []Service{
				{ID: "a", Name: "A", Domains: []string{"example.com."}},
			}},
			wantErr: "trailing dot",
		},
		{
			name: "duplicate domain across services rejected",
			cat: &Catalog{Services: []Service{
				{ID: "a", Name: "A", Domains: []string{"example.com"}},
				{ID: "b", Name: "B", Domains: []string{"example.com"}},
			}},
			wantErr: "already used by",
		},
		{
			name: "no domains is valid",
			cat: &Catalog{Services: []Service{
				{ID: "a", Name: "A", ASNs: []uint{1}},
			}},
		},
	}

	for _, tt := range tests {
		t.Run(tt.name, func(t *testing.T) {
			err := Validate(tt.cat)
			if tt.wantErr == "" {
				require.NoError(t, err)
			} else {
				require.Error(t, err)
				assert.Contains(t, err.Error(), tt.wantErr)
			}
		})
	}
}

func TestDomainMapForServiceIDs(t *testing.T) {
	cat := &Catalog{Services: []Service{
		{ID: "ms", Name: "Microsoft", Domains: []string{"microsoft.com", "office.com"}},
		{ID: "apple", Name: "Apple", Domains: []string{"apple.com"}},
		{ID: "google", Name: "Google"},
	}}

	m := cat.DomainMapForServiceIDs([]string{"ms", "apple"})
	assert.Equal(t, "ms", m["microsoft.com"])
	assert.Equal(t, "ms", m["office.com"])
	assert.Equal(t, "apple", m["apple.com"])
	assert.Len(t, m, 3)

	m = cat.DomainMapForServiceIDs([]string{"google"})
	assert.Empty(t, m)

	m = cat.DomainMapForServiceIDs([]string{"unknown"})
	assert.Empty(t, m)
}
