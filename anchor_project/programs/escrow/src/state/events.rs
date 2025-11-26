use anchor_lang::prelude::*;

/// Event emitted when a new offer is created
#[event]
pub struct OfferCreated {
    /// The public key of the offer account
    pub offer: Pubkey,
    
    /// The creator of the offer
    pub creator: Pubkey,
    
    /// The mint of the token being offered
    pub offer_mint: Pubkey,
    
    /// The mint of the token being requested
    pub request_mint: Pubkey,
    
    /// The amount of tokens being offered
    pub offer_amount: u64,
    
    /// The amount of tokens being requested
    pub request_amount: u64,
    
    /// The deadline timestamp
    pub deadline: i64,
    
    /// Unique offer ID
    pub offer_id: u64,
}

/// Event emitted when an offer is accepted (fully or partially)
#[event]
pub struct OfferAccepted {
    /// The public key of the offer account
    pub offer: Pubkey,
    
    /// The acceptor of the offer
    pub acceptor: Pubkey,
    
    /// The amount of offer tokens transferred
    pub offer_tokens_transferred: u64,
    
    /// The amount of request tokens received
    pub request_tokens_received: u64,
    
    /// The remaining offer amount after this acceptance
    pub remaining_offer_amount: u64,
    
    /// The remaining request amount after this acceptance
    pub remaining_request_amount: u64,
    
    /// Whether this was a full acceptance
    pub is_full_acceptance: bool,
}

/// Event emitted when an offer is cancelled by the creator
#[event]
pub struct OfferCancelled {
    /// The public key of the offer account
    pub offer: Pubkey,
    
    /// The creator who cancelled the offer
    pub creator: Pubkey,
    
    /// The amount of tokens refunded
    pub refunded_amount: u64,
}

/// Event emitted when an expired offer is closed
#[event]
pub struct OfferClosed {
    /// The public key of the offer account
    pub offer: Pubkey,
    
    /// The creator who received the refund
    pub creator: Pubkey,
    
    /// The amount of tokens refunded
    pub refunded_amount: u64,
    
    /// The person who closed the offer
    pub closer: Pubkey,
}

