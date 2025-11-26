import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey, Connection } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
  getAccount,
} from "@solana/spl-token";
import { getProgram, getOfferPda, getVaultPda } from "../utils/anchor";
import {
  TOKEN_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  RPC_ENDPOINT,
} from "../utils/constants";
import { parseError } from "../utils/errorHandler";
import { getTokenDecimals, toRawAmount } from "../utils/tokenUtils";

export const CreateOffer: React.FC = () => {
  const wallet = useWallet();
  const [offerMint, setOfferMint] = useState("");
  const [requestMint, setRequestMint] = useState("");
  const [offerAmount, setOfferAmount] = useState("");
  const [requestAmount, setRequestAmount] = useState("");
  const [deadline, setDeadline] = useState("");
  const [offerId, setOfferId] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

  // const handleCreateOffer = async () => {
  //   if (!wallet.publicKey || !wallet.signTransaction) {
  //     setStatus("❌ Please connect your wallet");
  //     return;
  //   }

  //   // Validate inputs
  //   if (!offerMint.trim()) {
  //     setStatus("❌ Please enter Offer Token Mint address");
  //     return;
  //   }
  //   if (!requestMint.trim()) {
  //     setStatus("❌ Please enter Request Token Mint address");
  //     return;
  //   }
  //   if (!offerAmount.trim()) {
  //     setStatus("❌ Please enter Offer Amount");
  //     return;
  //   }
  //   if (!requestAmount.trim()) {
  //     setStatus("❌ Please enter Request Amount");
  //     return;
  //   }
  //   if (!deadline.trim()) {
  //     setStatus("❌ Error: Please enter Deadline");
  //     return;
  //   }
  //   if (!offerId.trim()) {
  //     setStatus("❌ Error: Please enter Offer ID");
  //     return;
  //   }

  //   try {
  //     setLoading(true);
  //     setStatus("Creating offer...");

  //     const connection = new Connection(RPC_ENDPOINT, "confirmed");
  //     const program = getProgram(wallet);

  //     // Trim whitespace and validate PublicKeys
  //     console.log("Offer Mint:", offerMint.trim());
  //     console.log("Request Mint:", requestMint.trim());
  //     console.log("Offer Amount:", offerAmount.trim());
  //     console.log("Request Amount:", requestAmount.trim());
  //     console.log("Deadline:", deadline.trim());
  //     console.log("Offer ID:", offerId.trim());

  //     const offerMintPubkey = new PublicKey(offerMint.trim());
  //     const requestMintPubkey = new PublicKey(requestMint.trim());
  //     const offerIdNum = parseInt(offerId.trim());

  //     if (isNaN(offerIdNum) || offerIdNum < 0) {
  //       setStatus("❌ Error: Invalid offer ID");
  //       setLoading(false);
  //       return;
  //     }

  //     // Validate amounts are valid numbers
  //     const offerAmountNum = parseFloat(offerAmount.trim());
  //     const requestAmountNum = parseFloat(requestAmount.trim());

  //     if (isNaN(offerAmountNum) || offerAmountNum <= 0) {
  //       setStatus("❌ Invalid offer amount");
  //       setLoading(false);
  //       return;
  //     }

  //     if (isNaN(requestAmountNum) || requestAmountNum <= 0) {
  //       setStatus("❌ Invalid request amount");
  //       setLoading(false);
  //       return;
  //     }

  //     // Fetch token decimals and convert amounts automatically
  //     setStatus("⏳ Fetching token information...");
  //     const offerDecimals = await getTokenDecimals(connection, offerMintPubkey);
  //     const requestDecimals = await getTokenDecimals(
  //       connection,
  //       requestMintPubkey
  //     );

  //     // Convert UI amounts to raw amounts
  //     const offerAmountRaw = toRawAmount(offerAmount.trim(), offerDecimals);
  //     const requestAmountRaw = toRawAmount(
  //       requestAmount.trim(),
  //       requestDecimals
  //     );

  //     // Get PDAs
  //     const offerPda = getOfferPda(wallet.publicKey, offerIdNum);
  //     const vaultPda = getVaultPda(offerPda);

  //     // Get creator's token account address
  //     const creatorTokenAccount = await getAssociatedTokenAddress(
  //       offerMintPubkey,
  //       wallet.publicKey
  //     );

  //     // Check if token account exists, if not, create it
  //     setStatus("Checking token account...");
  //     let accountExists = true;
  //     try {
  //       await getAccount(connection, creatorTokenAccount);
  //       setStatus("Token account found ✅");
  //     } catch (error) {
  //       accountExists = false;
  //       setStatus("Token account not found. Creating it automatically...");
  //     }

  //     // Convert deadline to Unix timestamp
  //     const deadlineDate = new Date(deadline.trim());
  //     if (isNaN(deadlineDate.getTime())) {
  //       setStatus("❌ Error: Invalid deadline format");
  //       setLoading(false);
  //       return;
  //     }
  //     const deadlineTimestamp = new BN(
  //       Math.floor(deadlineDate.getTime() / 1000)
  //     );

  //     // Build the transaction
  //     setStatus("⏳ Building transaction...");

  //     const offerAmountBN = new BN(offerAmountRaw);
  //     const requestAmountBN = new BN(requestAmountRaw);

  //     const txBuilder = program.methods
  //       .createOffer(
  //         offerAmountBN,
  //         requestAmountBN,
  //         deadlineTimestamp,
  //         new BN(offerIdNum)
  //       )
  //       .accounts({
  //         creator: wallet.publicKey,
  //         offerTokenAccount: offerMintPubkey,
  //         requestTokenAccount: requestMintPubkey,
  //         creatorTokenAccount: creatorTokenAccount,
  //         offer: offerPda,
  //         vault: vaultPda,
  //         tokenProgram: TOKEN_PROGRAM_ID,
  //         systemProgram: SYSTEM_PROGRAM_ID,
  //         associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
  //       });

  //     // If account doesn't exist, add instruction to create it
  //     if (!accountExists) {
  //       const createAtaIx = createAssociatedTokenAccountInstruction(
  //         wallet.publicKey, // payer
  //         creatorTokenAccount, // ata
  //         wallet.publicKey, // owner
  //         offerMintPubkey // mint
  //       );
  //       txBuilder.preInstructions([createAtaIx]);
  //       setStatus("⏳ Creating token account and offer...");
  //     } else {
  //       setStatus("⏳ Sending transaction...");
  //     }

  //     const tx = await txBuilder.rpc();

  //     setStatus(`✅ Offer created successfully! TX: ${tx.substring(0, 20)}...`);

  //     // Clear form
  //     setOfferMint("");
  //     setRequestMint("");
  //     setOfferAmount("");
  //     setRequestAmount("");
  //     setDeadline("");
  //     setOfferId("");

  //     // Trigger a refresh of offers list (we'll implement this next)
  //     window.dispatchEvent(new Event("offerCreated"));
  //   } catch (error: any) {
  //     console.error("Error creating offer:", error);
  //     setStatus(parseError(error));
  //   } finally {
  //     setLoading(false);
  //   }
  // };

  const handleCreateOffer = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setStatus("❌ Please connect your wallet");
      return;
    }

    if (!offerMint.trim() || !requestMint.trim()) {
      setStatus("❌ Please enter all mint addresses");
      return;
    }
    if (!offerAmount.trim() || !requestAmount.trim()) {
      setStatus("❌ Please enter token amounts");
      return;
    }
    if (!deadline.trim()) {
      setStatus("❌ Please enter deadline");
      return;
    }
    if (!offerId.trim()) {
      setStatus("❌ Please enter Offer ID");
      return;
    }

    try {
      setLoading(true);
      setStatus("Creating offer...");

      const connection = new Connection(RPC_ENDPOINT, "confirmed");
      const program = getProgram(wallet);

      // Convert inputs
      const offerMintPubkey = new PublicKey(offerMint.trim());
      const requestMintPubkey = new PublicKey(requestMint.trim());
      const offerIdNum = parseInt(offerId.trim());
      const offerAmountFloat = parseFloat(offerAmount.trim());
      const requestAmountFloat = parseFloat(requestAmount.trim());

      if (isNaN(offerAmountFloat) || offerAmountFloat <= 0) {
        setStatus("❌ Invalid offer amount");
        return;
      }
      if (isNaN(requestAmountFloat) || requestAmountFloat <= 0) {
        setStatus("❌ Invalid request amount");
        return;
      }

      setStatus("⏳ Fetching token info...");
      const offerDecimals = await getTokenDecimals(connection, offerMintPubkey);
      const requestDecimals = await getTokenDecimals(
        connection,
        requestMintPubkey
      );

      const offerAmountRaw = new BN(
        toRawAmount(offerAmountFloat, offerDecimals)
      );
      const requestAmountRaw = new BN(
        toRawAmount(requestAmountFloat, requestDecimals)
      );

      // PDAs
      const offerPda = getOfferPda(wallet.publicKey, offerIdNum);
      const vaultPda = getVaultPda(offerPda);

      // ========== 🟢 Ensure ATA for Offer Mint =================
      const creatorOfferAta = await getAssociatedTokenAddress(
        offerMintPubkey,
        wallet.publicKey
      );

      let preInstructions: any[] = [];
      try {
        await getAccount(connection, creatorOfferAta);
      } catch {
        preInstructions.push(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            creatorOfferAta,
            wallet.publicKey,
            offerMintPubkey
          )
        );
      }

      // ========== 🔵 Ensure ATA for Request Mint ================
      const creatorRequestAta = await getAssociatedTokenAddress(
        requestMintPubkey,
        wallet.publicKey
      );

      try {
        await getAccount(connection, creatorRequestAta);
      } catch {
        preInstructions.push(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            creatorRequestAta,
            wallet.publicKey,
            requestMintPubkey
          )
        );
      }

      // ========== 🔥 Deadline conversion =========================
      const deadlineTimestamp = new BN(
        Math.floor(new Date(deadline.trim()).getTime() / 1000)
      );

      setStatus("⏳ Building transaction...");

      const txBuilder = program.methods
        .createOffer(
          offerAmountRaw,
          requestAmountRaw,
          deadlineTimestamp,
          new BN(offerIdNum)
        )
        .accounts({
          creator: wallet.publicKey,

          // 🟢 CORRECT TOKEN ACCOUNTS
          offerTokenAccount: creatorOfferAta,
          requestTokenAccount: creatorRequestAta,
          creatorTokenAccount: creatorOfferAta,

          // PDAs
          offer: offerPda,
          vault: vaultPda,

          // Programs
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SYSTEM_PROGRAM_ID,
          associatedTokenProgram: ASSOCIATED_TOKEN_PROGRAM_ID,
        });

      if (preInstructions.length > 0) {
        txBuilder.preInstructions(preInstructions);
      }

      const tx = await txBuilder.rpc();

      setStatus(`✅ Offer created successfully! TX: ${tx.substring(0, 16)}...`);

      // reset
      setOfferMint("");
      setRequestMint("");
      setOfferAmount("");
      setRequestAmount("");
      setDeadline("");
      setOfferId("");

      window.dispatchEvent(new Event("offerCreated"));
    } catch (error: any) {
      console.error(error);
      setStatus(parseError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>🎯 Create Offer</h2>
      <div className="form-group">
        <label>Offer Token Mint:</label>
        <input
          type="text"
          placeholder="Token mint address you're offering"
          value={offerMint}
          onChange={(e) => setOfferMint(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Offer Amount:</label>
        <input
          type="number"
          step="any"
          placeholder="e.g., 0.5 (decimals allowed)"
          value={offerAmount}
          onChange={(e) => setOfferAmount(e.target.value)}
        />
        <small style={{ color: "#888", fontSize: "12px" }}>
          Enter decimal values (e.g., 0.5 SOL or 100 tokens)
        </small>
      </div>
      <div className="form-group">
        <label>Request Token Mint:</label>
        <input
          type="text"
          placeholder="Token mint address you want"
          value={requestMint}
          onChange={(e) => setRequestMint(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Request Amount:</label>
        <input
          type="number"
          step="any"
          placeholder="e.g., 100 (decimals allowed)"
          value={requestAmount}
          onChange={(e) => setRequestAmount(e.target.value)}
        />
        <small style={{ color: "#888", fontSize: "12px" }}>
          Enter decimal values (e.g., 0.5 SOL or 100 tokens)
        </small>
      </div>
      <div className="form-group">
        <label>Deadline:</label>
        <input
          type="datetime-local"
          value={deadline}
          onChange={(e) => setDeadline(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Offer ID:</label>
        <input
          type="number"
          placeholder="Unique offer ID (e.g., 1, 2, 3...)"
          value={offerId}
          onChange={(e) => setOfferId(e.target.value)}
        />
      </div>
      <button onClick={handleCreateOffer} disabled={loading}>
        {loading ? "Creating..." : "Create Offer"}
      </button>
      {status && <div className="status">{status}</div>}
    </div>
  );
};
