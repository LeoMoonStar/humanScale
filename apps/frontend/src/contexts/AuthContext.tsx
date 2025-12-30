import { createContext, useContext, useState, useEffect, ReactNode } from 'react';
import { useCurrentAccount, useSignPersonalMessage } from '@mysten/dapp-kit';
import { authApi, User } from '../lib/api';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  isLoading: boolean;
  login: () => Promise<void>;
  logout: () => void;
  error: string | null;
}

const AuthContext = createContext<AuthContextType | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const currentAccount = useCurrentAccount();
  const { mutateAsync: signMessage } = useSignPersonalMessage();

  // Check if user is already logged in
  useEffect(() => {
    const checkAuth = async () => {
      const accessToken = localStorage.getItem('access_token');
      const storedUser = localStorage.getItem('user');

      if (accessToken && storedUser) {
        try {
          // Verify token is still valid by fetching current user
          const currentUser = await authApi.getCurrentUser();
          setUser(currentUser);
        } catch (err) {
          // Token is invalid, clear storage
          localStorage.removeItem('access_token');
          localStorage.removeItem('refresh_token');
          localStorage.removeItem('user');
          setUser(null);
        }
      }
      setIsLoading(false);
    };

    checkAuth();
  }, []);

  // Login with wallet signature
  const login = async () => {
    if (!currentAccount) {
      setError('Please connect your wallet first');
      return;
    }

    setIsLoading(true);
    setError(null);

    try {
      const walletAddress = currentAccount.address;

      // Step 1: Request nonce from backend
      const { nonce } = await authApi.requestNonce(walletAddress);

      // Step 2: Sign the nonce with wallet
      const { signature } = await signMessage({
        message: new TextEncoder().encode(nonce),
      });

      // Step 3: Verify signature with backend
      const authResponse = await authApi.login({
        wallet_address: walletAddress,
        signature,
        message: nonce,
      });

      // Step 4: Store tokens and user data
      localStorage.setItem('access_token', authResponse.access_token);
      localStorage.setItem('refresh_token', authResponse.refresh_token);
      localStorage.setItem('user', JSON.stringify(authResponse.user));
      setUser(authResponse.user);
    } catch (err) {
      console.error('Login error:', err);
      setError(err instanceof Error ? err.message : 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  // Logout
  const logout = async () => {
    try {
      await authApi.logout();
    } catch (err) {
      console.error('Logout error:', err);
    } finally {
      localStorage.removeItem('access_token');
      localStorage.removeItem('refresh_token');
      localStorage.removeItem('user');
      setUser(null);
    }
  };

  // Auto-logout when wallet disconnects
  useEffect(() => {
    if (!currentAccount && user) {
      logout();
    }
  }, [currentAccount]);

  const value = {
    user,
    isAuthenticated: !!user,
    isLoading,
    login,
    logout,
    error,
  };

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

// Hook to use auth context
export function useAuth() {
  const context = useContext(AuthContext);
  if (context === undefined) {
    throw new Error('useAuth must be used within an AuthProvider');
  }
  return context;
}
