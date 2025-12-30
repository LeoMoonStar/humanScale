import apiClient from './client';
import type { ApiResponse } from './client';

// Token Types
export interface Token {
  id: string;
  creator_id: string;
  coin_type: string;
  symbol: string;
  name: string;
  description?: string;
  image_url?: string;
  deployed_at: string;
  pool_address?: string;
  status: string;
  // Metrics from third-party APIs
  current_price?: number;
  market_cap?: number;
  total_supply?: string;
  circulating_supply?: string;
  volume_24h?: number;
  price_change_24h?: number;
  holders?: number;
}

export interface TokenMetrics {
  token_id: string;
  current_price: number;
  price_change_24h: number;
  price_change_7d: number;
  volume_24h: number;
  market_cap: number;
  total_supply: string;
  circulating_supply: string;
  holders: number;
  updated_at: string;
}

export interface CreateTokenRequest {
  symbol: string;
  name: string;
  description?: string;
  image_url?: string;
  initial_supply: string;
}

export interface TokensListParams {
  page?: number;
  limit?: number;
  sort?: 'price' | 'volume' | 'market_cap' | 'created_at';
  order?: 'asc' | 'desc';
  status?: string;
  search?: string;
}

export interface PaginatedResponse<T> {
  items: T[];
  total: number;
  page: number;
  limit: number;
  total_pages: number;
}

// Tokens API Service
export const tokensApi = {
  // Get all tokens (with pagination and filters)
  async getTokens(params?: TokensListParams): Promise<PaginatedResponse<Token>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Token>>>(
      '/api/v1/tokens',
      { params }
    );
    return response.data.data;
  },

  // Get single token by ID
  async getToken(tokenId: string): Promise<Token> {
    const response = await apiClient.get<ApiResponse<Token>>(
      `/api/v1/tokens/${tokenId}`
    );
    return response.data.data;
  },

  // Get token metrics
  async getTokenMetrics(tokenId: string): Promise<TokenMetrics> {
    const response = await apiClient.get<ApiResponse<TokenMetrics>>(
      `/api/v1/tokens/${tokenId}/metrics`
    );
    return response.data.data;
  },

  // Create new token
  async createToken(request: CreateTokenRequest): Promise<Token> {
    const response = await apiClient.post<ApiResponse<Token>>(
      '/api/v1/tokens',
      request
    );
    return response.data.data;
  },

  // Get trending tokens
  async getTrendingTokens(limit: number = 10): Promise<Token[]> {
    const response = await apiClient.get<ApiResponse<Token[]>>(
      '/api/v1/tokens/trending',
      { params: { limit } }
    );
    return response.data.data;
  },

  // Get user's created tokens
  async getUserTokens(userId: string): Promise<Token[]> {
    const response = await apiClient.get<ApiResponse<Token[]>>(
      `/api/v1/users/${userId}/tokens`
    );
    return response.data.data;
  },

  // Search tokens
  async searchTokens(query: string): Promise<Token[]> {
    const response = await apiClient.get<ApiResponse<Token[]>>(
      '/api/v1/tokens/search',
      { params: { q: query } }
    );
    return response.data.data;
  },
};
