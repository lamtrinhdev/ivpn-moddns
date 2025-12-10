package store

import (
	"context"
	"crypto/tls"
	"crypto/x509"
	"fmt"
	"os"
	"time"

	"github.com/ivpn/dns/libs/store/migrator"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
	"go.mongodb.org/mongo-driver/mongo/readpref"
)

const (
	DbConnTimeout = 20 * time.Second
	DbPingTimeout = 20 * time.Second
)

// MongoDB is a MongoDB database instance
type MongoDB struct {
	Config *Config
	Client *mongo.Client
}

// NewMongoDB creates a new MongoDB instance
func NewMongoDB(dbConfig *Config) (db *MongoDB, err error) {
	db = &MongoDB{
		Config: dbConfig,
	}
	err = db.connect()
	if err != nil {
		return nil, err
	}
	return db, nil
}

// Client returns the MongoDB client
func (db *MongoDB) GetClient() *mongo.Client {
	return db.Client
}

// Connect connects to the MongoDB database
func (db *MongoDB) connect() error {
	log.Info().Msg("Connecting to mongoDB")

	ctx, cancel := context.WithTimeout(context.Background(), DbConnTimeout)
	defer cancel()

	clientOpts := options.Client().ApplyURI(db.Config.DbURI)
	if db.Config.Username != "" && db.Config.Password != "" {
		log.Debug().Msg("Authenticating to mongoDB")
		credentials := buildMongoCredentials(db.Config)
		clientOpts.SetAuth(credentials)
	}
	if db.Config.TLSEnabled {
		log.Debug().Msg("TLS for mongoDB enabled")
		cert, err := tls.LoadX509KeyPair(db.Config.CertFile, db.Config.KeyFile)
		if err != nil {
			return fmt.Errorf("failed to load client certificate: %v", err)
		}

		caCert, err := os.ReadFile(db.Config.CACertFile)
		if err != nil {
			return fmt.Errorf("failed to load CA certificate: %v", err)
		}

		caCertPool := x509.NewCertPool()
		if ok := caCertPool.AppendCertsFromPEM(caCert); !ok {
			return fmt.Errorf("failed to append CA certificate")
		}

		tlsOpts := &tls.Config{
			Certificates:       []tls.Certificate{cert},
			RootCAs:            caCertPool,
			InsecureSkipVerify: db.Config.TLSInsecureSkipVerify,
		}

		clientOpts.SetTLSConfig(tlsOpts)
	}

	client, err := mongo.Connect(ctx, clientOpts)
	if err != nil {
		return err
	}
	ctx, cancel = context.WithTimeout(context.Background(), DbPingTimeout)
	defer cancel()
	if err = client.Ping(ctx, readpref.Primary()); err != nil {
		return err
	}

	db.Client = client
	return nil
}

// buildMongoCredentials builds mongo credential object using config (extracted for testing)
func buildMongoCredentials(cfg *Config) options.Credential {
	authSource := cfg.AuthSource
	if authSource == "" {
		authSource = "dns"
	}
	return options.Credential{
		Username:   cfg.Username,
		Password:   cfg.Password,
		AuthSource: authSource,
	}
}

// Disconnect disconnects from the MongoDB database
func (db *MongoDB) Disconnect() error {
	ctx, cancel := context.WithTimeout(context.Background(), 3*time.Second)
	defer cancel()
	if err := db.Client.Disconnect(ctx); err != nil {
		return err
	}
	return nil
}

// Migrate runs migrations
func (db *MongoDB) Migrate() error {
	log.Info().Msg("Running DB migrations")
	migrator, err := migrator.NewMigrator(db.Client, db.Config.Name, db.Config.MigrationsSource)
	if err != nil {
		return err
	}
	return migrator.Migrate()
}
