/**
 * Parse Solana/Anchor errors and return user-friendly messages
 */
export const parseError = (error: any): string => {
  const errorString = error?.toString() || "";
  const errorMessage = error?.message || "";

  // Insufficient balance errors
  if (
    errorString.includes("insufficient funds") ||
    errorString.includes("insufficient lamports") ||
    errorMessage.includes("insufficient funds")
  ) {
    return "❌ Insufficient balance. Please make sure you have enough SOL and tokens in your wallet.";
  }

  // Account not found errors
  if (
    errorString.includes("Account not found") ||
    errorString.includes("AccountNotFound") ||
    errorMessage.includes("could not find account")
  ) {
    return "❌ Token account not found. Please make sure you have a token account for this token.";
  }

  // Invalid account errors
  if (
    errorString.includes("invalid account data") ||
    errorMessage.includes("invalid account data")
  ) {
    return "❌ Invalid account data. Please check your token addresses.";
  }

  // User rejected transaction
  if (
    errorString.includes("User rejected") ||
    errorMessage.includes("User rejected")
  ) {
    return "❌ Transaction cancelled by user.";
  }

  // Program ID mismatch
  if (
    errorString.includes("DeclaredProgramIdMismatch") ||
    errorMessage.includes("DeclaredProgramIdMismatch")
  ) {
    return "❌ Program ID mismatch. Please refresh the page and try again.";
  }

  // Custom program errors
  if (errorString.includes("custom program error")) {
    // Try to extract error code
    const match = errorString.match(/custom program error: (0x[0-9a-fA-F]+)/);
    if (match) {
      const errorCode = match[1];
      return `❌ Transaction failed with error code ${errorCode}. Please check your inputs.`;
    }
    return "❌ Transaction failed. Please check your inputs and try again.";
  }

  // Anchor errors
  if (errorString.includes("AnchorError")) {
    // Extract error message if available
    const anchorMatch = errorString.match(/Error Message: (.+?)(?:\.|$)/);
    if (anchorMatch) {
      return `❌ ${anchorMatch[1]}`;
    }
    return "❌ Transaction failed. Please check your inputs.";
  }

  // Simulation failed
  if (
    errorString.includes("Transaction simulation failed") ||
    errorMessage.includes("simulation failed")
  ) {
    return "❌ Transaction simulation failed. Please check your inputs and balances.";
  }

  // Blockhash not found (network issue)
  if (
    errorString.includes("Blockhash not found") ||
    errorMessage.includes("Blockhash not found")
  ) {
    return "❌ Network error. Please try again in a few seconds.";
  }

  // Timeout errors
  if (errorString.includes("timeout") || errorMessage.includes("timeout")) {
    return "❌ Transaction timed out. Please check Solana Explorer to see if it was confirmed.";
  }

  // Generic fallback
  if (errorMessage) {
    return `❌ Error: ${errorMessage}`;
  }

  return `❌ Transaction failed: ${errorString.substring(0, 100)}`;
};

/**
 * Format SOL amount for display
 */
export const formatSOL = (lamports: number): string => {
  return (lamports / 1e9).toFixed(4);
};

/**
 * Format token amount for display
 */
export const formatTokenAmount = (amount: number, decimals: number): string => {
  return (amount / Math.pow(10, decimals)).toLocaleString(undefined, {
    minimumFractionDigits: 0,
    maximumFractionDigits: decimals,
  });
};

