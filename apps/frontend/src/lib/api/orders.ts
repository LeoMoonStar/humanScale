import apiClient from './client';
import type { ApiResponse } from './client';
import type { PaginatedResponse } from './tokens';

// Order Types
export interface Order {
  id: string;
  user_id: string;
  token_id: string;
  order_type: 'buy' | 'sell';
  side: 'bid' | 'ask';
  price: number;
  quantity: number;
  filled_quantity: number;
  remaining_quantity: number;
  execution_type: 'market' | 'limit';
  time_in_force: 'GTC' | 'IOC' | 'FOK';
  status: 'open' | 'partial' | 'filled' | 'cancelled' | 'expired';
  fee_rate: number;
  total_fees: number;
  created_at: string;
  updated_at: string;
  expires_at?: string;
}

export interface Trade {
  id: string;
  buyer_order_id: string;
  seller_order_id: string;
  token_id: string;
  price: number;
  quantity: number;
  total_value: number;
  buyer_fee: number;
  seller_fee: number;
  platform_fee: number;
  settlement_status: 'pending' | 'settling' | 'settled' | 'failed';
  blockchain_tx_hash?: string;
  executed_at: string;
}

export interface OrderBook {
  token_id: string;
  bids: OrderBookLevel[];
  asks: OrderBookLevel[];
  spread: number;
  last_price?: number;
  updated_at: string;
}

export interface OrderBookLevel {
  price: number;
  quantity: number;
  order_count: number;
}

export interface CreateOrderRequest {
  token_id: string;
  order_type: 'buy' | 'sell';
  execution_type: 'market' | 'limit';
  price?: number;
  quantity: number;
  time_in_force?: 'GTC' | 'IOC' | 'FOK';
}

export interface OrderEstimate {
  estimated_price: number;
  estimated_total: number;
  estimated_fees: number;
  estimated_slippage: number;
  can_execute: boolean;
  warnings: string[];
}

// Orders API Service
export const ordersApi = {
  // Create a new order
  async createOrder(request: CreateOrderRequest): Promise<Order> {
    const response = await apiClient.post<ApiResponse<Order>>(
      '/api/v1/orders',
      request
    );
    return response.data.data;
  },

  // Get order by ID
  async getOrder(orderId: string): Promise<Order> {
    const response = await apiClient.get<ApiResponse<Order>>(
      `/api/v1/orders/${orderId}`
    );
    return response.data.data;
  },

  // Get user's orders
  async getUserOrders(params?: {
    page?: number;
    limit?: number;
    status?: string;
    token_id?: string;
  }): Promise<PaginatedResponse<Order>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Order>>>(
      '/api/v1/orders',
      { params }
    );
    return response.data.data;
  },

  // Cancel an order
  async cancelOrder(orderId: string): Promise<Order> {
    const response = await apiClient.post<ApiResponse<Order>>(
      `/api/v1/orders/${orderId}/cancel`
    );
    return response.data.data;
  },

  // Get order book for a token
  async getOrderBook(tokenId: string, depth: number = 20): Promise<OrderBook> {
    const response = await apiClient.get<ApiResponse<OrderBook>>(
      `/api/v1/orderbook/${tokenId}`,
      { params: { depth } }
    );
    return response.data.data;
  },

  // Estimate order execution
  async estimateOrder(
    tokenId: string,
    orderType: 'buy' | 'sell',
    quantity: number
  ): Promise<OrderEstimate> {
    const response = await apiClient.post<ApiResponse<OrderEstimate>>(
      `/api/v1/orderbook/${tokenId}/estimate`,
      { order_type: orderType, quantity }
    );
    return response.data.data;
  },

  // Get user's trades
  async getUserTrades(params?: {
    page?: number;
    limit?: number;
    token_id?: string;
  }): Promise<PaginatedResponse<Trade>> {
    const response = await apiClient.get<ApiResponse<PaginatedResponse<Trade>>>(
      '/api/v1/trades',
      { params }
    );
    return response.data.data;
  },

  // Get recent trades for a token
  async getTokenTrades(
    tokenId: string,
    limit: number = 50
  ): Promise<Trade[]> {
    const response = await apiClient.get<ApiResponse<Trade[]>>(
      `/api/v1/tokens/${tokenId}/trades`,
      { params: { limit } }
    );
    return response.data.data;
  },
};
