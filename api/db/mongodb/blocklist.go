package mongodb

import (
	"context"

	"github.com/ivpn/dns/api/model"
	"github.com/spf13/cast"
	"go.mongodb.org/mongo-driver/bson"
	"go.mongodb.org/mongo-driver/bson/primitive"
	"go.mongodb.org/mongo-driver/mongo"
)

// BlocklistRepository is a MongoDB repository for blocklists collection
type BlocklistRepository struct {
	DbName                 string
	CollectionName         string
	blocklistsMetadataColl *mongo.Collection
}

// NewBlocklistRepository creates a new BlocklistRepository instance
func NewBlocklistRepository(client *mongo.Client, dbName, collectionName string) BlocklistRepository {
	collection := client.Database(dbName).Collection(collectionName)

	return BlocklistRepository{
		DbName:                 dbName,
		CollectionName:         collectionName,
		blocklistsMetadataColl: collection,
	}
}

// Get returns blocklists from the blocklists collection
func (r *BlocklistRepository) Get(ctx context.Context, filter map[string]any) ([]*model.Blocklist, error) {
	filterBson := bson.D{}
	defaultVal, exists := filter["default"]
	if exists {
		isDefault, err := cast.ToBoolE(defaultVal)
		if err != nil {
			return nil, err
		}
		filterBson = bson.D{primitive.E{Key: "default", Value: isDefault}}
	}

	blocklistVal, exists := filter["blocklist_id"]
	if exists {
		filterBson = bson.D{primitive.E{Key: "blocklist_id", Value: blocklistVal}}
	}

	cursor, err := r.blocklistsMetadataColl.Find(ctx, filterBson)
	if err != nil {
		return nil, err
	}

	blocklists := make([]*model.Blocklist, 0)
	if err = cursor.All(ctx, &blocklists); err != nil {
		return nil, err
	}

	return blocklists, nil
}
