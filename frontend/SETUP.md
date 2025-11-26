# 🚀 Frontend Setup Guide

## Quick Start

### 1. Start Local Validator

In one terminal, start the Solana test validator:

```bash
cd ../anchor_project
solana-test-validator
```

### 2. Deploy Program

In another terminal, build and deploy the escrow program:

```bash
cd ../anchor_project
anchor build
anchor deploy
```

Copy the Program ID from the deploy output.

### 3. Update Program ID

Update `src/utils/constants.ts` with your Program ID:

```typescript
export const PROGRAM_ID = new PublicKey(
  "YOUR_PROGRAM_ID_HERE"
);
```

### 4. Start Frontend

```bash
npm start
```

The app will open at http://localhost:3000

## Testing the App

### Step 1: Setup Test Tokens

You'll need to create test tokens. Use the Solana CLI:

```bash
# Create two test tokens
spl-token create-token
# Copy the token address (this will be your "offer token")

spl-token create-token
# Copy the token address (this will be your "request token")

# Create token accounts for your wallet
spl-token create-account <OFFER_TOKEN_ADDRESS>
spl-token create-account <REQUEST_TOKEN_ADDRESS>

# Mint some tokens to your account
spl-token mint <OFFER_TOKEN_ADDRESS> 1000
spl-token mint <REQUEST_TOKEN_ADDRESS> 2000
```

### Step 2: Create an Offer

1. Connect your Phantom wallet
2. Go to "Create Offer" tab
3. Fill in:
   - Offer Token Mint: `<YOUR_OFFER_TOKEN_ADDRESS>`
   - Offer Amount: `1000`
   - Request Token Mint: `<YOUR_REQUEST_TOKEN_ADDRESS>`
   - Request Amount: `2000`
   - Deadline: Select a future date/time
   - Offer ID: `1`
4. Click "Create Offer"

### Step 3: Accept the Offer (with another wallet)

1. Switch to a different wallet in Phantom (or use a different browser)
2. Make sure the second wallet has the request tokens
3. Go to "Accept Offer" tab
4. Enter the creator's wallet address and offer ID
5. Click "Fetch Offer"
6. Enter the amount to accept
7. Click "Accept Offer"

### Step 4: Test Other Features

- **Cancel Offer**: Cancel your own offers
- **Close Expired**: Wait for an offer to expire, then close it

## Troubleshooting

### "Program not found" error

Make sure:
1. The local validator is running
2. The program is deployed
3. The Program ID in constants.ts matches the deployed program

### "Account not found" error

Make sure:
1. Token accounts exist for both wallets
2. Wallets have sufficient tokens
3. The offer was created successfully

### Wallet connection issues

1. Make sure Phantom is installed
2. Check you're on localhost network in Phantom
3. Try refreshing the page

## Network Configuration

### Localhost (Default)
```typescript
export const RPC_ENDPOINT = "http://127.0.0.1:8899";
```

### Devnet
```typescript
export const RPC_ENDPOINT = "https://api.devnet.solana.com";
```

Make sure to:
1. Deploy program to devnet
2. Switch Phantom to devnet
3. Get devnet SOL from faucet

## Features Showcase

✅ **Create Offer**: Atomic token swap offers
✅ **Accept Offer**: Full or partial acceptance
✅ **Cancel Offer**: Reclaim your tokens
✅ **Close Expired**: Help others reclaim tokens
✅ **Vault Auto-Close**: Automatic cleanup on full acceptance
✅ **Rent Refund**: Get your rent back

---

Happy Trading! 🎉

