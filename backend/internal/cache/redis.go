package cache

import (
	"context"
	"encoding/json"
	"fmt"
	"log"
	"time"

	"github.com/redis/go-redis/v9"
	"github.com/peoplecoin/backend/internal/config"
)

type RedisClient struct {
	client *redis.Client
	ctx    context.Context
}

func NewRedisClient(cfg *config.Config) *RedisClient {
	rdb := redis.NewClient(&redis.Options{
		Addr:     cfg.GetRedisAddr(),
		Password: cfg.Redis.Password,
		DB:       0,
	})

	// Test connection
	ctx := context.Background()
	if err := rdb.Ping(ctx).Err(); err != nil {
		log.Printf("⚠️  Redis connection failed: %v. Continuing without cache.", err)
		return &RedisClient{client: nil, ctx: ctx}
	}

	log.Println("✅ Redis connected successfully")

	return &RedisClient{
		client: rdb,
		ctx:    ctx,
	}
}

func (r *RedisClient) Close() error {
	if r.client != nil {
		return r.client.Close()
	}
	return nil
}

// Get retrieves a value from cache
func (r *RedisClient) Get(key string) (string, error) {
	if r.client == nil {
		return "", fmt.Errorf("redis not available")
	}

	val, err := r.client.Get(r.ctx, key).Result()
	if err == redis.Nil {
		return "", nil // Key doesn't exist
	}
	return val, err
}

// Set stores a value in cache with expiration
func (r *RedisClient) Set(key string, value interface{}, expiration time.Duration) error {
	if r.client == nil {
		return nil // Silently fail if Redis not available
	}

	return r.client.Set(r.ctx, key, value, expiration).Err()
}

// SetJSON stores a JSON-serialized value
func (r *RedisClient) SetJSON(key string, value interface{}, expiration time.Duration) error {
	if r.client == nil {
		return nil
	}

	jsonData, err := json.Marshal(value)
	if err != nil {
		return err
	}

	return r.Set(key, jsonData, expiration)
}

// GetJSON retrieves and deserializes a JSON value
func (r *RedisClient) GetJSON(key string, dest interface{}) error {
	if r.client == nil {
		return fmt.Errorf("redis not available")
	}

	val, err := r.Get(key)
	if err != nil || val == "" {
		return err
	}

	return json.Unmarshal([]byte(val), dest)
}

// Delete removes a key from cache
func (r *RedisClient) Delete(key string) error {
	if r.client == nil {
		return nil
	}

	return r.client.Del(r.ctx, key).Err()
}

// DeletePattern deletes all keys matching a pattern
func (r *RedisClient) DeletePattern(pattern string) error {
	if r.client == nil {
		return nil
	}

	iter := r.client.Scan(r.ctx, 0, pattern, 0).Iterator()
	for iter.Next(r.ctx) {
		if err := r.client.Del(r.ctx, iter.Val()).Err(); err != nil {
			return err
		}
	}

	return iter.Err()
}

// Exists checks if a key exists
func (r *RedisClient) Exists(key string) (bool, error) {
	if r.client == nil {
		return false, fmt.Errorf("redis not available")
	}

	count, err := r.client.Exists(r.ctx, key).Result()
	return count > 0, err
}

// Cache TTL constants
const (
	TokenInfoTTL      = 30 * time.Second  // Token price data
	TokenHoldersTTL   = 5 * time.Minute   // Holder list
	TokenTxsTTL       = 1 * time.Minute   // Transaction list
	OrderBookTTL      = 5 * time.Second   // Order book snapshot
	UserProfileTTL    = 10 * time.Minute  // User profile
	CreatorProfileTTL = 10 * time.Minute  // Creator profile
)

// Cache key builders
func TokenInfoKey(coinType string) string {
	return fmt.Sprintf("token:info:%s", coinType)
}

func TokenHoldersKey(coinType string, page, limit int) string {
	return fmt.Sprintf("token:holders:%s:%d:%d", coinType, page, limit)
}

func TokenTransactionsKey(coinType string, page, limit int) string {
	return fmt.Sprintf("token:transactions:%s:%d:%d", coinType, page, limit)
}

func OrderBookKey(tokenID string) string {
	return fmt.Sprintf("orderbook:%s", tokenID)
}

func UserProfileKey(userID string) string {
	return fmt.Sprintf("user:profile:%s", userID)
}
