# Web3 Wallet-Based Authentication

## Philosophy

**Traditional Web2:**
- Email + Password
- Backend stores password hash
- User forgets password → recovery flow

**Web3 Approach:**
- Wallet Address = Identity
- User signs challenge with private key
- No passwords to forget or leak
- Private key never leaves wallet

---

## Authentication Flow

### Complete Flow Diagram

```
┌─────────────┐                                    ┌─────────────┐
│   Frontend  │                                    │   Backend   │
│   (React)   │                                    │   (API)     │
└──────┬──────┘                                    └──────┬──────┘
       │                                                  │
       │  1. User clicks "Connect Wallet"                │
       │─────────────────────────────────────────────►   │
       │                                                  │
       │  2. Wallet connects, exposes public address     │
       │     wallet_address: 0x742d35Cc...               │
       │                                                  │
       │  3. POST /auth/nonce                            │
       │     { walletAddress: "0x742d35Cc..." }          │
       │─────────────────────────────────────────────►   │
       │                                                  │
       │                                   4. Generate random nonce
       │                                      Store: {wallet: 0x..., nonce: "abc123"}
       │                                      Expires in 5 min
       │                                                  │
       │  5. Response: { nonce: "Sign this: abc123" }    │
       │  ◄────────────────────────────────────────────  │
       │                                                  │
       │  6. Prompt user to sign message                 │
       │     "Sign this message to authenticate: abc123" │
       │     User approves in wallet                     │
       │     Wallet signs with private key               │
       │     → signature: 0xdef456...                    │
       │                                                  │
       │  7. POST /auth/verify                           │
       │     {                                            │
       │       walletAddress: "0x742d35Cc...",           │
       │       signature: "0xdef456...",                 │
       │       message: "Sign this: abc123"              │
       │     }                                            │
       │─────────────────────────────────────────────►   │
       │                                                  │
       │                                   8. Verify signature
       │                                      ecrecover(message, sig) == wallet?
       │                                      If valid → User owns private key!
       │                                                  │
       │                                   9. Check if user exists
       │                                      If not → Create user record
       │                                      If yes → Update last_login
       │                                                  │
       │                                   10. Generate JWT token
       │                                       payload: {wallet: 0x..., role: user}
       │                                                  │
       │  11. Response: { accessToken: "eyJ...",         │
       │                  user: {...} }                  │
       │  ◄────────────────────────────────────────────  │
       │                                                  │
       │  12. Store token in localStorage/cookies        │
       │      Add to Authorization header for API calls  │
       │      User is now logged in!                     │
       │                                                  │
```

---

## Implementation Details

### Frontend Implementation (React + Sui Wallet)

#### 1. Connect Wallet Button

```tsx
import { ConnectButton, useWallet } from '@mysten/dapp-kit';
import { useState } from 'react';

export function ConnectWalletButton() {
  const { currentAccount } = useWallet();
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const handleAuthenticate = async () => {
    if (!currentAccount) return;

    setIsAuthenticating(true);
    try {
      // Step 1: Get nonce from backend
      const nonceRes = await fetch('/api/auth/nonce', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: currentAccount.address
        })
      });
      const { nonce } = await nonceRes.json();

      // Step 2: Sign the nonce with wallet
      const signature = await signMessage(nonce);

      // Step 3: Verify signature and login
      const loginRes = await fetch('/api/auth/verify', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          walletAddress: currentAccount.address,
          signature,
          message: nonce
        })
      });

      const { accessToken, user } = await loginRes.json();

      // Step 4: Store token
      localStorage.setItem('accessToken', accessToken);

      // Redirect to dashboard
      window.location.href = '/dashboard';
    } catch (error) {
      console.error('Authentication failed:', error);
    } finally {
      setIsAuthenticating(false);
    }
  };

  return (
    <div>
      {!currentAccount ? (
        <ConnectButton />
      ) : (
        <button onClick={handleAuthenticate} disabled={isAuthenticating}>
          {isAuthenticating ? 'Authenticating...' : 'Sign In with Wallet'}
        </button>
      )}
    </div>
  );
}
```

#### 2. Sign Message Helper

```tsx
import { useSignPersonalMessage } from '@mysten/dapp-kit';

function useWalletAuth() {
  const { mutateAsync: signPersonalMessage } = useSignPersonalMessage();

  const signMessage = async (message: string): Promise<string> => {
    const result = await signPersonalMessage({
      message: new TextEncoder().encode(message),
    });

    return result.signature;
  };

  return { signMessage };
}
```

#### 3. Auth Context Provider

```tsx
import { createContext, useContext, useEffect, useState } from 'react';

interface AuthContextType {
  user: User | null;
  isAuthenticated: boolean;
  login: (token: string, user: User) => void;
  logout: () => void;
}

const AuthContext = createContext<AuthContextType>(null!);

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<User | null>(null);
  const [isAuthenticated, setIsAuthenticated] = useState(false);

  useEffect(() => {
    // Check if user has valid token on mount
    const token = localStorage.getItem('accessToken');
    if (token) {
      // Verify token with backend
      fetch('/api/users/me', {
        headers: { Authorization: `Bearer ${token}` }
      })
        .then(res => res.json())
        .then(data => {
          setUser(data.user);
          setIsAuthenticated(true);
        })
        .catch(() => {
          localStorage.removeItem('accessToken');
        });
    }
  }, []);

  const login = (token: string, user: User) => {
    localStorage.setItem('accessToken', token);
    setUser(user);
    setIsAuthenticated(true);
  };

  const logout = () => {
    localStorage.removeItem('accessToken');
    setUser(null);
    setIsAuthenticated(false);
  };

  return (
    <AuthContext.Provider value={{ user, isAuthenticated, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export const useAuth = () => useContext(AuthContext);
```

---

### Backend Implementation (Node.js/Express)

#### 1. Request Nonce Endpoint

```typescript
import { Router } from 'express';
import crypto from 'crypto';
import { db } from './database';

const router = Router();

router.post('/auth/nonce', async (req, res) => {
  const { walletAddress } = req.body;

  // Validate wallet address format
  if (!isValidSuiAddress(walletAddress)) {
    return res.status(400).json({
      success: false,
      error: 'Invalid wallet address'
    });
  }

  // Generate random nonce
  const nonce = `Sign this message to authenticate: ${crypto.randomBytes(16).toString('hex')}`;
  const expiresAt = new Date(Date.now() + 5 * 60 * 1000); // 5 minutes

  // Store nonce in database
  await db.query(`
    INSERT INTO users (wallet_address, nonce, nonce_expires_at)
    VALUES ($1, $2, $3)
    ON CONFLICT (wallet_address)
    DO UPDATE SET nonce = $2, nonce_expires_at = $3
  `, [walletAddress, nonce, expiresAt]);

  res.json({
    success: true,
    data: {
      nonce,
      expiresAt: expiresAt.toISOString()
    }
  });
});

export default router;
```

#### 2. Verify Signature Endpoint

```typescript
import { verifyPersonalMessageSignature } from '@mysten/sui.js/verify';
import jwt from 'jsonwebtoken';

router.post('/auth/verify', async (req, res) => {
  const { walletAddress, signature, message } = req.body;

  // 1. Retrieve stored nonce
  const user = await db.query(
    'SELECT * FROM users WHERE wallet_address = $1',
    [walletAddress]
  );

  if (!user.rows[0]) {
    return res.status(404).json({
      success: false,
      error: 'No nonce found for this wallet. Please request a new nonce.'
    });
  }

  const storedNonce = user.rows[0].nonce;
  const nonceExpiresAt = user.rows[0].nonce_expires_at;

  // 2. Verify nonce matches and hasn't expired
  if (message !== storedNonce) {
    return res.status(400).json({
      success: false,
      error: 'Invalid nonce'
    });
  }

  if (new Date() > new Date(nonceExpiresAt)) {
    return res.status(400).json({
      success: false,
      error: 'Nonce expired. Please request a new one.'
    });
  }

  // 3. Verify signature using Sui SDK
  try {
    const isValid = await verifyPersonalMessageSignature(
      new TextEncoder().encode(message),
      signature
    );

    if (!isValid || isValid.toLowerCase() !== walletAddress.toLowerCase()) {
      return res.status(401).json({
        success: false,
        error: 'Invalid signature'
      });
    }
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Signature verification failed'
    });
  }

  // 4. Signature is valid! User owns the wallet
  const isNewUser = user.rows[0].created_at === null;

  // Update last login
  await db.query(
    'UPDATE users SET last_login_at = NOW(), nonce = NULL WHERE wallet_address = $1',
    [walletAddress]
  );

  // 5. Generate JWT tokens
  const accessToken = jwt.sign(
    {
      userId: user.rows[0].id,
      walletAddress,
      role: user.rows[0].role
    },
    process.env.JWT_SECRET!,
    { expiresIn: '1h' }
  );

  const refreshToken = jwt.sign(
    {
      userId: user.rows[0].id,
      walletAddress
    },
    process.env.JWT_REFRESH_SECRET!,
    { expiresIn: '7d' }
  );

  // 6. Return tokens and user info
  res.json({
    success: true,
    data: {
      accessToken,
      refreshToken,
      expiresIn: 3600,
      isNewUser,
      user: {
        id: user.rows[0].id,
        walletAddress,
        username: user.rows[0].username,
        email: user.rows[0].email,
        role: user.rows[0].role,
        createdAt: user.rows[0].created_at
      }
    }
  });
});
```

#### 3. JWT Authentication Middleware

```typescript
import { Request, Response, NextFunction } from 'express';

export async function authenticateJWT(
  req: Request,
  res: Response,
  next: NextFunction
) {
  const authHeader = req.headers.authorization;

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({
      success: false,
      error: 'No authorization token provided'
    });
  }

  const token = authHeader.substring(7);

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET!) as {
      userId: string;
      walletAddress: string;
      role: string;
    };

    // Attach user info to request
    req.user = decoded;
    next();
  } catch (error) {
    return res.status(401).json({
      success: false,
      error: 'Invalid or expired token'
    });
  }
}

// Usage in routes
router.get('/users/me', authenticateJWT, async (req, res) => {
  const user = await db.query(
    'SELECT * FROM users WHERE id = $1',
    [req.user.userId]
  );

  res.json({ success: true, data: user.rows[0] });
});
```

---

## Security Considerations

### 1. Nonce Security
✅ **DO:**
- Generate cryptographically secure random nonces
- Set short expiration (5 minutes)
- Invalidate nonce after successful verification
- One nonce per wallet at a time

❌ **DON'T:**
- Reuse nonces
- Use predictable nonces (sequential numbers)
- Store nonces indefinitely

### 2. Signature Verification
✅ **DO:**
- Always verify signature server-side
- Use official Sui SDK for verification
- Compare recovered address case-insensitively
- Log failed verification attempts

❌ **DON'T:**
- Trust client-side verification
- Skip signature validation
- Allow replay attacks

### 3. JWT Token Security
✅ **DO:**
- Use strong secret keys (32+ characters)
- Set reasonable expiration (1 hour for access, 7 days for refresh)
- Rotate refresh tokens periodically
- Store tokens securely (httpOnly cookies preferred)

❌ **DON'T:**
- Store tokens in localStorage if XSS is a concern
- Use weak secrets
- Set tokens to never expire

---

## Database Schema Considerations

### Minimal User Table

```sql
CREATE TABLE users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  wallet_address VARCHAR(66) UNIQUE NOT NULL,

  -- Authentication
  nonce VARCHAR(64),
  nonce_expires_at TIMESTAMP,

  -- Optional profile
  username VARCHAR(50) UNIQUE,
  email VARCHAR(255) UNIQUE,
  avatar_url TEXT,

  -- Metadata
  created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
  last_login_at TIMESTAMP,

  INDEX idx_wallet (wallet_address)
);
```

**Key Points:**
- `wallet_address` is the PRIMARY identity (unique, not null)
- `email` is optional (only for notifications)
- No `password_hash` field
- `nonce` is temporary, cleared after login

---

## User Experience Flow

### First-Time User
1. Clicks "Connect Wallet"
2. Wallet popup: "Connect to PeopleCoin?"
3. User approves connection
4. Clicks "Sign In with Wallet"
5. Wallet popup: "Sign this message to authenticate: abc123"
6. User approves signature
7. **New user created** in database
8. Redirected to onboarding (optional profile setup)

### Returning User
1. Clicks "Connect Wallet"
2. Wallet popup: "Connect to PeopleCoin?"
3. User approves connection
4. Clicks "Sign In with Wallet"
5. Wallet popup: "Sign this message to authenticate: xyz789"
6. User approves signature
7. **Existing user logged in**
8. Redirected to dashboard

### No Password Recovery
- **User loses wallet access = loses account**
- Important to educate users about wallet security
- Consider optional email for account recovery (advanced feature)

---

## Advantages of Web3 Auth

✅ **No password management**
- Users don't need to create/remember passwords
- No password reset flows

✅ **Better security**
- Private keys never leave wallet
- No password database to breach
- Phishing resistant

✅ **True ownership**
- User owns their identity
- Can't be locked out by platform
- Portable across dApps

✅ **Privacy-first**
- No email required
- Minimal data collection
- Pseudonymous by default

✅ **Blockchain-native**
- Wallet = identity = trading account
- Seamless integration with smart contracts
- Direct asset custody

---

## Email as Optional Add-On

### When to Collect Email

Only ask for email **after** user is authenticated and using the platform:

1. **Trading notifications**: "You've been matched!"
2. **Creator updates**: "Creator you follow just posted"
3. **Security alerts**: "New login detected"
4. **Marketing** (with consent): Newsletter, announcements

### Implementation

```typescript
// User can add email later from profile settings
POST /users/me/email
{
  "email": "user@example.com"
}

// Send verification email
// User clicks link → email verified
// Now can receive notifications
```

### Email is NOT:
- ❌ Required for signup
- ❌ Used for authentication
- ❌ A recovery mechanism (by default)

---

## Testing

### Test Checklist

- [ ] Nonce generation works
- [ ] Nonce expires after 5 minutes
- [ ] Signature verification works
- [ ] Invalid signature rejected
- [ ] Expired nonce rejected
- [ ] JWT token issued correctly
- [ ] JWT middleware validates tokens
- [ ] New user created on first login
- [ ] Existing user updated on subsequent logins
- [ ] Wallet address stored correctly
- [ ] Last login timestamp updated

---

## Summary

**Web3 authentication flow:**
1. Request nonce → 2. Sign nonce → 3. Verify signature → 4. Issue JWT

**Key differences from Web2:**
- ✅ Wallet address = identity
- ✅ No passwords
- ✅ No email required
- ✅ Cryptographic proof of ownership
- ✅ User controls their keys

**Backend changes:**
- ✅ Store nonces temporarily
- ✅ Verify signatures using Sui SDK
- ✅ Issue JWT on successful verification
- ✅ Email optional for notifications only

This approach is **Web3-native**, **secure**, and provides the best UX for blockchain users! 🚀
