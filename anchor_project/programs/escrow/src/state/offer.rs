use anchor_lang::prelude::*;
use crate::state::errors::EscrowError;

/// The Offer account stores all information about a token swap offer
#[account]
#[derive(InitSpace)]
pub struct Offer {
    /// The creator of the offer
    pub creator: Pubkey,
    
    /// The mint token offered account
    pub offer_mint: Pubkey,
    
    /// The mint token requested account
    pub request_mint: Pubkey,
    
    /// The amount of tokens being offered
    pub offer_amount: u64,
    
    /// The amount of tokens being requested
    pub request_amount: u64,
    
    /// The remaining amount of tokens still available in the offer
    pub remaining_offer_amount: u64,
    
    /// The remaining amount of tokens still needed
    pub remaining_request_amount: u64,
    
    /// The deadline timestamp (Unix timestamp in seconds)
    pub deadline: i64,
    
    /// The vault token account that holds the escrowed tokens
    pub vault: Pubkey,
    
    /// Bump seed for PDA derivation
    pub bump: u8,
    
    /// Unique identifier for this offer
    pub offer_id: u64,
}

impl Offer {    
    /// Check if the offer has expired
    pub fn is_expired(&self, current_timestamp: i64) -> bool {
        current_timestamp > self.deadline
    }
    
    /// Check if the offer is fully filled
    pub fn is_full_filled(&self) -> bool {
        self.remaining_offer_amount == 0 || self.remaining_request_amount == 0
    }
    
    /// Calculate the amount to transfer for a partial fill
    /// Returns (offer_tokens_to_transfer, request_tokens_to_receive)
    pub fn calculate_partial_fill(&self, request_amount: u64) -> Result<(u64, u64)> {
        require!(request_amount > 0, EscrowError::InvalidAmount);
        require!(request_amount <= self.remaining_request_amount, EscrowError::InsufficientOfferAmount);
        
        // Calculate proportional offer amount
        let offer_tokens = (self.offer_amount as u128)
            .checked_mul(request_amount as u128)
            .ok_or(EscrowError::MathOverflow)?
            .checked_div(self.request_amount as u128)
            .ok_or(EscrowError::MathOverflow)? as u64;
        
        Ok((offer_tokens, request_amount))
    }
}

