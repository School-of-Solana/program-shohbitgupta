use anchor_lang::prelude::*;

/// Error codes for the escrow program
#[error_code]
pub enum EscrowError {
    #[msg("The offer has expired")]
    OfferExpired,
    
    #[msg("The offer has not expired yet")]
    OfferNotExpired,
    
    #[msg("Invalid amount specified")]
    InvalidAmount,
    
    #[msg("Insufficient offer amount remaining")]
    InsufficientOfferAmount,
    
    #[msg("Math overflow occurred")]
    MathOverflow,
    
    #[msg("Only the offer creator can perform this action")]
    Unauthorized,
    
    #[msg("The deadline must be in the future")]
    InvalidDeadline,
}

