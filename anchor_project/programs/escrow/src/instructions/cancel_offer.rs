use anchor_lang::prelude::*;
use anchor_spl::token::{self, CloseAccount, Mint, Token, TokenAccount, Transfer};

use crate::state::{EscrowError, Offer, OfferCancelled};

/// Cancels an offer and refunds the remaining tokens to the creator
/// Only the creator can cancel their own offer
pub fn cancel_offer(ctx: Context<CancelOffer>) -> Result<()> {
    let offer = &ctx.accounts.offer;
    
    // Verify the signer is the creator
    require!(
        ctx.accounts.creator.key() == offer.creator,
        EscrowError::Unauthorized
    );
    
    let refund_amount = offer.remaining_offer_amount;
    
    // Transfer remaining tokens from vault back to creator
    if refund_amount > 0 {
        let seeds = &[
            b"offer",
            offer.creator.as_ref(),
            &offer.offer_id.to_le_bytes(),
            &[offer.bump],
        ];
        let signer_seeds = &[&seeds[..]];
        
        let cpi_accounts = Transfer {
            from: ctx.accounts.vault.to_account_info(),
            to: ctx.accounts.creator_token_account.to_account_info(),
            authority: offer.to_account_info(),
        };
        let cpi_program = ctx.accounts.token_program.to_account_info();
        let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
        token::transfer(cpi_ctx, refund_amount)?;
    }
    
    // Close the vault account
    let seeds = &[
        b"offer",
        offer.creator.as_ref(),
        &offer.offer_id.to_le_bytes(),
        &[offer.bump],
    ];
    let signer_seeds = &[&seeds[..]];
    
    let cpi_accounts = CloseAccount {
        account: ctx.accounts.vault.to_account_info(),
        destination: ctx.accounts.creator.to_account_info(),
        authority: offer.to_account_info(),
    };
    let cpi_program = ctx.accounts.token_program.to_account_info();
    let cpi_ctx = CpiContext::new_with_signer(cpi_program, cpi_accounts, signer_seeds);
    token::close_account(cpi_ctx)?;
    
    // Emit event
    emit!(OfferCancelled {
        offer: offer.key(),
        creator: offer.creator,
        refunded_amount: refund_amount,
    });
    
    Ok(())
}

#[derive(Accounts)]
pub struct CancelOffer<'info> {
    #[account(
        mut,
        seeds = [b"offer", offer.creator.as_ref(), &offer.offer_id.to_le_bytes()],
        bump = offer.bump,
        close = creator
    )]
    pub offer: Account<'info, Offer>,
    
    #[account(mut)]
    pub creator: Signer<'info>,
    
    pub offer_mint_currency_token: Account<'info, Mint>,
    
    /// Creator's token account to receive the refund
    #[account(
        mut,
        associated_token::mint = offer_mint_currency_token,
        associated_token::authority = creator
    )]
    pub creator_token_account: Account<'info, TokenAccount>,
    
    /// The vault holding the escrowed tokens
    #[account(
        mut,
        seeds = [b"vault", offer.key().as_ref()],
        bump,
        token::mint = offer_mint_currency_token,
        token::authority = offer
    )]
    pub vault: Account<'info, TokenAccount>,
    
    // Solana system program to handle token transfer
    pub token_program: Program<'info, Token>,
}

