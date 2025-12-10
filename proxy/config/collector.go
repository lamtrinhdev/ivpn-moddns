package config

import (
	"errors"
	"os"
	"strconv"
	"time"

	"github.com/ivpn/dns/proxy/model"
)

type CollectorConfig interface {
	GetBatchSize() int
	GetFrequency() time.Duration
}

type BatchCollectorConfig struct {
	Type      string
	BatchSize int
	Frequency time.Duration
}

func (b *BatchCollectorConfig) GetBatchSize() int {
	return b.BatchSize
}

func (b *BatchCollectorConfig) GetFrequency() time.Duration {
	return b.Frequency
}

func NewCollectorConfig(collectorType string) (CollectorConfig, error) {
	switch collectorType {
	case model.TYPE_QUERY_LOGS:
		return loadQueryLogsCollectorConfig()
	case model.TYPE_STATISTICS:
		return loadStatisticsCollectorConfig()
	default:
		return nil, errors.New("unknown collector config type")
	}
}

func loadQueryLogsCollectorConfig() (*BatchCollectorConfig, error) {
	bs := os.Getenv("COLLECTOR_QUERY_LOGS_BATCH_SIZE")
	if bs == "" {
		bs = "100"
	}
	batchSize, err := strconv.Atoi(bs)
	if err != nil {
		return nil, err
	}

	freq := os.Getenv("COLLECTOR_QUERY_LOGS_BATCH_INTERVAL")
	if freq == "" {
		freq = "10s"
	}
	interval, err := time.ParseDuration(freq)
	if err != nil {
		return nil, err
	}

	return &BatchCollectorConfig{
		Type:      model.TYPE_QUERY_LOGS,
		BatchSize: batchSize,
		Frequency: interval,
	}, nil
}

func loadStatisticsCollectorConfig() (*BatchCollectorConfig, error) {
	bs := os.Getenv("COLLECTOR_STATISTICS_BATCH_SIZE")
	if bs == "" {
		bs = "10000"
	}
	batchSize, err := strconv.Atoi(bs)
	if err != nil {
		return nil, err
	}

	freq := os.Getenv("COLLECTOR_STATISTICS_BATCH_INTERVAL")
	if freq == "" {
		freq = "30s"
	}
	interval, err := time.ParseDuration(freq)
	if err != nil {
		return nil, err
	}

	return &BatchCollectorConfig{
		Type:      model.TYPE_STATISTICS,
		BatchSize: batchSize,
		Frequency: interval,
	}, nil
}
