use anchor_lang::prelude::*;
use anchor_spl::token::{self, Mint, Token, TokenAccount, Transfer};

use crate::state::{EscrowError, Offer, OfferCreated};

/// Creates a new token swap offer
///
/// # Arguments
/// * `offer_amount` - The amount of tokens to offer
/// * `request_amount` - The amount of tokens requested in exchange
/// * `deadline` - Unix timestamp when the offer expires
/// * `offer_id` - Unique identifier for this offer (must be unique per creator)
///
/// # Uniqueness Guarantee
/// The offer account is derived from seeds [b"offer", creator, offer_id],
/// which ensures that each creator can only create one offer per offer_id.
/// If you try to create an offer with an existing offer_id, the transaction
/// will fail with "account already exists" error.
pub fn create_offer(
    ctx: Context<CreateOffer>,
    offer_amount: u64,
    request_amount: u64,
    deadline: i64,
    offer_id: u64,
) -> Result<()> {
    let offer = &mut ctx.accounts.offer;
    let clock = Clock::get()?;

    // Validate inputs
    require!(offer_amount > 0, EscrowError::InvalidAmount);
    require!(request_amount > 0, EscrowError::InvalidAmount);
    require!(deadline > clock.unix_timestamp, EscrowError::InvalidDeadline);

    // Note: Duplicate prevention is handled by the PDA seeds.
    // The 'init' constraint will fail if an offer with the same offer_id already exists
    // from this creator, preventing any duplicates.
    
    // Initialize the offer account
    offer.creator = ctx.accounts.creator.key();
    offer.offer_mint = ctx.accounts.offer_token_account.key();
    offer.request_mint = ctx.accounts.request_token_account.key();
    offer.offer_amount = offer_amount;
    offer.request_amount = request_amount;
    offer.remaining_offer_amount = offer_amount;
    offer.remaining_request_amount = request_amount;
    offer.deadline = deadline;
    offer.vault = ctx.accounts.vault.key();
    offer.bump = ctx.bumps.offer;
    offer.offer_id = offer_id;
    
    // Transfer tokens from creator to vault
    let cpi_accounts = Transfer {
        from: ctx.accounts.creator_token_account.to_account_info(),
        to: ctx.accounts.vault.to_account_info(),
        authority: ctx.accounts.creator.to_account_info(),
    };
    
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, offer_amount)?;
    
    // Emit event
    emit!(OfferCreated {
        offer: offer.key(),
        creator: offer.creator,
        offer_mint: offer.offer_mint,
        request_mint: offer.request_mint,
        offer_amount,
        request_amount,
        deadline,
        offer_id,
    });
    
    Ok(())
}

#[derive(Accounts)]
#[instruction(offer_amount: u64, request_amount: u64, deadline: i64, offer_id: u64)]
pub struct CreateOffer<'info> {
    #[account(mut)]
    pub creator: Signer<'info>,

    #[account(
        init,
        payer = creator,
        space = 8 + Offer::INIT_SPACE,
        seeds = [b"offer", creator.key().as_ref(), &offer_id.to_le_bytes()],
        bump
    )]
    pub offer: Account<'info, Offer>,
    
    pub offer_token_account: Account<'info, Mint>,
    pub request_token_account: Account<'info, Mint>,
    
    #[account(
        mut,
        associated_token::mint = offer_token_account,
        associated_token::authority = creator
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    
    #[account(
        init,
        payer = creator,
        seeds = [b"vault", offer.key().as_ref()],
        bump,
        token::mint = offer_token_account,
        token::authority = offer
    )]
    pub vault: Account<'info, TokenAccount>,
    
    // Solana system program to hanlde token transfer
    pub token_program: Program<'info, Token>,
    // Solana system program to initiate CPI calls
    pub system_program: Program<'info, System>,
}

