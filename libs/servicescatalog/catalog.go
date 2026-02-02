package servicescatalog

import (
	"fmt"
	"os"

	"gopkg.in/yaml.v3"
)

// Service represents a user-facing “service” preset that maps to a set of ASNs.
// IDs are stable identifiers used in profile settings.
//
// YAML schema:
// services:
//   - id: google
//     name: Google
//     logo_key: google
//     asns: [15169]
type Service struct {
	ID      string `json:"id" yaml:"id"`
	Name    string `json:"name" yaml:"name"`
	LogoKey string `json:"logo_key,omitempty" yaml:"logo_key"`
	ASNs    []uint `json:"asns" yaml:"asns"`
}

type Catalog struct {
	Services []Service `json:"services" yaml:"services"`
}

func LoadFromFile(path string) (*Catalog, error) {
	b, err := os.ReadFile(path)
	if err != nil {
		return nil, err
	}
	var cat Catalog
	if err := yaml.Unmarshal(b, &cat); err != nil {
		return nil, err
	}
	if err := Validate(&cat); err != nil {
		return nil, err
	}
	return &cat, nil
}

func Validate(cat *Catalog) error {
	if cat == nil {
		return fmt.Errorf("catalog is nil")
	}
	seen := make(map[string]struct{}, len(cat.Services))
	for i, svc := range cat.Services {
		if svc.ID == "" {
			return fmt.Errorf("services[%d].id is required", i)
		}
		if svc.Name == "" {
			return fmt.Errorf("services[%d].name is required", i)
		}
		if _, ok := seen[svc.ID]; ok {
			return fmt.Errorf("duplicate service id: %q", svc.ID)
		}
		seen[svc.ID] = struct{}{}
	}
	return nil
}

func (c *Catalog) FindByID(id string) (Service, bool) {
	if c == nil {
		return Service{}, false
	}
	for _, s := range c.Services {
		if s.ID == id {
			return s, true
		}
	}
	return Service{}, false
}

// ASNsForServiceIDs returns the union of ASNs for the given service IDs.
func (c *Catalog) ASNsForServiceIDs(ids []string) map[uint]struct{} {
	out := make(map[uint]struct{})
	if c == nil {
		return out
	}
	for _, id := range ids {
		svc, ok := c.FindByID(id)
		if !ok {
			continue
		}
		for _, asn := range svc.ASNs {
			out[asn] = struct{}{}
		}
	}
	return out
}
