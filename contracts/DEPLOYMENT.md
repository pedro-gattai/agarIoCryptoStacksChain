# Smart Contract Deployment Guide

## Overview
This guide covers deploying the `game-pool.clar` smart contract to Stacks Testnet.

## Prerequisites

### 1. Get Testnet STX
You need testnet STX to pay for deployment fees (approximately 0.5-1 STX).

**Stacks Testnet Faucet:**
- Visit: https://explorer.hiro.so/sandbox/faucet?chain=testnet
- Connect your Hiro Wallet or enter your testnet address
- Request 500-1000 STX (free for testing)

### 2. Set Up Wallet

#### Option A: Use Hiro Wallet (Recommended for Hackathon)
1. Install Hiro Wallet extension: https://wallet.hiro.so/
2. Create a new wallet (or use existing)
3. Switch to Testnet network in wallet settings
4. Get testnet STX from faucet (link above)

#### Option B: Generate New Testnet Wallet
```bash
cd contracts
npm install @stacks/cli -g
stx make_keychain -t
# Save the mnemonic and private key securely!
```

### 3. Configure Private Key

**⚠️ SECURITY WARNING:** Never commit private keys to git. Use environment variables.

Set your private key as an environment variable:

```bash
# In your terminal (Mac/Linux)
export STACKS_PRIVATE_KEY="your_64_character_hex_private_key"

# Or in .env file (add to .gitignore!)
echo "STACKS_PRIVATE_KEY=your_key_here" > .env
```

## Deployment Methods

### Method 1: Using deploy.js Script (Recommended)

```bash
cd contracts

# Make sure you have the private key set
export STACKS_PRIVATE_KEY="your_private_key_here"

# Run deployment
node deployments/deploy.js
```

**Expected Output:**
```
Deploying contract...
✅ Contract deployed successfully!
Transaction ID: 0x1234567890abcdef...
Contract Address: ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM.game-pool
```

### Method 2: Using Clarinet Deployments

```bash
cd contracts

# Generate deployment plan for testnet
clarinet deployments generate --testnet

# Update settings/Testnet.toml with your mnemonic
# Edit line 7: mnemonic = "your twelve word mnemonic phrase here"

# Apply deployment
clarinet deployments apply -p deployments/default.testnet-plan.yaml
```

## Verify Deployment

After deployment, verify your contract on the Stacks Explorer:

1. Visit: https://explorer.hiro.so/?chain=testnet
2. Search for your transaction ID
3. Wait for confirmation (usually 1-3 minutes)
4. Contract will be available at: `YOUR_ADDRESS.game-pool`

## Save Contract Information

Once deployed, update these files with your contract address:

### 1. Server Configuration

File: `/server/src/services/BlockchainService.ts`

```typescript
// Update lines ~18-19
this.contractAddress = 'YOUR_DEPLOYED_ADDRESS'; // e.g., ST1PQHQKV0RJXZFY1DGX8MNSNYVE3VGZJSRTPGZGM
this.contractName = 'game-pool';
```

### 2. Environment Variables

Create `/server/.env`:
```env
STACKS_NETWORK=testnet
CONTRACT_ADDRESS=YOUR_DEPLOYED_ADDRESS
CONTRACT_NAME=game-pool
```

## Troubleshooting

### "Insufficient balance" Error
- Get more testnet STX from faucet
- Wait for faucet transaction to confirm (check explorer)

### "Invalid private key" Error
- Verify private key is 64 hex characters
- Make sure it's the private key, not mnemonic
- Try regenerating keychain

### "Contract already exists" Error
- Contract name must be unique per address
- Either use different deployer address, or change contract name

### Transaction Stuck/Pending
- Wait 5-10 minutes for network confirmation
- Check transaction status on explorer
- Testnet can be slow during high usage

## Post-Deployment Checklist

- [ ] Contract deployed successfully
- [ ] Transaction confirmed on explorer
- [ ] Contract address saved in server config
- [ ] Contract address saved in client config (if needed)
- [ ] Test contract functions via explorer
- [ ] Update game constants if needed (entry fee, max players)

## Testing Deployed Contract

You can test the deployed contract via Hiro Explorer:

1. Go to: `https://explorer.hiro.so/txid/YOUR_TX_ID?chain=testnet`
2. Click on "Contract" tab
3. Try calling read-only functions:
   - `get-next-game-id` - should return `u0`
   - `calculate-prizes` with `u1000000` - see prize breakdown

## Next Steps

After successful deployment:

1. **Update server** to use deployed contract address
2. **Test entry fee payment** from client
3. **Test prize distribution** in a full game flow
4. **Monitor transactions** during hackathon demo

## Important Notes

- Testnet STX has NO REAL VALUE - it's free test currency
- Testnet can be reset/wiped periodically
- For mainnet deployment (real money), use a hardware wallet
- Keep deployment transaction ID for reference

---

**Need Help?**
- Stacks Discord: https://stacks.chat
- Hiro Documentation: https://docs.hiro.so
- Clarinet Docs: https://docs.hiro.so/stacks/clarinet
