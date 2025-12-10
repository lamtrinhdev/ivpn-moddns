package service

import (
	"github.com/ivpn/dns/blocklists/cache"
	"github.com/ivpn/dns/blocklists/config"
	"github.com/ivpn/dns/blocklists/db"
	"github.com/ivpn/dns/blocklists/model"
	"github.com/ivpn/dns/blocklists/updater"
)

type Service struct {
	Cfg        config.Config
	Store      db.Db
	Cache      cache.Cache
	Updater    updater.Updater
	Blocklists []model.BlocklistMetadata
}

// NewService creates a new Service instance
func New(cfg config.Config, store db.Db, cache cache.Cache, updater updater.Updater) *Service {
	return &Service{
		Cfg:     cfg,
		Store:   store,
		Cache:   cache,
		Updater: updater,
	}
}
