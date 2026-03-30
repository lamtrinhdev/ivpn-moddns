package servicescatalog

import (
	"fmt"
	"os"
	"strings"

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
//     domains: [google.com, youtube.com]
type Service struct {
	ID      string   `json:"id" yaml:"id"`
	Name    string   `json:"name" yaml:"name"`
	LogoKey string   `json:"logo_key,omitempty" yaml:"logo_key"`
	ASNs    []uint   `json:"asns" yaml:"asns"`
	Domains []string `json:"domains,omitempty" yaml:"domains"`
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
	seenDomains := make(map[string]string) // domain -> service ID
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
		for _, d := range svc.Domains {
			dl := strings.ToLower(d)
			if dl != d {
				return fmt.Errorf("services[%d] (%s): domain %q must be lowercase", i, svc.ID, d)
			}
			if strings.HasSuffix(d, ".") {
				return fmt.Errorf("services[%d] (%s): domain %q must not have trailing dot", i, svc.ID, d)
			}
			if other, ok := seenDomains[dl]; ok {
				return fmt.Errorf("services[%d] (%s): domain %q already used by service %q", i, svc.ID, d, other)
			}
			seenDomains[dl] = svc.ID
		}
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

// DomainMapForServiceIDs returns a map of domain -> service ID for the given
// service IDs. Domains are lowercased. This map is used for domain-phase
// service blocking to catch CDN-served traffic that ASN blocking misses.
func (c *Catalog) DomainMapForServiceIDs(ids []string) map[string]string {
	out := make(map[string]string)
	if c == nil {
		return out
	}
	for _, id := range ids {
		svc, ok := c.FindByID(id)
		if !ok {
			continue
		}
		for _, d := range svc.Domains {
			out[strings.ToLower(d)] = svc.ID
		}
	}
	return out
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
