# GitHub Actions Auto-Deploy Setup

This guide explains how to set up automatic deployment to Sui Testnet on every commit.

## 🎯 What It Does

When you push commits to `main` or `master` branch that change files in `contracts/` folder:

1. ✅ Installs Sui CLI in GitHub Actions runner
2. ✅ Builds Move contracts
3. ✅ Runs Move tests
4. ✅ Deploys to Sui Testnet
5. ✅ Posts deployment info as commit comment
6. ✅ Creates deployment summary with explorer links
7. ✅ Saves deployment records as artifacts

## 🔧 Setup Instructions

### Step 1: Get Your Deployer Private Key

You need a Sui wallet private key for deployments. **DO NOT use your personal wallet with real funds!**

#### Option A: Create New Testnet Wallet

```bash
# Generate new key
sui keytool generate ed25519

# Output will show:
# ╭─────────────────────────────────────────────────────────╮
# │ Created new keypair and saved it to keystore.          │
# ├─────────────────────────────────────────────────────────┤
# │ Sui Address: 0x...                                      │
# │ Private Key (base64): <YOUR_PRIVATE_KEY>                │
# ╰─────────────────────────────────────────────────────────╯

# Copy the "Private Key (base64)" value
```

#### Option B: Export Existing Key

```bash
# List your addresses
sui keytool list

# Export specific address (replace with your address)
sui keytool export --key-identity <ADDRESS>

# Copy the base64 private key
```

### Step 2: Fund the Testnet Wallet

Get testnet SUI from the faucet:

```bash
# Get the wallet address
sui keytool list

# Request testnet SUI (via Discord or CLI)
curl --location --request POST 'https://faucet.testnet.sui.io/gas' \
  --header 'Content-Type: application/json' \
  --data-raw '{
    "FixedAmountRequest": {
      "recipient": "YOUR_SUI_ADDRESS"
    }
  }'
```

Or use the Discord faucet in #testnet-faucet channel:
```
!faucet YOUR_SUI_ADDRESS
```

### Step 3: Add GitHub Secret

1. Go to your GitHub repository
2. Click **Settings** → **Secrets and variables** → **Actions**
3. Click **New repository secret**
4. Add secret:
   - **Name:** `DEPLOYER_PRIVATE_KEY`
   - **Value:** Your base64 private key from Step 1
   - Click **Add secret**

### Step 4: Enable GitHub Actions

1. Go to **Settings** → **Actions** → **General**
2. Under **Actions permissions**, select:
   - ✅ "Allow all actions and reusable workflows"
3. Under **Workflow permissions**, select:
   - ✅ "Read and write permissions"
   - ✅ "Allow GitHub Actions to create and approve pull requests"
4. Click **Save**

### Step 5: Push and Test

```bash
# Make any change to contracts
cd contracts
echo "// test change" >> sources/creator_token.move

# Commit and push
git add .
git commit -m "test: trigger deployment"
git push origin main
```

## 📊 Viewing Deployment Results

### In GitHub Actions Tab

1. Go to **Actions** tab in your repo
2. Click on the latest workflow run
3. See deployment summary with:
   - ✅ Package ID
   - ✅ Explorer links
   - ✅ Deployer address
   - ✅ Timestamp

### In Commit Comments

The workflow automatically posts a comment on each commit with:
- Package ID
- Direct link to Suiscan explorer
- Deployment status

### Download Deployment Records

1. Go to workflow run
2. Scroll to **Artifacts** section
3. Download `deployment-records.zip`
4. Contains:
   - `deployment-record.json` - Metadata
   - `deployment-output.json` - Full deployment response

## 🔍 Monitoring Deployments

### Check Wallet Balance

The workflow shows wallet balance before deploying. If balance is low:

```
⚠️  Warning: Low balance (50000000 MIST). Deployment might fail.
Please fund the wallet: 0x...
```

Fund the wallet using the faucet (see Step 2).

### View on Explorer

After deployment, check your contracts on:

- **Suiscan:** `https://suiscan.xyz/testnet/object/<PACKAGE_ID>`
- **Sui Explorer:** `https://suiexplorer.com/object/<PACKAGE_ID>?network=testnet`

## 🛠️ Customization

### Deploy on Different Branches

Edit `.github/workflows/deploy-testnet.yml`:

```yaml
on:
  push:
    branches:
      - main
      - develop  # Add more branches
      - feature/* # Or patterns
```

### Deploy Only When Contracts Change

Already configured! Only deploys when files in `contracts/` change:

```yaml
paths:
  - 'contracts/**'
  - '.github/workflows/deploy-testnet.yml'
```

### Adjust Gas Budget

If deployments fail due to gas, increase the budget:

```yaml
- name: Deploy to Testnet
  working-directory: contracts
  run: |
    sui client publish --gas-budget 200000000  # Increase from 100000000
```

## 🚨 Troubleshooting

### Error: "Insufficient gas"

**Solution:** Fund your deployer wallet (see Step 2)

### Error: "Invalid private key"

**Solution:**
1. Regenerate key: `sui keytool generate ed25519`
2. Update GitHub Secret with new key
3. Re-run workflow

### Error: "Build failed"

**Solution:**
1. Test locally: `cd contracts && sui move build`
2. Fix compilation errors
3. Push again

### Error: "Permission denied"

**Solution:**
1. Check GitHub Actions permissions (Step 4)
2. Ensure workflow has write access

### Deployment Succeeds But Can't Find Package

**Solution:**
1. Check workflow logs for actual Package ID
2. Wait a few seconds for indexers to catch up
3. Try alternative explorer (Suiscan vs Sui Explorer)

## 📋 Workflow Triggers

| Event | Branch | Paths | Action |
|-------|--------|-------|--------|
| Push | main/master | contracts/** | ✅ Deploy |
| Push | main/master | Other files | ❌ Skip |
| Push | feature/* | Any | ❌ Skip |
| Pull Request | Any | Any | ❌ Skip |

## 🔐 Security Best Practices

1. **Never commit private keys** to the repository
2. **Use dedicated testnet wallet** - don't use your personal wallet
3. **Rotate keys regularly** - generate new keys periodically
4. **Monitor deployments** - check GitHub Actions logs
5. **Limit permissions** - only give necessary permissions to GitHub Actions

## 📝 Example Deployment Output

```
🚀 Deployment Successful

Network: Testnet
Package ID: 0x1234567890abcdef1234567890abcdef1234567890abcdef1234567890abcdef
Deployer: 0xabcdef1234567890abcdef1234567890abcdef12
Time: 2026-01-05 10:30:45 UTC

🔗 Explorer Links
- View Package on Suiscan
- View on Sui Explorer

📝 Commit Info
- Commit: abc123def456
- Branch: main
- Author: yourname
```

## 🎓 Learn More

- [GitHub Actions Documentation](https://docs.github.com/en/actions)
- [Sui CLI Documentation](https://docs.sui.io/references/cli)
- [Sui Testnet Faucet](https://docs.sui.io/guides/developer/getting-started/get-coins)
- [Suiscan Explorer](https://suiscan.xyz/testnet)

---

**Status:** Ready to deploy! 🚀

Just push a commit that modifies files in `contracts/` and watch the magic happen in the Actions tab.
