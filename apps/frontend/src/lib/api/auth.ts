import apiClient from './client';
import type { ApiResponse } from './client';

// Auth Types
export interface NonceResponse {
  nonce: string;
  expires_at: string;
}

export interface User {
  id: string;
  wallet_address: string;
  username?: string;
  email?: string;
  avatar_url?: string;
  bio?: string;
  role: string;
  status: string;
  created_at: string;
}

export interface AuthResponse {
  access_token: string;
  refresh_token: string;
  user: User;
  expires_in: number;
}

export interface LoginRequest {
  wallet_address: string;
  signature: string;
  message: string;
}

export interface RefreshRequest {
  refresh_token: string;
}

// Auth API Service
export const authApi = {
  // Request nonce for wallet authentication
  async requestNonce(walletAddress: string): Promise<NonceResponse> {
    const response = await apiClient.post<ApiResponse<NonceResponse>>(
      '/api/v1/auth/nonce',
      { wallet_address: walletAddress }
    );
    return response.data.data;
  },

  // Verify signature and login
  async login(request: LoginRequest): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/api/v1/auth/verify',
      request
    );
    return response.data.data;
  },

  // Refresh access token
  async refresh(request: RefreshRequest): Promise<AuthResponse> {
    const response = await apiClient.post<ApiResponse<AuthResponse>>(
      '/api/v1/auth/refresh',
      request
    );
    return response.data.data;
  },

  // Logout
  async logout(): Promise<void> {
    await apiClient.post('/api/v1/auth/logout');
  },

  // Get current user
  async getCurrentUser(): Promise<User> {
    const response = await apiClient.get<ApiResponse<User>>('/api/v1/auth/me');
    return response.data.data;
  },
};
