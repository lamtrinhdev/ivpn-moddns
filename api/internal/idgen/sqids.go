package idgen

import (
	"fmt"
	"time"

	sqids "github.com/sqids/sqids-go"
)

type SquidsGenerator struct {
	Sqids *sqids.Sqids
}

func NewSqidsGenerator(minLength int) (*SquidsGenerator, error) {
	if minLength <= 0 {
		minLength = 10
	}
	// Guard against overflow when casting to uint8
	if minLength > 255 {
		minLength = 255
	}
	// Convert safely after clamping (minLength now within 1..255)
	// minLength is clamped to <=255 above, safe conversion
	minLenUint8 := uint8(minLength) // #nosec G115
	s, err := sqids.New(sqids.Options{
		MinLength: minLenUint8,
		Alphabet:  "abcdefghijklmnopqrstuxyz1234567890",
	})
	if err != nil {
		return nil, err
	}

	return &SquidsGenerator{
		Sqids: s,
	}, nil
}

func (gen *SquidsGenerator) Generate() (string, error) {
	now := time.Now().UnixMilli()
	if now < 0 {
		return "", fmt.Errorf("negative timestamp: %d", now)
	}
	return gen.Sqids.Encode([]uint64{uint64(now)})
}
