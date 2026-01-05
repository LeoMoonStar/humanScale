# PeopleCoin Deployment Wizard

Automated deployment wizard for creating and initializing creator tokens on the PeopleCoin platform.

## Features

- **One-Command Deployment**: Deploy complete token ecosystem with a single command
- **Platform Initialization**: Set up platform vault and insurance pool (one-time)
- **Token Generation**: Generate unique Move modules for each creator token
- **Component Automation**: Automatically initialize treasury, buyback vault, and AMM pool
- **Multi-Network Support**: Deploy to testnet, mainnet, or local node
- **Comprehensive Validation**: Validates all parameters before deployment
- **Deployment Tracking**: Saves deployment records for each token

## Prerequisites

- Node.js >= 18.0.0
- npm >= 9.0.0
- Sui CLI installed
- Access to Sui network (testnet/mainnet/local)

## Installation

```bash
cd wizard
npm install
```

## Configuration

1. Copy the environment template:
```bash
cp .env.example .env
```

2. Edit `.env` and fill in:
```bash
# Your deployment wallet private key (base64 encoded)
DEPLOYER_PRIVATE_KEY=your_private_key_here

# PeopleCoin package IDs (after deploying main contracts)
PEOPLECOIN_PACKAGE_ID_TESTNET=0x...
PEOPLECOIN_PACKAGE_ID_MAINNET=0x...
```

3. Generate a deployment key (if needed):
```bash
sui keytool generate ed25519
# Copy the private key (base64) to .env
```

## Usage

### 0. Validate Contract Sync (Recommended)

Before deployment, validate that the wizard is in sync with contract interfaces:

```bash
npm run sync:contracts
```

This checks:
- All contract function signatures match expectations
- No breaking changes in contract interfaces
- Parameter counts and types are correct

### 1. Initialize Platform (One-Time)

Deploy platform vault and insurance pool:

```bash
npm run wizard:init-platform -- --network testnet
```

This creates:
- Platform Vault (100M SUI capacity)
- Insurance Pool (1B SUI capacity)

### 2. Deploy Creator Token

Deploy a complete token system for a creator:

```bash
npm run wizard:deploy -- \
  --name "Alice Token" \
  --symbol ALICE \
  --decimals 8 \
  --total-supply 10000000 \
  --creator-allocation 3000000 \
  --platform-reserve 3000000 \
  --liquidity-allocation 4000000 \
  --initial-sui-liquidity 4000000 \
  --initial-collateral 500000 \
  --buyback-years 5 \
  --buyback-interval-months 3 \
  --buyback-amount 100000 \
  --vesting-monthly-release 200 \
  --network testnet
```

This creates:
- Unique token module with OTW
- Token Registry
- Creator Treasury (with vesting)
- Buyback Vault (with collateral)
- AMM Liquidity Pool

### 3. Check Deployment

Deployment records are saved to `deployments/{network}/creator-{name}.json`:

```bash
cat deployments/testnet/creator-alice.json
```

## Command Options

### init-platform Options

| Option | Description | Default |
|--------|-------------|---------|
| `--network` | Network to deploy to | testnet |
| `--vault-fund` | Platform vault initial fund (SUI) | 100000000 |
| `--credit-limit` | Per-creator credit limit (SUI) | 500000 |
| `--insurance-fund` | Insurance pool initial fund (SUI) | 1000000000 |

### deploy Options

| Option | Required | Description |
|--------|----------|-------------|
| `--name` | Yes | Token name |
| `--symbol` | Yes | Token symbol (max 10 chars) |
| `--decimals` | No | Token decimals (default: 8) |
| `--total-supply` | Yes | Total token supply |
| `--creator-allocation` | Yes | Tokens for creator |
| `--platform-reserve` | Yes | Tokens for platform |
| `--liquidity-allocation` | Yes | Tokens for AMM pool |
| `--initial-sui-liquidity` | Yes | Initial SUI for AMM |
| `--initial-collateral` | Yes | SUI collateral for buyback |
| `--buyback-years` | Yes | Buyback duration (years) |
| `--buyback-interval-months` | Yes | Months between buybacks |
| `--buyback-amount` | Yes | Tokens to buyback per interval |
| `--vesting-monthly-release` | No | Monthly vesting % in bps (default: 200) |
| `--network` | Yes | testnet/mainnet/localnet |

## Examples

### Minimal Token (Testnet)

```bash
npm run wizard:deploy -- \
  --name "Test Token" \
  --symbol TEST \
  --total-supply 1000000 \
  --creator-allocation 300000 \
  --platform-reserve 300000 \
  --liquidity-allocation 400000 \
  --initial-sui-liquidity 400000 \
  --initial-collateral 50000 \
  --buyback-years 5 \
  --buyback-interval-months 3 \
  --buyback-amount 10000 \
  --network testnet
```

### Production Token (Mainnet)

```bash
npm run wizard:deploy -- \
  --name "Alice Coin" \
  --symbol ALICE \
  --decimals 9 \
  --description "Alice's creator token" \
  --total-supply 100000000 \
  --creator-allocation 30000000 \
  --platform-reserve 30000000 \
  --liquidity-allocation 40000000 \
  --initial-sui-liquidity 10000000 \
  --initial-collateral 5000000 \
  --buyback-years 10 \
  --buyback-interval-months 6 \
  --buyback-amount 1000000 \
  --vesting-monthly-release 200 \
  --network mainnet
```

## Directory Structure

```
wizard/
├── scripts/
│   ├── deploy-wizard.ts         # Main CLI entry point
│   ├── config.schema.ts         # TypeScript interfaces
│   ├── generators/
│   │   └── token-generator.ts   # Move module generator
│   ├── deployers/
│   │   ├── platform-deployer.ts # Platform initialization
│   │   ├── token-deployer.ts    # Token deployment
│   │   └── component-initializer.ts # Component setup
│   ├── utils/
│   │   ├── sui-client.ts        # Sui SDK wrapper
│   │   ├── logger.ts            # Console output
│   │   └── validator.ts         # Config validation
│   └── templates/
│       ├── Move.toml.template
│       └── token.move.template
├── deployments/                 # Deployment records
│   ├── testnet/
│   ├── mainnet/
│   └── local/
└── temp/                        # Temporary build files
```

## Troubleshooting

### "DEPLOYER_PRIVATE_KEY not found"
- Make sure you copied `.env.example` to `.env`
- Add your private key to `.env`

### "PeopleCoin package ID not found"
- Deploy the main PeopleCoin contracts first
- Add the package ID to `.env`

### "Insufficient balance"
- Make sure your wallet has enough SUI for:
  - Gas fees (~0.1 SUI per deployment)
  - Initial liquidity
  - Collateral
  - Platform initialization (if first time)

### Transaction failed
- Check gas budget in `.env`
- Verify all parameters are valid
- Check network connectivity

## Development

```bash
# Build TypeScript
npm run build

# Run tests
npm test

# Clean temp files
rm -rf temp/
```

## Security

- **Never commit `.env`** - It contains your private key
- **Use testnet first** - Always test on testnet before mainnet
- **Backup deployments** - Save deployment records safely
- **Verify transactions** - Check Sui Explorer for each deployment

## Support

For issues or questions:
- Check [CONTRACT_UPDATES.md](../contracts/CONTRACT_UPDATES.md)
- Review [README.md](../contracts/README.md)
- File an issue in the repository

## License

MIT
