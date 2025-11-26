import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { getProgram, getOfferPda, getVaultPda } from "../utils/anchor";
import { TOKEN_PROGRAM_ID } from "../utils/constants";

export const CancelOffer: React.FC = () => {
  const wallet = useWallet();
  const [offerId, setOfferId] = useState("");
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [offerDetails, setOfferDetails] = useState<any>(null);

  const fetchOfferDetails = async () => {
    if (!wallet.publicKey || !offerId) {
      setStatus("Please connect wallet and enter offer ID");
      return;
    }

    try {
      setLoading(true);
      setStatus("Fetching offer details...");

      const program = getProgram(wallet);
      const offerIdNum = parseInt(offerId);
      const offerPda = getOfferPda(wallet.publicKey, offerIdNum);

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

  const handleCancelOffer = async () => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setStatus("Please connect your wallet");
      return;
    }

    if (!offerDetails) {
      setStatus("Please fetch offer details first");
      return;
    }

    try {
      setLoading(true);
      setStatus("Cancelling offer...");

      const program = getProgram(wallet);
      const offerIdNum = parseInt(offerId);
      const offerPda = getOfferPda(wallet.publicKey, offerIdNum);
      const vaultPda = getVaultPda(offerPda);

      // Get creator's token account
      const creatorTokenAccount = await getAssociatedTokenAddress(
        offerDetails.offerMint,
        wallet.publicKey
      );

      const tx = await program.methods
        .cancelOffer()
        .accounts({
          creator: wallet.publicKey,
          offer: offerPda,
          offerMintCurrencyToken: offerDetails.offerMint,
          creatorTokenAccount: creatorTokenAccount,
          vault: vaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      setStatus(`✅ Offer cancelled! Transaction: ${tx}`);
      setOfferDetails(null);
    } catch (error: any) {
      console.error("Error cancelling offer:", error);
      setStatus(`❌ Error: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="card">
      <h2>❌ Cancel Offer</h2>
      <div className="form-group">
        <label>Offer ID:</label>
        <input
          type="number"
          placeholder="Your offer ID to cancel"
          value={offerId}
          onChange={(e) => setOfferId(e.target.value)}
        />
      </div>
      <button onClick={fetchOfferDetails} disabled={loading}>
        {loading ? "Fetching..." : "Fetch My Offer"}
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

          <button onClick={handleCancelOffer} disabled={loading}>
            {loading ? "Cancelling..." : "Cancel Offer"}
          </button>
        </div>
      )}

      {status && <div className="status">{status}</div>}
    </div>
  );
};
