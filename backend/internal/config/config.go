package config

import (
	"log"
	"os"
	"strconv"
	"strings"

	"github.com/joho/godotenv"
)

type Config struct {
	Server    ServerConfig
	Database  DatabaseConfig
	Redis     RedisConfig
	JWT       JWTConfig
	Typesense TypesenseConfig
	Sui       SuiConfig
	ThirdParty ThirdPartyConfig
	CORS      CORSConfig
}

type ServerConfig struct {
	Port string
	Env  string
}

type DatabaseConfig struct {
	Host     string
	Port     string
	User     string
	Password string
	DBName   string
	SSLMode  string
}

type RedisConfig struct {
	Host     string
	Port     string
	Password string
}

type JWTConfig struct {
	Secret            string
	RefreshSecret     string
	Expiration        int
	RefreshExpiration int
}

type TypesenseConfig struct {
	Host     string
	Port     string
	Protocol string
	APIKey   string
}

type SuiConfig struct {
	RPCURL  string
	Network string
}

type ThirdPartyConfig struct {
	SuiScanAPIURL     string
	CoinGeckoAPIURL   string
	CoinGeckoAPIKey   string
}

type CORSConfig struct {
	AllowedOrigins []string
}

func Load() *Config {
	// Load .env file if exists
	if err := godotenv.Load(); err != nil {
		log.Println("No .env file found, using environment variables")
	}

	return &Config{
		Server: ServerConfig{
			Port: getEnv("PORT", "8080"),
			Env:  getEnv("ENV", "development"),
		},
		Database: DatabaseConfig{
			Host:     getEnv("DB_HOST", "localhost"),
			Port:     getEnv("DB_PORT", "5432"),
			User:     getEnv("DB_USER", "postgres"),
			Password: getEnv("DB_PASSWORD", "postgres"),
			DBName:   getEnv("DB_NAME", "peoplecoin"),
			SSLMode:  getEnv("DB_SSLMODE", "disable"),
		},
		Redis: RedisConfig{
			Host:     getEnv("REDIS_HOST", "localhost"),
			Port:     getEnv("REDIS_PORT", "6379"),
			Password: getEnv("REDIS_PASSWORD", ""),
		},
		JWT: JWTConfig{
			Secret:            getEnv("JWT_SECRET", ""),
			RefreshSecret:     getEnv("JWT_REFRESH_SECRET", ""),
			Expiration:        getEnvAsInt("JWT_EXPIRATION", 3600),
			RefreshExpiration: getEnvAsInt("JWT_REFRESH_EXPIRATION", 604800),
		},
		Typesense: TypesenseConfig{
			Host:     getEnv("TYPESENSE_HOST", "localhost"),
			Port:     getEnv("TYPESENSE_PORT", "8108"),
			Protocol: getEnv("TYPESENSE_PROTOCOL", "http"),
			APIKey:   getEnv("TYPESENSE_API_KEY", ""),
		},
		Sui: SuiConfig{
			RPCURL:  getEnv("SUI_RPC_URL", "https://fullnode.mainnet.sui.io:443"),
			Network: getEnv("SUI_NETWORK", "mainnet"),
		},
		ThirdParty: ThirdPartyConfig{
			SuiScanAPIURL:   getEnv("SUISCAN_API_URL", "https://suiscan.xyz/api/sui"),
			CoinGeckoAPIURL: getEnv("COINGECKO_API_URL", "https://api.coingecko.com/api/v3"),
			CoinGeckoAPIKey: getEnv("COINGECKO_API_KEY", ""),
		},
		CORS: CORSConfig{
			AllowedOrigins: getEnvAsSlice("CORS_ALLOWED_ORIGINS", []string{"http://localhost:3000"}),
		},
	}
}

func getEnv(key, defaultValue string) string {
	if value := os.Getenv(key); value != "" {
		return value
	}
	return defaultValue
}

func getEnvAsInt(key string, defaultValue int) int {
	valueStr := getEnv(key, "")
	if value, err := strconv.Atoi(valueStr); err == nil {
		return value
	}
	return defaultValue
}

func getEnvAsSlice(key string, defaultValue []string) []string {
	valueStr := getEnv(key, "")
	if valueStr == "" {
		return defaultValue
	}
	return strings.Split(valueStr, ",")
}

func (c *Config) GetDSN() string {
	return "host=" + c.Database.Host +
		" port=" + c.Database.Port +
		" user=" + c.Database.User +
		" password=" + c.Database.Password +
		" dbname=" + c.Database.DBName +
		" sslmode=" + c.Database.SSLMode
}

func (c *Config) GetRedisAddr() string {
	return c.Redis.Host + ":" + c.Redis.Port
}
