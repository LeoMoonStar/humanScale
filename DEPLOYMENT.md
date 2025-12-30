# PeopleCoin Deployment Guide - Render.com

Complete guide for deploying the PeopleCoin monorepo to Render as an MVP.

## Table of Contents

- [Prerequisites](#prerequisites)
- [Render Blueprint Deployment](#render-blueprint-deployment)
- [Manual Deployment](#manual-deployment)
- [Environment Variables](#environment-variables)
- [Post-Deployment](#post-deployment)
- [Monitoring](#monitoring)
- [Troubleshooting](#troubleshooting)

## Prerequisites

### 1. Render Account

- Sign up at [render.com](https://render.com)
- Free tier available for MVP testing
- Upgrade to paid plans for production

### 2. GitHub Repository

- Push your monorepo to GitHub
- Render will connect to your repository
- Ensure all deployment files are committed:
  - `render.yaml`
  - `backend/Dockerfile.render`
  - `apps/frontend/Dockerfile.render`
  - `apps/frontend/nginx.conf`

### 3. External Services

Required third-party API keys:

- **SuiScan API** - Get from [suiscan.xyz](https://suiscan.xyz)
- **CoinGecko API** - Get from [coingecko.com](https://www.coingecko.com/en/api)
- **Typesense Cloud** (optional) - Get from [cloud.typesense.org](https://cloud.typesense.org)

---

## Render Blueprint Deployment

The **recommended** method using Infrastructure as Code.

### Step 1: Connect Repository

1. Log in to Render Dashboard
2. Click **"New Blueprint Instance"**
3. Connect your GitHub repository
4. Select the repository containing your monorepo

### Step 2: Configure Blueprint

Render will automatically detect `render.yaml` and show:

**Services to be created:**
- ✅ peoplecoin-api (Backend API)
- ✅ peoplecoin-frontend (Frontend Web)
- ✅ peoplecoin-db (PostgreSQL)
- ✅ peoplecoin-redis (Redis Cache)

### Step 3: Set Environment Variables

Configure these **sync: false** variables manually:

```bash
# Backend API Service
TYPESENSE_HOST=your-typesense-host.a1.typesense.net
TYPESENSE_API_KEY=your-typesense-api-key
COINGECKO_API_KEY=your-coingecko-api-key
```

All other environment variables are **auto-configured** by Render:
- Database credentials (auto-linked)
- Redis connection (auto-linked)
- Service URLs (auto-linked)
- JWT secrets (auto-generated)

### Step 4: Deploy

1. Review all services and configurations
2. Click **"Apply"**
3. Render will:
   - Create all services
   - Build Docker images
   - Run database migrations
   - Link services together
   - Deploy to production

**Deployment time:** 5-10 minutes

### Step 5: Verify Deployment

Check service health:

```bash
# Backend health check
curl https://peoplecoin-api.onrender.com/health

# Frontend health check
curl https://peoplecoin-frontend.onrender.com/

# Expected response
{"status": "healthy", "timestamp": "2024-01-15T10:30:00Z"}
```

---

## Manual Deployment

Alternative method if you prefer manual setup.

### Step 1: Create PostgreSQL Database

1. Go to Dashboard → New → PostgreSQL
2. Configure:
   - Name: `peoplecoin-db`
   - Database: `peoplecoin`
   - User: `peoplecoin`
   - Region: `Oregon` (or closest to your users)
   - Plan: `Starter` (free)
3. Click **"Create Database"**
4. Wait for provisioning (2-3 minutes)

### Step 2: Create Redis

1. Go to Dashboard → New → Redis
2. Configure:
   - Name: `peoplecoin-redis`
   - Region: `Oregon`
   - Plan: `Starter` (free)
   - Max Memory Policy: `allkeys-lru`
3. Click **"Create Redis"**

### Step 3: Deploy Backend API

1. Go to Dashboard → New → Web Service
2. Configure:
   - Name: `peoplecoin-api`
   - Runtime: `Docker`
   - Dockerfile Path: `./backend/Dockerfile.render`
   - Docker Context: `./backend`
   - Region: `Oregon`
   - Plan: `Starter`

3. Set environment variables:

```bash
# Database (copy from peoplecoin-db connection info)
DB_HOST=<from-render>
DB_PORT=5432
DB_USER=<from-render>
DB_PASSWORD=<from-render>
DB_NAME=peoplecoin
DB_SSLMODE=require

# Redis (copy from peoplecoin-redis connection info)
REDIS_HOST=<from-render>
REDIS_PORT=6379

# JWT (generate secure random strings)
JWT_SECRET=<generate-random-64-char-string>
JWT_REFRESH_SECRET=<generate-random-64-char-string>
JWT_EXPIRATION=3600
JWT_REFRESH_EXPIRATION=604800

# Third-party APIs
TYPESENSE_HOST=your-host.a1.typesense.net
TYPESENSE_PORT=8108
TYPESENSE_PROTOCOL=https
TYPESENSE_API_KEY=your-api-key
SUISCAN_API_URL=https://suiscan.xyz/api/sui
COINGECKO_API_URL=https://api.coingecko.com/api/v3
COINGECKO_API_KEY=your-api-key

# Blockchain
SUI_RPC_URL=https://fullnode.mainnet.sui.io:443
SUI_NETWORK=mainnet

# CORS (will set after frontend deployed)
CORS_ALLOWED_ORIGINS=https://peoplecoin-frontend.onrender.com

# Environment
PORT=8080
ENV=production
```

4. Set **Health Check Path**: `/health`
5. Click **"Create Web Service"**

### Step 4: Deploy Frontend

1. Go to Dashboard → New → Web Service
2. Configure:
   - Name: `peoplecoin-frontend`
   - Runtime: `Docker`
   - Dockerfile Path: `./apps/frontend/Dockerfile.render`
   - Docker Context: `./apps/frontend`
   - Region: `Oregon`
   - Plan: `Starter`

3. Set environment variables:

```bash
# Backend API URL (from peoplecoin-api URL)
VITE_API_URL=https://peoplecoin-api.onrender.com

# Environment
NODE_ENV=production
```

4. Set **Health Check Path**: `/`
5. Click **"Create Web Service"**

### Step 5: Update Backend CORS

After frontend is deployed:

1. Go to `peoplecoin-api` settings
2. Update `CORS_ALLOWED_ORIGINS` to frontend URL
3. Redeploy backend

---

## Environment Variables

### Backend API (`peoplecoin-api`)

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `PORT` | Auto | Service port | `8080` |
| `ENV` | Manual | Environment | `production` |
| `DB_HOST` | Auto-linked | PostgreSQL host | `dpg-xxx.oregon-postgres.render.com` |
| `DB_PORT` | Auto-linked | PostgreSQL port | `5432` |
| `DB_USER` | Auto-linked | Database user | `peoplecoin` |
| `DB_PASSWORD` | Auto-linked | Database password | `xxx` |
| `DB_NAME` | Auto-linked | Database name | `peoplecoin` |
| `DB_SSLMODE` | Manual | SSL mode | `require` |
| `REDIS_HOST` | Auto-linked | Redis host | `red-xxx.oregon-redis.render.com` |
| `REDIS_PORT` | Auto-linked | Redis port | `6379` |
| `JWT_SECRET` | Auto-generated | Access token secret | (64 chars) |
| `JWT_REFRESH_SECRET` | Auto-generated | Refresh token secret | (64 chars) |
| `JWT_EXPIRATION` | Manual | Token expiry (seconds) | `3600` |
| `JWT_REFRESH_EXPIRATION` | Manual | Refresh expiry (seconds) | `604800` |
| `TYPESENSE_HOST` | Manual | Typesense host | `xxx.a1.typesense.net` |
| `TYPESENSE_PORT` | Manual | Typesense port | `8108` |
| `TYPESENSE_PROTOCOL` | Manual | Protocol | `https` |
| `TYPESENSE_API_KEY` | Manual | Typesense API key | `xxx` |
| `SUISCAN_API_URL` | Manual | SuiScan API | `https://suiscan.xyz/api/sui` |
| `COINGECKO_API_URL` | Manual | CoinGecko API | `https://api.coingecko.com/api/v3` |
| `COINGECKO_API_KEY` | Manual | CoinGecko key | `xxx` |
| `SUI_RPC_URL` | Manual | Sui RPC endpoint | `https://fullnode.mainnet.sui.io:443` |
| `SUI_NETWORK` | Manual | Sui network | `mainnet` |
| `CORS_ALLOWED_ORIGINS` | Auto-linked | Frontend URL | `https://peoplecoin-frontend.onrender.com` |

### Frontend (`peoplecoin-frontend`)

| Variable | Type | Description | Example |
|----------|------|-------------|---------|
| `VITE_API_URL` | Auto-linked | Backend API URL | `https://peoplecoin-api.onrender.com` |
| `NODE_ENV` | Manual | Environment | `production` |

---

## Post-Deployment

### 1. Run Database Migrations

Migrations run automatically during deployment via the Dockerfile entrypoint.

To manually run migrations:

```bash
# SSH into backend service
render ssh peoplecoin-api

# Run migrations
cd /app
cat migrations/*.sql | psql $DATABASE_URL
```

### 2. Verify Services

Check all services are healthy:

```bash
# Backend API
curl https://peoplecoin-api.onrender.com/health
# Response: {"status": "healthy"}

# Frontend
curl https://peoplecoin-frontend.onrender.com/
# Response: HTML content

# Database
psql $DATABASE_URL -c "SELECT COUNT(*) FROM users;"
# Response: count

# Redis
redis-cli -u $REDIS_URL ping
# Response: PONG
```

### 3. Test API Endpoints

```bash
# Request nonce
curl -X POST https://peoplecoin-api.onrender.com/api/v1/auth/nonce \
  -H "Content-Type: application/json" \
  -d '{"wallet_address": "0x1234567890123456789012345678901234567890123456789012345678901234"}'

# Get tokens
curl https://peoplecoin-api.onrender.com/api/v1/tokens
```

### 4. Configure Custom Domain (Optional)

1. Go to service settings → Custom Domains
2. Add your domain (e.g., `api.peoplecoin.com`)
3. Update DNS records as instructed
4. SSL certificates auto-provisioned

### 5. Set Up Monitoring

Enable Render monitoring:
- CPU usage
- Memory usage
- Request latency
- Error rates

---

## Monitoring

### Render Dashboard

Monitor services at: `https://dashboard.render.com`

**Key Metrics:**
- Service status (green = healthy)
- Build logs
- Deploy history
- Resource usage
- Error logs

### Logs

View real-time logs:

```bash
# Backend logs
render logs peoplecoin-api --tail 100

# Frontend logs
render logs peoplecoin-frontend --tail 100
```

### Alerts

Set up alerts for:
- Service downtime
- High error rates
- Resource exhaustion
- Failed deployments

### Health Checks

All services have health checks:

- **Backend**: `/health` endpoint (30s interval)
- **Frontend**: `/` endpoint (30s interval)
- **PostgreSQL**: Built-in (10s interval)
- **Redis**: Built-in (10s interval)

---

## Troubleshooting

### Issue: Service Won't Start

**Symptoms:**
- Service stuck in "Deploying" state
- Health checks failing

**Solutions:**

1. Check build logs:
```bash
render logs peoplecoin-api --build
```

2. Verify Dockerfile paths in `render.yaml`:
```yaml
dockerfilePath: ./backend/Dockerfile.render
dockerContext: ./backend
```

3. Ensure all files are committed to git

### Issue: Database Connection Failed

**Symptoms:**
- Error: "connection refused"
- Error: "password authentication failed"

**Solutions:**

1. Verify environment variables:
```bash
# Check DB_HOST, DB_PASSWORD are set correctly
render env get peoplecoin-api DB_HOST
```

2. Check database is running:
```bash
# Should show "available"
render services | grep peoplecoin-db
```

3. Verify SSL mode:
```bash
DB_SSLMODE=require  # Required for Render PostgreSQL
```

### Issue: CORS Errors

**Symptoms:**
- Frontend can't reach backend
- Browser console: "CORS policy" error

**Solutions:**

1. Check `CORS_ALLOWED_ORIGINS` in backend:
```bash
render env get peoplecoin-api CORS_ALLOWED_ORIGINS
```

2. Should match frontend URL exactly:
```bash
CORS_ALLOWED_ORIGINS=https://peoplecoin-frontend.onrender.com
```

3. Redeploy backend after changing

### Issue: Build Takes Too Long

**Symptoms:**
- Build exceeds 15 minutes
- Build timeout error

**Solutions:**

1. Check `.dockerignore` files exist:
```bash
# Should exclude node_modules, tests, docs
cat apps/frontend/.dockerignore
cat backend/.dockerignore
```

2. Use Docker layer caching:
```dockerfile
# Copy package files first (cached layer)
COPY package.json package-lock.json ./
RUN npm ci

# Then copy source code
COPY . .
```

### Issue: High Memory Usage

**Symptoms:**
- Service crashes
- Out of memory errors

**Solutions:**

1. Upgrade to higher plan:
   - Starter: 512MB RAM
   - Standard: 2GB RAM
   - Pro: 4GB RAM

2. Optimize Go binary:
```dockerfile
# Already optimized in Dockerfile.render
-ldflags='-w -s'  # Strip debug symbols
```

3. Enable Redis memory eviction:
```bash
# Already set in render.yaml
maxmemoryPolicy: allkeys-lru
```

### Issue: Frontend Shows White Screen

**Symptoms:**
- Frontend loads but shows blank page
- Console errors

**Solutions:**

1. Check `VITE_API_URL` is set:
```bash
render env get peoplecoin-frontend VITE_API_URL
```

2. Verify API is reachable:
```bash
curl https://peoplecoin-api.onrender.com/health
```

3. Check browser console for errors

4. Verify nginx config:
```nginx
# Should have SPA fallback
location / {
    try_files $uri $uri/ /index.html;
}
```

### Issue: Slow API Responses

**Symptoms:**
- API takes >5 seconds to respond
- Timeout errors

**Solutions:**

1. Check Redis is working:
```bash
redis-cli -u $REDIS_URL ping
# Should return: PONG
```

2. Review database query performance:
```bash
# Enable slow query log
psql $DATABASE_URL -c "ALTER DATABASE peoplecoin SET log_min_duration_statement = 1000;"
```

3. Upgrade to paid plans (free tier has spin-down)

---

## Deployment Checklist

Before deploying to production:

- [ ] All environment variables configured
- [ ] Third-party API keys obtained
- [ ] Database migrations tested locally
- [ ] `.dockerignore` files created
- [ ] Health check endpoints working
- [ ] CORS configuration correct
- [ ] Custom domain configured (if needed)
- [ ] Monitoring alerts set up
- [ ] Backup strategy in place
- [ ] SSL certificates verified
- [ ] Load testing completed

---

## Cost Estimates

### Free Tier (MVP Testing)

- ✅ PostgreSQL Starter: Free
- ✅ Redis Starter: Free
- ✅ Web Services: Free (750 hours/month each)
- ✅ **Total: $0/month**

**Limitations:**
- Services spin down after 15 minutes of inactivity
- 512MB RAM per service
- Shared CPU
- Community support

### Paid Tier (Production)

- Backend API (Standard): $25/month
- Frontend (Standard): $25/month
- PostgreSQL (Standard): $25/month
- Redis (Standard): $10/month
- **Total: ~$85/month**

**Benefits:**
- Always-on services
- 2GB RAM per service
- Dedicated CPU
- Priority support
- Custom domains included
- Auto-scaling available

---

## Resources

- **Render Documentation**: https://render.com/docs
- **Render Community**: https://community.render.com
- **Status Page**: https://status.render.com
- **Support**: support@render.com

---

## Next Steps

1. ✅ Deploy to Render using Blueprint method
2. ✅ Verify all services are healthy
3. ✅ Test API endpoints
4. ✅ Monitor for 24 hours
5. → Add custom domain
6. → Set up automated backups
7. → Configure monitoring alerts
8. → Plan for scaling

---

**Questions?** Check the [Troubleshooting](#troubleshooting) section or open an issue on GitHub.

Happy Deploying! 🚀
