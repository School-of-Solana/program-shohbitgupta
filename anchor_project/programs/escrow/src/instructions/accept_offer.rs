use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};

use crate::state::{EscrowError, Offer, OfferAccepted};

/// Accepts an offer (fully or partially)
/// The acceptor specifies how much of the request token they want to provide
pub fn accept_offer(
    ctx: Context<AcceptOffer>,
    request_amount: u64,
) -> Result<()> {
    let offer = &mut ctx.accounts.offer;
    let clock = Clock::get()?;
    
    // Validate the offer is not expired
    require!(!offer.is_expired(clock.unix_timestamp), EscrowError::OfferExpired);
    
    // Validate the offer is not full-filled
    require!(!offer.is_full_filled(), EscrowError::InsufficientOfferAmount);
    
    // Calculate the amounts to transfer
    let (offer_tokens_to_transfer, request_tokens_to_receive) = 
        offer.calculate_partial_fill(request_amount)?;
    
    // Transfer request tokens from acceptor to creator
    let cpi_accounts = Transfer {
        from: ctx.accounts.acceptor_request_account.to_account_info(),
        to: ctx.accounts.creator_request_account.to_account_info(),
        authority: ctx.accounts.acceptor.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new(cpi_program, cpi_accounts);
    token::transfer(cpi_ctx, request_tokens_to_receive)?;
    
    // Transfer offer tokens from vault to acceptor
    let offer_key = offer.key();
    let offer_creator = offer.creator;
    let offer_id = offer.offer_id;
    let offer_bump = offer.bump;

    let seeds = &[
        b"offer",
        offer_creator.as_ref(),
        &offer_id.to_le_bytes(),
        &[offer_bump],
    ];
    let signer_seeds = &[&seeds[..]];

    let cpi_accounts = Transfer {
        from: ctx.accounts.vault.to_account_info(),
        to: ctx.accounts.acceptor_offer_account.to_account_info(),
        authority: offer.to_account_info(),
    };

    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    token::transfer(cpi_ctx, offer_tokens_to_transfer)?;

    // Update the offer state
    offer.remaining_offer_amount = offer.remaining_offer_amount
        .checked_sub(offer_tokens_to_transfer)
        .ok_or(EscrowError::MathOverflow)?;

    offer.remaining_request_amount = offer.remaining_request_amount
        .checked_sub(request_tokens_to_receive)
        .ok_or(EscrowError::MathOverflow)?;

    let is_full = offer.is_full_filled();

    // Emit event
    emit!(OfferAccepted {
        offer: offer_key,
        acceptor: ctx.accounts.acceptor.key(),
        offer_tokens_transferred: offer_tokens_to_transfer,
        request_tokens_received: request_tokens_to_receive,
        remaining_offer_amount: offer.remaining_offer_amount,
        remaining_request_amount: offer.remaining_request_amount,
        is_full_acceptance: is_full,
    });

    // If offer is fully filled, close the vault account
    if is_full {
        // Close the vault account and refund rent to creator
        let cpi_accounts = CloseAccount {
            account: ctx.accounts.vault.to_account_info(),
            destination: ctx.accounts.creator.to_account_info(),
            authority: offer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::close_account(cpi_ctx)?;
    }

    Ok(())
}

#[derive(Accounts)]
pub struct AcceptOffer<'info> {
    #[account(
        mut,
        seeds = [b"offer", offer.creator.as_ref(), &offer.offer_id.to_le_bytes()],
        bump = offer.bump,
    )]
    pub offer: Account<'info, Offer>,

    #[account(mut)]
    pub acceptor: Signer<'info>,

    /// CHECK: Creator account to receive rent refund when vault is closed
    #[account(mut)]
    pub creator: UncheckedAccount<'info>,
    
    /// The minted currency(ex: USDC) offered 
    pub offer_mint_token: Account<'info, Mint>,

    /// The minted currency(ex: SOL) requested 
    pub request_mint_token: Account<'info, Mint>,
    
    /// The vault holding the escrowed offer tokens
    #[account(
        mut,
        seeds = [b"vault", offer.key().as_ref()],
        bump,
        token::mint = offer_mint_token,
        token::authority = offer
    )]
    pub vault: Account<'info, TokenAccount>,
    
    /// Acceptor's token account for the offer mint (receives offer tokens)
    #[account(
        mut,
        associated_token::mint = offer_mint_token,
        associated_token::authority = acceptor
    )]
    pub acceptor_offer_account: Account<'info, TokenAccount>,
    
    /// Acceptor's token account for the request mint (sends request tokens)
    #[account(
        mut,
        associated_token::mint = request_mint_token,
        associated_token::authority = acceptor
    )]
    pub acceptor_request_account: Account<'info, TokenAccount>,
    
    /// Creator's token account for the request mint (receives request tokens)
    #[account(
        mut,
        associated_token::mint = request_mint_token,
        associated_token::authority = offer.creator
    )]
    pub creator_request_account: Account<'info, TokenAccount>,
    
    // Solana system program to handle token transfer
    pub token_program: Program<'info, Token>,
}

