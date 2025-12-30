import { useQuery, useMutation, useQueryClient } from '@tanstack/react-query';
import { tokensApi, ordersApi, usersApi } from '../lib/api';
import type {
  CreateOrderRequest,
  TokensListParams,
} from '../lib/api';

// Query Keys
export const queryKeys = {
  tokens: {
    all: ['tokens'] as const,
    list: (params?: TokensListParams) => ['tokens', 'list', params] as const,
    detail: (id: string) => ['tokens', 'detail', id] as const,
    metrics: (id: string) => ['tokens', 'metrics', id] as const,
    trending: () => ['tokens', 'trending'] as const,
    trades: (id: string) => ['tokens', 'trades', id] as const,
  },
  orders: {
    all: ['orders'] as const,
    list: (params?: any) => ['orders', 'list', params] as const,
    detail: (id: string) => ['orders', 'detail', id] as const,
    orderBook: (tokenId: string) => ['orders', 'orderBook', tokenId] as const,
  },
  trades: {
    all: ['trades'] as const,
    list: (params?: any) => ['trades', 'list', params] as const,
  },
  users: {
    all: ['users'] as const,
    detail: (id: string) => ['users', 'detail', id] as const,
    portfolio: (id?: string) => ['users', 'portfolio', id] as const,
    stats: (id?: string) => ['users', 'stats', id] as const,
    following: (id?: string) => ['users', 'following', id] as const,
  },
};

// Tokens Hooks
export function useTokens(params?: TokensListParams) {
  return useQuery({
    queryKey: queryKeys.tokens.list(params),
    queryFn: () => tokensApi.getTokens(params),
    staleTime: 30000, // 30 seconds
  });
}

export function useToken(tokenId: string) {
  return useQuery({
    queryKey: queryKeys.tokens.detail(tokenId),
    queryFn: () => tokensApi.getToken(tokenId),
    enabled: !!tokenId,
    staleTime: 30000,
  });
}

export function useTokenMetrics(tokenId: string) {
  return useQuery({
    queryKey: queryKeys.tokens.metrics(tokenId),
    queryFn: () => tokensApi.getTokenMetrics(tokenId),
    enabled: !!tokenId,
    refetchInterval: 30000, // Refetch every 30 seconds
  });
}

export function useTrendingTokens(limit?: number) {
  return useQuery({
    queryKey: queryKeys.tokens.trending(),
    queryFn: () => tokensApi.getTrendingTokens(limit),
    staleTime: 60000, // 1 minute
  });
}

export function useTokenTrades(tokenId: string, limit?: number) {
  return useQuery({
    queryKey: queryKeys.tokens.trades(tokenId),
    queryFn: () => ordersApi.getTokenTrades(tokenId, limit),
    enabled: !!tokenId,
    refetchInterval: 10000, // Refetch every 10 seconds
  });
}

// Orders Hooks
export function useOrders(params?: any) {
  return useQuery({
    queryKey: queryKeys.orders.list(params),
    queryFn: () => ordersApi.getUserOrders(params),
    staleTime: 10000, // 10 seconds
  });
}

export function useOrder(orderId: string) {
  return useQuery({
    queryKey: queryKeys.orders.detail(orderId),
    queryFn: () => ordersApi.getOrder(orderId),
    enabled: !!orderId,
    staleTime: 10000,
  });
}

export function useOrderBook(tokenId: string, depth?: number) {
  return useQuery({
    queryKey: queryKeys.orders.orderBook(tokenId),
    queryFn: () => ordersApi.getOrderBook(tokenId, depth),
    enabled: !!tokenId,
    refetchInterval: 5000, // Refetch every 5 seconds
  });
}

export function useCreateOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (request: CreateOrderRequest) => ordersApi.createOrder(request),
    onSuccess: () => {
      // Invalidate relevant queries
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.trades.all });
      queryClient.invalidateQueries({ queryKey: queryKeys.users.portfolio() });
    },
  });
}

export function useCancelOrder() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (orderId: string) => ordersApi.cancelOrder(orderId),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.orders.all });
    },
  });
}

// Trades Hooks
export function useTrades(params?: any) {
  return useQuery({
    queryKey: queryKeys.trades.list(params),
    queryFn: () => ordersApi.getUserTrades(params),
    staleTime: 10000,
  });
}

// Users Hooks
export function useUser(userId: string) {
  return useQuery({
    queryKey: queryKeys.users.detail(userId),
    queryFn: () => usersApi.getUser(userId),
    enabled: !!userId,
    staleTime: 60000,
  });
}

export function usePortfolio(userId?: string) {
  return useQuery({
    queryKey: queryKeys.users.portfolio(userId),
    queryFn: () => usersApi.getPortfolio(userId),
    staleTime: 30000,
    refetchInterval: 60000, // Refetch every minute
  });
}

export function useUserStats(userId?: string) {
  return useQuery({
    queryKey: queryKeys.users.stats(userId),
    queryFn: () => usersApi.getUserStats(userId),
    staleTime: 60000,
  });
}

export function useFollowing(userId?: string) {
  return useQuery({
    queryKey: queryKeys.users.following(userId),
    queryFn: () => usersApi.getFollowing(userId),
    staleTime: 60000,
  });
}

export function useFollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ targetId, type }: { targetId: string; type: 'user' | 'token' }) =>
      usersApi.follow(targetId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.following() });
    },
  });
}

export function useUnfollowUser() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ targetId, type }: { targetId: string; type: 'user' | 'token' }) =>
      usersApi.unfollow(targetId, type),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: queryKeys.users.following() });
    },
  });
}
