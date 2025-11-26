import { PublicKey } from "@solana/web3.js";

// Program ID from your deployed escrow program
export const PROGRAM_ID = new PublicKey(
  "HTk3g5v5CUai7MXF3r87jAMDjpGH6oXFJQCRYf4GFrv9"
);

// Token Program ID
export const TOKEN_PROGRAM_ID = new PublicKey(
  "TokenkegQfeZyiNwAJbNbGKPFXCWuBvf9Ss623VQ5DA"
);

// System Program ID
export const SYSTEM_PROGRAM_ID = new PublicKey(
  "11111111111111111111111111111111"
);

// Associated Token Program ID
export const ASSOCIATED_TOKEN_PROGRAM_ID = new PublicKey(
  "ATokenGPvbdGVxr1b2hvZbsiqW5xWH25efTNsLJA8knL"
);

// RPC Endpoint (use devnet for testing)
export const RPC_ENDPOINT = "https://api.devnet.solana.com";
