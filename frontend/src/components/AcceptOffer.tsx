import React, { useState } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import { getAssociatedTokenAddress } from "@solana/spl-token";
import { getProgram, getOfferPda, getVaultPda } from "../utils/anchor";
import { TOKEN_PROGRAM_ID } from "../utils/constants";

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
      setStatus("Please connect your wallet");
      return;
    }

    if (!offerDetails) {
      setStatus("Please fetch offer details first");
      return;
    }

    try {
      setLoading(true);
      setStatus("Accepting offer...");

      const program = getProgram(wallet);
      const creator = new PublicKey(creatorAddress);
      const offerIdNum = parseInt(offerId);
      const offerPda = getOfferPda(creator, offerIdNum);
      const vaultPda = getVaultPda(offerPda);

      // Get token accounts
      const acceptorOfferAccount = await getAssociatedTokenAddress(
        offerDetails.offerMint,
        wallet.publicKey
      );
      const acceptorRequestAccount = await getAssociatedTokenAddress(
        offerDetails.requestMint,
        wallet.publicKey
      );
      const creatorRequestAccount = await getAssociatedTokenAddress(
        offerDetails.requestMint,
        creator
      );

      const tx = await program.methods
        .acceptOffer(new BN(requestAmount))
        .accounts({
          offer: offerPda,
          acceptor: wallet.publicKey,
          creator: creator,
          offerMintToken: offerDetails.offerMint,
          requestMintToken: offerDetails.requestMint,
          vault: vaultPda,
          acceptorOfferAccount: acceptorOfferAccount,
          acceptorRequestAccount: acceptorRequestAccount,
          creatorRequestAccount: creatorRequestAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .rpc();

      setStatus(`✅ Offer accepted! Transaction: ${tx}`);
      // Refresh offer details
      await fetchOfferDetails();
    } catch (error: any) {
      console.error("Error accepting offer:", error);
      setStatus(`❌ Error: ${error.message}`);
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
            <label>Request Amount to Accept:</label>
            <input
              type="number"
              placeholder="Amount to accept"
              value={requestAmount}
              onChange={(e) => setRequestAmount(e.target.value)}
              max={offerDetails.remainingRequestAmount.toString()}
            />
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
