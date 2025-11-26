import React, { useState, useEffect } from "react";
import { useWallet } from "@solana/wallet-adapter-react";
import { Connection, PublicKey } from "@solana/web3.js";
import { getProgram } from "../utils/anchor";
import { RPC_ENDPOINT } from "../utils/constants";
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
  deadline: number;
  offerId: number;
  isActive: boolean;
}

export const OffersList: React.FC = () => {
  const wallet = useWallet();
  const [offers, setOffers] = useState<Offer[]>([]);
  const [loading, setLoading] = useState(false);
  const [status, setStatus] = useState("");

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
        deadline: offer.account.deadline.toNumber(),
        offerId: offer.account.offerId.toNumber(),
        isActive: offer.account.isActive,
      }));

      // Filter only active offers
      const activeOffers = formattedOffers.filter((offer) => offer.isActive);

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

  return (
    <div className="card">
      <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
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
        <div style={{ marginBottom: "15px", padding: "10px", background: "#f5f5f5", borderRadius: "4px" }}>
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
              <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "10px" }}>
                <strong>Offer #{offer.offerId}</strong>
                {isExpired(offer.deadline) && (
                  <span style={{ color: "#ff4444", fontSize: "12px" }}>⚠️ EXPIRED</span>
                )}
              </div>

              <div style={{ fontSize: "14px", lineHeight: "1.6" }}>
                <div>
                  <strong>Creator:</strong>{" "}
                  <span style={{ fontFamily: "monospace", fontSize: "12px" }}>
                    {offer.creator.substring(0, 8)}...{offer.creator.substring(offer.creator.length - 8)}
                  </span>
                </div>
                <div>
                  <strong>Offering:</strong> {offer.remainingOfferAmount} (of {offer.offerAmount})
                </div>
                <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#666" }}>
                  Mint: {offer.offerMint.substring(0, 20)}...
                </div>
                <div style={{ marginTop: "8px" }}>
                  <strong>Requesting:</strong> {offer.requestAmount}
                </div>
                <div style={{ fontFamily: "monospace", fontSize: "11px", color: "#666" }}>
                  Mint: {offer.requestMint.substring(0, 20)}...
                </div>
                <div style={{ marginTop: "8px" }}>
                  <strong>Deadline:</strong> {formatDeadline(offer.deadline)}
                </div>
              </div>

              <div style={{ marginTop: "10px", fontSize: "11px", color: "#888" }}>
                PDA: {offer.publicKey.substring(0, 20)}...
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

