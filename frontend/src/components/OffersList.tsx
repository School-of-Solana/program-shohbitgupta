import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { BN } from "@coral-xyz/anchor";
import {
  getAssociatedTokenAddress,
  createAssociatedTokenAccountInstruction,
} from "@solana/spl-token";
import { getProgram, getOfferPda, getVaultPda } from "../utils/anchor";
import {
  RPC_ENDPOINT,
  TOKEN_PROGRAM_ID,
  ASSOCIATED_TOKEN_PROGRAM_ID,
  SYSTEM_PROGRAM_ID,
} from "../utils/constants";
import { parseError } from "../utils/errorHandler";
import { formatAmount } from "../utils/tokenUtils";

interface Offer {
  publicKey: string;
  creator: string;
  offerMint: string;
  requestMint: string;
  offerAmount: string;
  requestAmount: string;
  remainingOfferAmount: string;
  remainingRequestAmount: string;
  deadline: number;
  offerId: number;
}

export const OffersList: React.FC = () => {
  const wallet = useWallet();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");
  const [acceptingOfferId, setAcceptingOfferId] = useState<string | null>(null);
  const [acceptAmounts, setAcceptAmounts] = useState<{ [key: string]: string }>(
    {}
  );

  const fetchOffers = async () => {
    if (!wallet.publicKey) {
      return;
    }

    setLoading(true);
    setStatus("⏳ Loading offers...");

    try {
      const connection = new Connection(RPC_ENDPOINT, "confirmed");
      const program = getProgram(wallet);

      // Fetch all offer accounts
      // @ts-ignore - TypeScript doesn't infer account types from IDL
      const allOffers = await program.account.offer.all();

      const formattedOffers: Offer[] = allOffers.map((offer: any) => ({
        publicKey: offer.publicKey.toString(),
        creator: offer.account.creator.toString(),
        offerMint: offer.account.offerMint.toString(),
        requestMint: offer.account.requestMint.toString(),
        offerAmount: offer.account.offerAmount.toString(),
        requestAmount: offer.account.requestAmount.toString(),
        remainingOfferAmount: offer.account.remainingOfferAmount.toString(),
        remainingRequestAmount: offer.account.remainingRequestAmount.toString(),
        deadline: offer.account.deadline.toNumber(),
        offerId: offer.account.offerId.toNumber(),
      }));

      // Filter only active offers (not fully filled and not expired)
      const now = Date.now() / 1000;
      const activeOffers = formattedOffers.filter(
        (offer) =>
          parseInt(offer.remainingOfferAmount) > 0 && offer.deadline > now
      );

      setOffers(activeOffers);
      setStatus(
        activeOffers.length > 0
          ? `✅ Found ${activeOffers.length} active offer(s)`
          : "No active offers found"
      );
    } catch (error: any) {
      console.error("Error fetching offers:", error);
      setStatus(parseError(error));
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchOffers();

    // Listen for offer created event
    const handleOfferCreated = () => {
      fetchOffers();
    };

    window.addEventListener("offerCreated", handleOfferCreated);

    return () => {
      window.removeEventListener("offerCreated", handleOfferCreated);
    };
  }, [wallet.publicKey]);

  const formatDeadline = (timestamp: number): string => {
    const date = new Date(timestamp * 1000);
    return date.toLocaleString();
  };

  const isExpired = (timestamp: number): boolean => {
    return Date.now() / 1000 > timestamp;
  };

  const handleAcceptOffer = async (offer: Offer) => {
    if (!wallet.publicKey || !wallet.signTransaction) {
      setStatus("❌ Please connect your wallet");
      return;
    }

    const acceptAmount = acceptAmounts[offer.publicKey];
    if (!acceptAmount || parseFloat(acceptAmount) <= 0) {
      setStatus("❌ Please enter a valid amount to accept");
      return;
    }

    try {
      setAcceptingOfferId(offer.publicKey);
      setStatus("⏳ Accepting offer...");

      const connection = new Connection(RPC_ENDPOINT, "confirmed");
      const program = getProgram(wallet);

      const creator = new PublicKey(offer.creator);
      const offerMint = new PublicKey(offer.offerMint);
      const requestMint = new PublicKey(offer.requestMint);
      const offerPda = getOfferPda(creator, offer.offerId);
      const vaultPda = getVaultPda(offerPda);

      // Get token decimals
      const offerMintInfo = await connection.getAccountInfo(offerMint);
      const requestMintInfo = await connection.getAccountInfo(requestMint);

      if (!offerMintInfo || !requestMintInfo) {
        throw new Error("Failed to fetch mint info");
      }

      // Parse decimals (at offset 44 in mint account data)
      const requestDecimals = requestMintInfo.data[44];

      // Convert decimal amount to raw amount
      const requestAmountRaw = new BN(
        Math.floor(parseFloat(acceptAmount) * Math.pow(10, requestDecimals))
      );

      // Get or create token accounts
      const acceptorOfferAta = await getAssociatedTokenAddress(
        offerMint,
        wallet.publicKey
      );
      const acceptorRequestAta = await getAssociatedTokenAddress(
        requestMint,
        wallet.publicKey
      );
      const creatorRequestAta = await getAssociatedTokenAddress(
        requestMint,
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
            offerMint
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
            requestMint
          )
        );
      }

      setStatus("⏳ Building transaction...");

      const txBuilder = program.methods.acceptOffer(requestAmountRaw).accounts({
        offer: offerPda,
        acceptor: wallet.publicKey,
        creator: creator,
        offerMintToken: offerMint,
        requestMintToken: requestMint,
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

      // Clear the accept amount
      setAcceptAmounts((prev) => {
        const newAmounts = { ...prev };
        delete newAmounts[offer.publicKey];
        return newAmounts;
      });

      // Refresh offers list
      setTimeout(() => fetchOffers(), 2000);
    } catch (error: any) {
      console.error("Error accepting offer:", error);
      setStatus(parseError(error));
    } finally {
      setAcceptingOfferId(null);
    }
  };

  return (
    <div className="card">
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
        }}
      >
        <h2>📋 Running Offers</h2>
        <button
          onClick={fetchOffers}
          disabled={loading || !wallet.publicKey}
          style={{ padding: "8px 16px", fontSize: "14px" }}
        >
          {loading ? "⏳ Loading..." : "🔄 Refresh"}
        </button>
      </div>

      {status && (
        <div
          style={{
            marginBottom: "15px",
            padding: "10px",
            background: "#f5f5f5",
            borderRadius: "4px",
          }}
        >
          {status}
        </div>
      )}

      {!wallet.publicKey ? (
        <p style={{ color: "#888" }}>Connect your wallet to view offers</p>
      ) : offers.length === 0 && !loading ? (
        <p style={{ color: "#888" }}>No active offers found</p>
      ) : (
        <div style={{ maxHeight: "500px", overflowY: "auto" }}>
          {offers.map((offer) => (
            <div
              key={offer.publicKey}
              style={{
                border: "1px solid #ddd",
                borderRadius: "8px",
                padding: "15px",
                marginBottom: "10px",
                background: isExpired(offer.deadline) ? "#fff5f5" : "#f9f9f9",
              }}
            >
              <div
                style={{
                  display: "flex",
                  justifyContent: "space-between",
                  marginBottom: "10px",
                }}
              >
                <strong>Offer #{offer.offerId}</strong>
                {isExpired(offer.deadline) && (
                  <span style={{ color: "#ff4444", fontSize: "12px" }}>
                    ⚠️ EXPIRED
                  </span>
                )}
              </div>

              <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                <div>
                  <strong>Creator:</strong>{" "}
                  <span style={{ fontFamily: "monospace", fontSize: "12px" }}>
                    {offer.creator.substring(0, 8)}...
                    {offer.creator.substring(offer.creator.length - 8)}
                  </span>
                </div>
                <div>
                  <strong>Offering:</strong> {offer.remainingOfferAmount} (of{" "}
                  {offer.offerAmount})
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "11px",
                    color: "#666",
                  }}
                >
                  Mint: {offer.offerMint.substring(0, 20)}...
                </div>
                <div style={{ marginTop: "8px" }}>
                  <strong>Requesting:</strong> {offer.requestAmount}
                </div>
                <div
                  style={{
                    fontFamily: "monospace",
                    fontSize: "11px",
                    color: "#666",
                  }}
                >
                  Mint: {offer.requestMint.substring(0, 20)}...
                </div>
                <div style={{ marginTop: "8px" }}>
                  <strong>Deadline:</strong> {formatDeadline(offer.deadline)}
                </div>
              </div>

              <div
                style={{ marginTop: "10px", fontSize: "11px", color: "#888" }}
              >
                PDA: {offer.publicKey.substring(0, 20)}...
              </div>

              {/* Accept Offer Section */}
              {wallet.publicKey &&
                offer.creator !== wallet.publicKey.toString() && (
                  <div
                    style={{
                      marginTop: "15px",
                      padding: "10px",
                      background: "#f0f8ff",
                      borderRadius: "4px",
                      border: "1px solid #4CAF50",
                    }}
                  >
                    <div style={{ marginBottom: "8px", fontWeight: "bold" }}>
                      🤝 Accept This Offer
                    </div>
                    <div style={{ display: "flex", gap: "8px" }}>
                      <input
                        type="number"
                        placeholder="Amount (decimals allowed)"
                        value={acceptAmounts[offer.publicKey] || ""}
                        onChange={(e) =>
                          setAcceptAmounts((prev) => ({
                            ...prev,
                            [offer.publicKey]: e.target.value,
                          }))
                        }
                        style={{
                          flex: 1,
                          padding: "8px",
                          fontSize: "12px",
                          borderRadius: "4px",
                          border: "1px solid #ddd",
                        }}
                        disabled={acceptingOfferId === offer.publicKey}
                      />
                      <button
                        onClick={() => handleAcceptOffer(offer)}
                        disabled={
                          acceptingOfferId === offer.publicKey || loading
                        }
                        style={{
                          padding: "8px 16px",
                          fontSize: "12px",
                          background: "#4CAF50",
                          color: "white",
                          border: "none",
                          borderRadius: "4px",
                          cursor:
                            acceptingOfferId === offer.publicKey
                              ? "not-allowed"
                              : "pointer",
                        }}
                      >
                        {acceptingOfferId === offer.publicKey ? "⏳" : "Accept"}
                      </button>
                    </div>
                    <div
                      style={{
                        fontSize: "10px",
                        color: "#666",
                        marginTop: "4px",
                      }}
                    >
                      Max: {offer.remainingRequestAmount} (raw amount)
                    </div>
                  </div>
                )}
            </div>
          ))}
        </div>
      )}
    </div>
  );
};
