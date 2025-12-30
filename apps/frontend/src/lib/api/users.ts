import apiClient, { ApiResponse } from './client';
import { User } from './auth';

// User Profile Types
export interface UserProfile extends User {
  followers_count?: number;
  following_count?: number;
  tokens_created_count?: number;
  total_volume?: number;
  verified?: boolean;
}

export interface UpdateProfileRequest {
  username?: string;
  email?: string;
  bio?: string;
  avatar_url?: string;
  twitter_handle?: string;
  discord_handle?: string;
  website_url?: string;
}

export interface Portfolio {
  user_id: string;
  total_value: number;
  total_invested: number;
  total_profit_loss: number;
  profit_loss_percentage: number;
  holdings: PortfolioHolding[];
  updated_at: string;
}

export interface PortfolioHolding {
  token_id: string;
  token_symbol: string;
  token_name: string;
  token_image_url?: string;
  quantity: number;
  average_buy_price: number;
  current_price: number;
  total_value: number;
  profit_loss: number;
  profit_loss_percentage: number;
}

export interface UserStats {
  user_id: string;
  total_trades: number;
  total_volume: number;
  total_fees_paid: number;
  tokens_created: number;
  win_rate: number;
  best_trade_profit: number;
  worst_trade_loss: number;
  avg_trade_size: number;
}

export interface Following {
  user_id: string;
  following_id: string;
  followed_at: string;
  user?: UserProfile;
}

// Users API Service
export const usersApi = {
  // Get user profile by ID
  async getUser(userId: string): Promise<UserProfile> {
    const response = await apiClient.get<ApiResponse<UserProfile>>(
      `/api/v1/users/${userId}`
    );
    return response.data.data;
  },

  // Get user profile by wallet address
  async getUserByWallet(walletAddress: string): Promise<UserProfile> {
    const response = await apiClient.get<ApiResponse<UserProfile>>(
      `/api/v1/users/wallet/${walletAddress}`
    );
    return response.data.data;
  },

  // Update current user's profile
  async updateProfile(request: UpdateProfileRequest): Promise<UserProfile> {
    const response = await apiClient.put<ApiResponse<UserProfile>>(
      '/api/v1/users/me',
      request
    );
    return response.data.data;
  },

  // Get user's portfolio
  async getPortfolio(userId?: string): Promise<Portfolio> {
    const endpoint = userId
      ? `/api/v1/users/${userId}/portfolio`
      : '/api/v1/users/me/portfolio';
    const response = await apiClient.get<ApiResponse<Portfolio>>(endpoint);
    return response.data.data;
  },

  // Get user statistics
  async getUserStats(userId?: string): Promise<UserStats> {
    const endpoint = userId
      ? `/api/v1/users/${userId}/stats`
      : '/api/v1/users/me/stats';
    const response = await apiClient.get<ApiResponse<UserStats>>(endpoint);
    return response.data.data;
  },

  // Follow a user/token
  async follow(targetId: string, type: 'user' | 'token'): Promise<void> {
    await apiClient.post(`/api/v1/users/me/following`, {
      target_id: targetId,
      target_type: type,
    });
  },

  // Unfollow a user/token
  async unfollow(targetId: string, type: 'user' | 'token'): Promise<void> {
    await apiClient.delete(`/api/v1/users/me/following/${targetId}`, {
      params: { type },
    });
  },

  // Get user's following list
  async getFollowing(userId?: string): Promise<Following[]> {
    const endpoint = userId
      ? `/api/v1/users/${userId}/following`
      : '/api/v1/users/me/following';
    const response = await apiClient.get<ApiResponse<Following[]>>(endpoint);
    return response.data.data;
  },

  // Get user's followers
  async getFollowers(userId?: string): Promise<Following[]> {
    const endpoint = userId
      ? `/api/v1/users/${userId}/followers`
      : '/api/v1/users/me/followers';
    const response = await apiClient.get<ApiResponse<Following[]>>(endpoint);
    return response.data.data;
  },
};
