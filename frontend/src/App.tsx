import React, { useState } from "react";
import { WalletMultiButton } from "@solana/wallet-adapter-react-ui";
import { CreateOffer } from "./components/CreateOffer";
import { AcceptOffer } from "./components/AcceptOffer";
import { CancelOffer } from "./components/CancelOffer";
import { CloseExpiredOffer } from "./components/CloseExpiredOffer";
import { OffersList } from "./components/OffersList";
import "./App.css";

type Tab = "create" | "accept" | "cancel" | "close";

function App() {
  const [activeTab, setActiveTab] = useState<Tab>("create");

  return (
    <div className="App">
      <header className="App-header">
        <h1>🔄 Solana Escrow DApp</h1>
        <p>Token Swap Marketplace</p>
        <WalletMultiButton />
      </header>

      <div className="tabs">
        <button
          className={activeTab === "create" ? "active" : ""}
          onClick={() => setActiveTab("create")}
        >
          Create Offer
        </button>
        <button
          className={activeTab === "accept" ? "active" : ""}
          onClick={() => setActiveTab("accept")}
        >
          Accept Offer
        </button>
        <button
          className={activeTab === "cancel" ? "active" : ""}
          onClick={() => setActiveTab("cancel")}
        >
          Cancel Offer
        </button>
        <button
          className={activeTab === "close" ? "active" : ""}
          onClick={() => setActiveTab("close")}
        >
          Close Expired
        </button>
      </div>

      <main className="main-content">
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "1fr 1fr",
            gap: "20px",
            maxWidth: "1400px",
            margin: "0 auto",
          }}
        >
          <div>
            {activeTab === "create" && <CreateOffer />}
            {activeTab === "accept" && <AcceptOffer />}
            {activeTab === "cancel" && <CancelOffer />}
            {activeTab === "close" && <CloseExpiredOffer />}
          </div>
          <div>
            <OffersList />
          </div>
        </div>
      </main>

      <footer className="footer">
        <div className="info-section">
          <h3>ℹ️ How to Use</h3>
          <div className="info-grid">
            <div className="info-card">
              <h4>1. Create Offer</h4>
              <p>
                Create a token swap offer by specifying the tokens you want to
                trade and the amounts.
              </p>
            </div>
            <div className="info-card">
              <h4>2. Accept Offer</h4>
              <p>
                Browse and accept offers from other users. You can accept
                partial amounts.
              </p>
            </div>
            <div className="info-card">
              <h4>3. Cancel Offer</h4>
              <p>Cancel your own offers and get your tokens back.</p>
            </div>
            <div className="info-card">
              <h4>4. Close Expired</h4>
              <p>Close expired offers to help creators reclaim their tokens.</p>
            </div>
          </div>
        </div>

        <div className="features">
          <h3>✨ Features</h3>
          <ul>
            <li>✅ Atomic token swaps</li>
            <li>✅ Partial offer acceptance</li>
            <li>✅ Deadline-based expiration</li>
            <li>✅ Vault auto-closure on full acceptance</li>
            <li>✅ Rent refund to creator</li>
            <li>✅ Event logging</li>
          </ul>
        </div>

        <p className="copyright">
          Built with ❤️ using Anchor Framework | Ackee School of Solana
        </p>
      </footer>
    </div>
  );
}

export default App;
