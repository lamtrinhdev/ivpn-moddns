package updater

import (
	"context"
	"errors"

	"github.com/ivpn/dns/blocklists/model"
)

const UpdaterTypeStandard = "standard"

type Updater interface {
	Setup(model.BlocklistMetadata, func() (*model.BlocklistMetadata, error)) error
	Start()
	Stop() context.Context
	Erase()
}

func New(updaterType string) (Updater, error) {
	switch updaterType { // nolint
	case UpdaterTypeStandard:
		return NewStandardUpdater(), nil
	}
	return nil, errors.New("unknown updater type")
}
