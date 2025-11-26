import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { getProgram, getOfferPda, getVaultPda } from "../utils/anchor";
import { TOKEN_PROGRAM_ID } from "../utils/constants";

export const CloseExpiredOffer: React.FC = () => {
  const wallet = useWallet();
  const [creatorAddress, setCreatorAddress] = useState("");
  const [offerId, setOfferId] = useState("");
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
      const isExpired = Date.now() / 1000 > offer.deadline.toNumber();

      setOfferDetails({
        ...offer,
        offerPda: offerPda.toString(),
        isExpired,
      });
      setStatus(
        isExpired
          ? "✅ Offer found and is expired!"
          : "⚠️ Offer found but not expired yet"
      );
    } catch (error: any) {
      console.error("Error fetching offer:", error);
      setStatus(`❌ Error: ${error.message}`);
      setOfferDetails(null);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseExpiredOffer = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setStatus("Please connect your wallet");
      return;
    }

    if (!offerDetails) {
      setStatus("Please fetch offer details first");
      return;
    }

    if (!offerDetails.isExpired) {
      setStatus("❌ Offer is not expired yet!");
      return;
    }

    try {
      setLoading(true);
      setStatus("Closing expired offer...");

      const program = getProgram(wallet);
      const creator = new PublicKey(creatorAddress);
      const offerIdNum = parseInt(offerId);
      const offerPda = getOfferPda(creator, offerIdNum);
      const vaultPda = getVaultPda(offerPda);

      // Get creator's token account
      const creatorTokenAccount = await getAssociatedTokenAddress(
        offerDetails.offerMint,
        creator
      );

      const tx = await program.methods
        .closeExpiredOffer()
        .accounts({
          closer: wallet.publicKey,
          creator: creator,
          offer: offerPda,
          offerMintCurrencyToken: offerDetails.offerMint,
          creatorTokenAccount: creatorTokenAccount,
          vault: vaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      setStatus(`✅ Expired offer closed! Transaction: ${tx}`);
      setOfferDetails(null);
    } catch (error: any) {
      console.error("Error closing expired offer:", error);
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>⏰ Close Expired Offer</h2>
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
            <strong>Deadline:</strong>{" "}
            {new Date(offerDetails.deadline.toNumber() * 1000).toLocaleString()}
          </p>
          <p>
            <strong>Status:</strong>{" "}
            {offerDetails.isExpired ? (
              <span style={{ color: "red" }}>EXPIRED ⏰</span>
            ) : (
              <span style={{ color: "green" }}>ACTIVE ✅</span>
            )}
          </p>

          <button
            onClick={handleCloseExpiredOffer}
            disabled={loading || !offerDetails.isExpired}
          >
            {loading ? "Closing..." : "Close Expired Offer"}
          </button>
        </div>
      )}

      {status && <div className="status">{status}</div>}
    </div>
  );
};
