package mongodb

import (
	"context"

	"github.com/ivpn/dns/proxy/model"
	"github.com/rs/zerolog/log"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
	"go.mongodb.org/mongo-driver/mongo/options"
)

const (
	statisticsCollName = "statistics"
)

// StatisticsRepository is a MongoDB repository for statistics collection
type StatisticsRepository struct {
	client         *mongo.Client
	database       *mongo.Database
	DbName         string
	statisticsColl *mongo.Collection
}

// NewStatisticsRepository creates a new statistics instance
func NewStatisticsRepository(client *mongo.Client, dbName string) (*StatisticsRepository, error) {
	database := client.Database(dbName)

	coll := client.Database(dbName).Collection(statisticsCollName)

	repo := &StatisticsRepository{
		client:         client,
		database:       database,
		DbName:         dbName,
		statisticsColl: coll,
	}
	if err := repo.createStatisticsCollection(context.Background()); err != nil {
		return nil, err
	}

	return repo, nil
}

// InsertBatch upserts a batch of profile statistics
func (r *StatisticsRepository) InsertBatch(ctx context.Context, batch []model.EventStatistics) error {
	statsDocs := make([]any, 0)

	for _, event := range batch {
		event.Statistics.ID = primitive.NewObjectID()
		statsDocs = append(statsDocs, event.Statistics)
	}

	if len(statsDocs) > 0 {
		_, err := r.statisticsColl.InsertMany(ctx, statsDocs, &options.InsertManyOptions{
			Ordered: new(bool),
		})
		if err != nil {
			return err
		}
		log.Info().Str("collection_name", statisticsCollName).Int("batch_size", len(statsDocs)).Msgf("Inserted batch of user stats")
	}

	return nil
}

func (r *StatisticsRepository) createStatisticsCollection(ctx context.Context) error {
	existingCollNames, err := r.database.ListCollectionNames(ctx, bson.D{}, nil)
	if err != nil {
		log.Err(err).Msg("Error listing collection names")
		return err
	}
	defer func() {
		if err == nil {
			r.statisticsColl = r.client.Database(r.DbName).Collection(statisticsCollName)
		}
	}()

	// Timeseries collections must be explicitly created
	collExists := contains(existingCollNames, statisticsCollName)
	if collExists {
		log.Info().Msgf("%s collection already exists. continuing.", statisticsCollName)
		return nil
	}
	err = r.database.CreateCollection(
		ctx,
		statisticsCollName,
		&options.CreateCollectionOptions{
			TimeSeriesOptions: &options.TimeSeriesOptions{
				TimeField:   timeField,
				MetaField:   &metafieldProfileId,
				Granularity: &granularityMinutes,
			},
			ExpireAfterSeconds: &expirationOneMonth,
		},
	)
	if err != nil {
		log.Err(err).Msgf("Error creating collection [%s]", statisticsCollName)
		return err
	} else {
		log.Info().Msgf("Successfully created %s collection for the first time.", statisticsCollName)
	}
	return nil
}
