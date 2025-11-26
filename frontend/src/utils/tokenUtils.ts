import { Connection, PublicKey } from "@solana/web3.js";
import { getMint } from "@solana/spl-token";
import { BN } from "@coral-xyz/anchor";

/**
 * Fetch token decimals from the blockchain
 */
export const getTokenDecimals = async (
  connection: Connection,
  mintAddress: PublicKey
): Promise<number> => {
  try {
    const mintInfo = await getMint(connection, mintAddress);
    return mintInfo.decimals;
  } catch (error) {
    console.error("Error fetching token decimals:", error);
    // Default to 9 decimals (SOL standard) if we can't fetch
    return 9;
  }
};

/**
 * Convert UI amount to raw amount (with decimals)
 * Example: 0.5 SOL with 9 decimals -> 500000000
 */
// export const toRawAmount = (uiAmount: string, decimals: number): string => {
//   const amount = parseFloat(uiAmount);
//   if (isNaN(amount)) {
//     throw new Error("Invalid amount");
//   }
//   const rawAmount = Math.floor(amount * Math.pow(10, decimals));
//   return rawAmount.toString();
// };
export const toRawAmount = (amountFloat: number, decimals: number): string => {
  if (typeof amountFloat !== "number" || isNaN(amountFloat)) {
    throw new Error(`Invalid amount: ${amountFloat}`);
  }
  if (amountFloat < 0) {
    throw new Error("Amount cannot be negative");
  }

  // multiplier = 10^decimals
  const multiplier = new BN(10).pow(new BN(decimals));

  // Convert using string to avoid JS float precision issues
  const amountString = (amountFloat * Math.pow(10, decimals)).toFixed(0);

  return new BN(amountString);
};

/**
 * Convert raw amount to UI amount
 * Example: 500000000 with 9 decimals -> 0.5
 */
export const toUIAmount = (rawAmount: string, decimals: number): string => {
  const amount = parseFloat(rawAmount);
  if (isNaN(amount)) {
    return "0";
  }
  return (amount / Math.pow(10, decimals)).toString();
};

/**
 * Format amount for display
 */
export const formatAmount = (amount: string, decimals: number): string => {
  const uiAmount = toUIAmount(amount, decimals);
  const num = parseFloat(uiAmount);
  return num.toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};
