import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { getProgram, getOfferPda, getVaultPda } from "../utils/anchor";
import { TOKEN_PROGRAM_ID, RPC_ENDPOINT } from "../utils/constants";
import { parseError } from "../utils/errorHandler";

export const AcceptOffer: React.FC = () => {
  const wallet = useWallet();
  const [creatorAddress, setCreatorAddress] = useState("");
  const [offerId, setOfferId] = useState("");
  const [requestAmount, setRequestAmount] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [offerDetails, setOfferDetails] = useState<any>(null);

  const fetchOfferDetails = async () => {
    if (!creatorAddress || !offerId) {
      setStatus("Please enter creator address and offer ID");
      return;
    }

    try {
      setLoading(true);
      setStatus("Fetching offer details...");

      const program = getProgram(wallet);
      const creator = new PublicKey(creatorAddress);
      const offerIdNum = parseInt(offerId);
      const offerPda = getOfferPda(creator, offerIdNum);

      // @ts-ignore - TypeScript doesn't infer account types from IDL
      const offer = await program.account.offer.fetch(offerPda);
      setOfferDetails({
        ...offer,
        offerPda: offerPda.toString(),
      });
      setStatus("✅ Offer found!");
    } catch (error: any) {
      console.error("Error fetching offer:", error);
      setStatus(`❌ Error: ${error.message}`);
      setOfferDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const handleAcceptOffer = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setStatus("❌ Please connect your wallet");
      return;
    }

    if (!offerDetails) {
      setStatus("❌ Please fetch offer details first");
      return;
    }

    if (!requestAmount || parseFloat(requestAmount) <= 0) {
      setStatus("❌ Please enter a valid amount");
      return;
    }

    try {
      setLoading(true);
      setStatus("⏳ Accepting offer...");

      const connection = new Connection(RPC_ENDPOINT, "confirmed");
      const program = getProgram(wallet);
      const creator = new PublicKey(creatorAddress);
      const offerIdNum = parseInt(offerId);
      const offerPda = getOfferPda(creator, offerIdNum);
      const vaultPda = getVaultPda(offerPda);

      // Get token decimals
      const requestMintInfo = await connection.getAccountInfo(
        offerDetails.requestMint
      );
      if (!requestMintInfo) {
        throw new Error("Failed to fetch request mint info");
      }

      // Parse decimals (at offset 44 in mint account data)
      const requestDecimals = requestMintInfo.data[44];

      // Convert decimal amount to raw amount
      const requestAmountRaw = new BN(
        Math.floor(parseFloat(requestAmount) * Math.pow(10, requestDecimals))
      );

      setStatus("⏳ Preparing token accounts...");

      // Get token accounts
      const acceptorOfferAta = await getAssociatedTokenAddress(
        offerDetails.offerMint,
        wallet.publicKey
      );
      const acceptorRequestAta = await getAssociatedTokenAddress(
        offerDetails.requestMint,
        wallet.publicKey
      );
      const creatorRequestAta = await getAssociatedTokenAddress(
        offerDetails.requestMint,
        creator
      );

      // Check if accounts exist and create if needed
      const preInstructions = [];
      const acceptorOfferAccount = await connection.getAccountInfo(
        acceptorOfferAta
      );
      if (!acceptorOfferAccount) {
        preInstructions.push(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            acceptorOfferAta,
            wallet.publicKey,
            offerDetails.offerMint
          )
        );
      }

      const acceptorRequestAccount = await connection.getAccountInfo(
        acceptorRequestAta
      );
      if (!acceptorRequestAccount) {
        preInstructions.push(
          createAssociatedTokenAccountInstruction(
            wallet.publicKey,
            acceptorRequestAta,
            wallet.publicKey,
            offerDetails.requestMint
          )
        );
      }

      setStatus("⏳ Building transaction...");

      const txBuilder = program.methods.acceptOffer(requestAmountRaw).accounts({
        offer: offerPda,
        acceptor: wallet.publicKey,
        creator: creator,
        offerMintToken: offerDetails.offerMint,
        requestMintToken: offerDetails.requestMint,
        vault: vaultPda,
        acceptorOfferAccount: acceptorOfferAta,
        acceptorRequestAccount: acceptorRequestAta,
        creatorRequestAccount: creatorRequestAta,
        tokenProgram: TOKEN_PROGRAM_ID,
      });

      if (preInstructions.length > 0) {
        txBuilder.preInstructions(preInstructions);
      }

      setStatus("⏳ Sending transaction...");
      const tx = await txBuilder.rpc();

      setStatus(
        `✅ Offer accepted successfully! TX: ${tx.substring(0, 20)}...`
      );
      setRequestAmount("");

      // Refresh offer details
      setTimeout(() => fetchOfferDetails(), 2000);
    } catch (error: any) {
      console.error("Error accepting offer:", error);
      setStatus(parseError(error));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>🤝 Accept Offer</h2>
      <div className="form-group">
        <label>Creator Address:</label>
        <input
          type="text"
          placeholder="Creator's wallet address"
          value={creatorAddress}
          onChange={(e) => setCreatorAddress(e.target.value)}
        />
      </div>
      <div className="form-group">
        <label>Offer ID:</label>
        <input
          type="number"
          placeholder="Offer ID"
          value={offerId}
          onChange={(e) => setOfferId(e.target.value)}
        />
      </div>
      <button onClick={fetchOfferDetails} disabled={loading}>
        {loading ? "Fetching..." : "Fetch Offer"}
      </button>

      {offerDetails && (
        <div className="offer-details">
          <h3>Offer Details</h3>
          <p>
            <strong>Offer Mint:</strong> {offerDetails.offerMint.toString()}
          </p>
          <p>
            <strong>Request Mint:</strong> {offerDetails.requestMint.toString()}
          </p>
          <p>
            <strong>Remaining Offer:</strong>{" "}
            {offerDetails.remainingOfferAmount.toString()}
          </p>
          <p>
            <strong>Remaining Request:</strong>{" "}
            {offerDetails.remainingRequestAmount.toString()}
          </p>
          <p>
            <strong>Deadline:</strong>{" "}
            {new Date(offerDetails.deadline.toNumber() * 1000).toLocaleString()}
          </p>

          <div className="form-group">
            <label>Request Amount to Accept (decimals allowed):</label>
            <input
              type="number"
              step="any"
              placeholder="e.g., 50 or 0.5"
              value={requestAmount}
              onChange={(e) => setRequestAmount(e.target.value)}
            />
            <small style={{ color: "#666", fontSize: "12px" }}>
              Max raw amount: {offerDetails.remainingRequestAmount.toString()}
            </small>
          </div>
          <button onClick={handleAcceptOffer} disabled={loading}>
            {loading ? "Accepting..." : "Accept Offer"}
          </button>
        </div>
      )}

      {status && <div className="status">{status}</div>}
    </div>
  );
};
