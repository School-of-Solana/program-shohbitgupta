use anchor_lang::prelude::*;

declare_id!("HTk3g5v5CUai7MXF3r87jAMDjpGH6oXFJQCRYf4GFrv9");

mod state;
mod instructions;

use instructions::*;

#[program]
pub mod escrow {
    use super::*;

    /// Creates a new token swap offer
    ///
    /// # Arguments
    /// * `offer_amount` - The amount of tokens to offer
    /// * `request_amount` - The amount of tokens requested in exchange
    /// * `deadline` - Unix timestamp when the offer expires
    /// * `offer_id` - Unique identifier for this offer
    pub fn create_offer(
        ctx: Context<CreateOffer>,
        offer_amount: u64,
        request_amount: u64,
        deadline: i64,
        offer_id: u64,
    ) -> Result<()> {
        instructions::create_offer::create_offer(ctx, offer_amount, request_amount, deadline, offer_id)
    }

    /// Accepts an offer (fully or partially)
    ///
    /// # Arguments
    /// * `request_amount` - The amount of request tokens to provide (can be partial)
    pub fn accept_offer(
        ctx: Context<AcceptOffer>,
        request_amount: u64,
    ) -> Result<()> {
        instructions::accept_offer::accept_offer(ctx, request_amount)
    }

    /// Cancels an offer and refunds tokens to the creator
    /// Only the creator can cancel their own offer
    pub fn cancel_offer(ctx: Context<CancelOffer>) -> Result<()> {
        instructions::cancel_offer::cancel_offer(ctx)
    }

    /// Closes an expired offer and refunds tokens to the creator
    /// Anyone can call this to clean up expired offers
    pub fn close_expired_offer(ctx: Context<CloseExpiredOffer>) -> Result<()> {
        instructions::close_expired_offer::close_expired_offer(ctx)
    }
}