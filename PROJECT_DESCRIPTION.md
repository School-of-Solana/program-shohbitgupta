# Project Description

**Deployed Frontend URL:** https://solana-escrow-dapp-3t0k0jayd-shohbitguptas-projects.vercel.app/

**Solana Program ID:** HTk3g5v5CUai7MXF3r87jAMDjpGH6oXFJQCRYf4GFrv9

## Project Overview

### Description

This is a decentralized token swap escrow platform built on Solana. The dApp enables users to create trustless peer-to-peer token swap offers with customizable exchange rates and deadlines. The escrow smart contract holds the offered tokens in a secure vault until the offer is accepted, cancelled, or expires. The platform supports partial fills, allowing acceptors to fulfill offers incrementally, and automatically handles token transfers and vault closures. All transactions are executed on Solana devnet with full support for SPL tokens.

### Key Features

The dApp provides comprehensive token swap functionality with the following features:

- **Create Token Swap Offers:** Users can create offers to swap one SPL token for another with custom amounts, exchange rates, and expiration deadlines
- **Accept Offers (Full or Partial):** Acceptors can fulfill offers completely or partially, with automatic proportional token calculations
- **Cancel Offers:** Creators can cancel their active offers at any time and receive their escrowed tokens back
- **Close Expired Offers:** Anyone can close expired offers to clean up the blockchain and help creators reclaim their tokens
- **Real-time Offer Listing:** View all active offers with detailed information including creator, token mints, amounts, and deadlines
- **Automatic Token Account Creation:** The frontend automatically creates associated token accounts if they don't exist
- **Decimal Amount Support:** User-friendly decimal input that automatically converts to raw token amounts based on mint decimals
- **Vault Auto-Closure:** When offers are fully filled, the vault account is automatically closed and rent is refunded to the creator

### How to Use the dApp

1. **Connect Wallet**

   - Click "Select Wallet" and choose your Solana wallet (Phantom, Solflare, etc.)
   - Ensure your wallet is connected to Solana Devnet
   - Make sure you have devnet SOL for transaction fees

2. **Create an Offer:**

   - Navigate to the "Create Offer" tab
   - Enter the offer token mint address (the token you want to trade away)
   - Enter the offer amount (decimals allowed, e.g., 100 or 0.5)
   - Enter the request token mint address (the token you want to receive)
   - Enter the request amount (decimals allowed)
   - Set a deadline (future date/time when the offer expires)
   - Enter a unique offer ID (any number you haven't used before)
   - Click "Create Offer" and approve the transaction in your wallet

3. **View Active Offers:**

   - Check the "Running Offers" panel on the right side
   - Click "Refresh" to update the list
   - View offer details including creator, tokens, amounts, and deadlines

4. **Accept an Offer:**

   - Find an offer in the "Running Offers" list (you can only accept offers created by others)
   - Enter the amount you want to accept in the input field (can be partial)
   - Click the green "Accept" button
   - Approve the transaction in your wallet
   - Tokens will be automatically swapped

5. **Cancel Your Offer:**

   - Navigate to the "Cancel Offer" tab
   - Enter your offer ID
   - Click "Fetch Offer" to verify it exists
   - Click "Cancel Offer" to retrieve your escrowed tokens

6. **Close Expired Offers:**
   - Navigate to the "Close Expired Offer" tab
   - Enter the creator's wallet address and offer ID
   - Click "Fetch Offer" to verify it's expired
   - Click "Close Expired Offer" to help clean up the blockchain

## Program Architecture

The escrow program follows a secure and efficient architecture using Anchor framework. The core flow involves creating offers that lock tokens in a vault, accepting offers with automatic token swaps, and managing offer lifecycle through cancellation and expiration. The program uses PDAs for deterministic account derivation, ensuring security and preventing unauthorized access. All token transfers are handled through Cross-Program Invocations (CPIs) to the SPL Token program, and the program emits events for off-chain tracking and indexing.

### PDA Usage

The program implements two critical PDAs to ensure security and deterministic account addressing:

**PDAs Used:**

- **Offer PDA:** Derived from seeds `[b"offer", creator.key(), offer_id]`

  - **Purpose:** Stores all offer metadata including token mints, amounts, deadline, and vault address
  - **Why:** The combination of creator and offer_id ensures each creator can have multiple unique offers while preventing duplicates. The PDA derivation makes the offer account address deterministic and verifiable
  - **Security:** Only the program can sign for this PDA, preventing unauthorized modifications

- **Vault PDA:** Derived from seeds `[b"vault", offer.key()]`
  - **Purpose:** Holds the escrowed tokens until the offer is accepted, cancelled, or expires
  - **Why:** Using a PDA as the vault ensures the program has signing authority to transfer tokens out during acceptance or cancellation, without requiring the creator's signature
  - **Security:** The vault is tied to a specific offer, preventing token theft or misuse. Only the program can authorize transfers from the vault

### Program Instructions

The program implements four core instructions that handle the complete lifecycle of token swap offers:

**Instructions Implemented:**

- **create_offer:** Creates a new token swap offer and locks tokens in escrow

  - Validates offer amount, request amount, and deadline
  - Initializes the Offer PDA with all offer details
  - Creates a vault token account to hold escrowed tokens
  - Transfers offer tokens from creator to vault via CPI
  - Emits OfferCreated event for off-chain tracking
  - Prevents duplicate offers through PDA seed uniqueness

- **accept_offer:** Accepts an existing offer (fully or partially)

  - Validates the offer is not expired and not fully filled
  - Calculates proportional amounts for partial fills
  - Transfers request tokens from acceptor to creator via CPI
  - Transfers offer tokens from vault to acceptor via CPI using PDA signer
  - Updates remaining amounts in the Offer account
  - Automatically closes vault and refunds rent when fully filled
  - Emits OfferAccepted event with fill details

- **cancel_offer:** Allows creator to cancel their own offer

  - Validates that the caller is the offer creator (security check)
  - Transfers all remaining tokens from vault back to creator via CPI
  - Closes the vault account and refunds rent to creator
  - Closes the Offer account and refunds rent to creator
  - Emits OfferCancelled event

- **close_expired_offer:** Allows anyone to close an expired offer
  - Validates that the current timestamp is past the deadline
  - Transfers remaining tokens from vault back to creator via CPI
  - Closes the vault account and refunds rent to creator
  - Closes the Offer account and refunds rent to creator
  - Emits OfferExpired event
  - Incentivizes blockchain cleanup by allowing anyone to call this

### Account Structure

The program uses a single main account structure to store all offer-related data:

```rust
/// The Offer account stores all information about a token swap offer
#[account]
#[derive(InitSpace)]
pub struct Offer {
    /// The creator of the offer (32 bytes)
    pub creator: Pubkey,

    /// The mint address of the token being offered (32 bytes)
    pub offer_mint: Pubkey,

    /// The mint address of the token being requested (32 bytes)
    pub request_mint: Pubkey,

    /// The total amount of tokens being offered (8 bytes)
    pub offer_amount: u64,

    /// The total amount of tokens being requested (8 bytes)
    pub request_amount: u64,

    /// The remaining amount of offer tokens still available (8 bytes)
    /// Decreases as the offer is partially filled
    pub remaining_offer_amount: u64,

    /// The remaining amount of request tokens still needed (8 bytes)
    /// Decreases as the offer is partially filled
    pub remaining_request_amount: u64,

    /// The deadline timestamp in Unix seconds (8 bytes)
    /// After this time, the offer can be closed by anyone
    pub deadline: i64,

    /// The vault token account that holds the escrowed tokens (32 bytes)
    pub vault: Pubkey,

    /// Bump seed for PDA derivation (1 byte)
    pub bump: u8,

    /// Unique identifier for this offer (8 bytes)
    /// Combined with creator address to ensure uniqueness
    pub offer_id: u64,
}
// Total size: 32+32+32+8+8+8+8+8+32+1+8 = 177 bytes + 8 byte discriminator = 185 bytes
```

**Helper Methods:**

- `is_expired(current_timestamp)` - Checks if the offer has passed its deadline
- `is_full_filled()` - Checks if all tokens have been swapped
- `calculate_partial_fill(request_amount)` - Calculates proportional token amounts for partial fills

## Testing

### Test Coverage

The project includes comprehensive test coverage with 16 test cases covering both happy paths and error scenarios. All tests use the Anchor testing framework with TypeScript and Chai assertions. The tests validate all four program instructions with various edge cases and security checks.

**Happy Path Tests:**

- **Successfully creates an offer** - Validates offer creation with proper token transfer to vault and correct account initialization
- **Successfully accepts full offer** - Tests complete offer fulfillment with token swaps, vault closure, and rent refund
- **Successfully accepts partial offer** - Validates proportional token calculations and partial fill mechanics
- **Successfully cancels offer and refunds tokens** - Tests creator cancellation with full token refund and account closure
- **Successfully closes expired offer** - Validates that expired offers can be closed by anyone with proper token refunds

**Unhappy Path Tests:**

- **Fails to create offer with zero offer amount** - Ensures InvalidAmount error is thrown
- **Fails to create offer with zero request amount** - Ensures InvalidAmount error is thrown
- **Fails to create offer with past deadline** - Ensures InvalidDeadline error is thrown
- **Fails to create duplicate offer with same offer_id** - Validates PDA uniqueness prevents duplicates
- **Fails to accept with zero amount** - Ensures InvalidAmount error for zero acceptance
- **Fails to accept more than remaining amount** - Ensures InsufficientOfferAmount error for over-acceptance
- **Fails when non-creator tries to cancel** - Validates authorization check prevents unauthorized cancellation
- **Fails to close non-expired offer** - Ensures OfferNotExpired error prevents premature closure

**Additional Test Scenarios:**

- Token account creation and initialization
- Rent refund verification for closed accounts
- Event emission validation
- Balance change verification for all parties
- Vault account closure on full fill

### Running Tests

```bash
# Navigate to the anchor project directory
cd anchor_project

# Run all tests
anchor test

# Run tests with detailed logs
anchor test -- --nocapture

# Run tests on devnet (requires deployed program)
anchor test --provider.cluster devnet
```

### Additional Notes for Evaluators

**Key Implementation Highlights:**

1. **Security:** The program uses PDA-based authorization to ensure only creators can cancel their offers, and validates all amounts and deadlines before processing
2. **Partial Fills:** The accept_offer instruction supports partial fills with automatic proportional calculation, allowing flexible trading
3. **Rent Optimization:** Vault and offer accounts are automatically closed when no longer needed, refunding rent to the creator
4. **Event Emission:** All state changes emit events (OfferCreated, OfferAccepted, OfferCancelled, OfferExpired) for off-chain indexing
5. **Frontend Integration:** The React frontend provides a user-friendly interface with automatic token account creation and decimal amount conversion
6. **Error Handling:** Custom error types provide clear feedback for all failure scenarios
7. **Math Safety:** All calculations use checked arithmetic to prevent overflow/underflow vulnerabilities

**Testing Notes:**

- All 16 tests pass successfully on localnet
- Tests cover 100% of program instructions
- Both happy and unhappy paths are thoroughly tested
- Security constraints are validated in multiple scenarios
- The test suite uses realistic token amounts and deadlines

**Deployment:**

- Program deployed to Solana Devnet at: `HTk3g5v5CUai7MXF3r87jAMDjpGH6oXFJQCRYf4GFrv9`
- Frontend deployed to Vercel at: https://solana-escrow-dapp-3t0k0jayd-shohbitguptas-projects.vercel.app/
- Test tokens available on devnet for testing the live deployment
