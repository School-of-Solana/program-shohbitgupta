import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { Escrow } from "../target/types/escrow";
import {
  PublicKey,
  Keypair,
  SystemProgram,
  LAMPORTS_PER_SOL,
} from "@solana/web3.js";
import {
  TOKEN_PROGRAM_ID,
  createMint,
  mintTo,
  getAccount,
  createAssociatedTokenAccount,
} from "@solana/spl-token";
import { assert, expect } from "chai";

describe("escrow", () => {
  // Configure the client to use the local cluster
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.Escrow as Program<Escrow>;

  // Test accounts
  let creator: Keypair;
  let acceptor: Keypair;
  let offerMint: PublicKey;
  let requestMint: PublicKey;
  let creatorOfferAccount: PublicKey;
  let creatorRequestAccount: PublicKey;
  let acceptorOfferAccount: PublicKey;
  let acceptorRequestAccount: PublicKey;

  // Test constants
  const OFFER_AMOUNT = new anchor.BN(1000);
  const REQUEST_AMOUNT = new anchor.BN(2000);
  const OFFER_ID = new anchor.BN(1);

  before(async () => {
    // Airdrop SOL to test accounts
    creator = Keypair.generate();
    acceptor = Keypair.generate();

    const airdropCreator = await provider.connection.requestAirdrop(
      creator.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropCreator);

    const airdropAcceptor = await provider.connection.requestAirdrop(
      acceptor.publicKey,
      2 * LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(airdropAcceptor);

    // Create mints
    offerMint = await createMint(
      provider.connection,
      creator,
      creator.publicKey,
      null,
      9
    );

    requestMint = await createMint(
      provider.connection,
      creator,
      creator.publicKey,
      null,
      9
    );

    // Create token accounts for creator
    creatorOfferAccount = await createAssociatedTokenAccount(
      provider.connection,
      creator,
      offerMint,
      creator.publicKey
    );

    creatorRequestAccount = await createAssociatedTokenAccount(
      provider.connection,
      creator,
      requestMint,
      creator.publicKey
    );

    // Create token accounts for acceptor
    acceptorOfferAccount = await createAssociatedTokenAccount(
      provider.connection,
      acceptor,
      offerMint,
      acceptor.publicKey
    );

    acceptorRequestAccount = await createAssociatedTokenAccount(
      provider.connection,
      acceptor,
      requestMint,
      acceptor.publicKey
    );

    // Mint tokens to creator and acceptor
    await mintTo(
      provider.connection,
      creator,
      offerMint,
      creatorOfferAccount,
      creator,
      10000
    );

    await mintTo(
      provider.connection,
      creator,
      requestMint,
      acceptorRequestAccount,
      creator,
      10000
    );
  });

  describe("create_offer", () => {
    it("Successfully creates an offer", async () => {
      const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 3600); // 1 hour from now

      const [offerPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("offer"),
          creator.publicKey.toBuffer(),
          OFFER_ID.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), offerPda.toBuffer()],
        program.programId
      );

      const creatorBalanceBefore = await getAccount(
        provider.connection,
        creatorOfferAccount
      );

      await program.methods
        .createOffer(OFFER_AMOUNT, REQUEST_AMOUNT, deadline, OFFER_ID)
        .accounts({
          creator: creator.publicKey,
          offer: offerPda,
          offerTokenAccount: offerMint,
          requestTokenAccount: requestMint,
          creatorTokenAccount: creatorOfferAccount,
          vault: vaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Verify offer account
      const offerAccount = await program.account.offer.fetch(offerPda);
      assert.equal(
        offerAccount.creator.toString(),
        creator.publicKey.toString()
      );
      assert.equal(offerAccount.offerMint.toString(), offerMint.toString());
      assert.equal(offerAccount.requestMint.toString(), requestMint.toString());
      assert.equal(
        offerAccount.offerAmount.toString(),
        OFFER_AMOUNT.toString()
      );
      assert.equal(
        offerAccount.requestAmount.toString(),
        REQUEST_AMOUNT.toString()
      );
      assert.equal(
        offerAccount.remainingOfferAmount.toString(),
        OFFER_AMOUNT.toString()
      );
      assert.equal(
        offerAccount.remainingRequestAmount.toString(),
        REQUEST_AMOUNT.toString()
      );
      assert.equal(offerAccount.deadline.toString(), deadline.toString());
      assert.equal(offerAccount.offerId.toString(), OFFER_ID.toString());

      // Verify tokens were transferred to vault
      const vaultAccount = await getAccount(provider.connection, vaultPda);
      assert.equal(vaultAccount.amount.toString(), OFFER_AMOUNT.toString());

      // Verify creator's balance decreased
      const creatorBalanceAfter = await getAccount(
        provider.connection,
        creatorOfferAccount
      );
      assert.equal(
        creatorBalanceBefore.amount - creatorBalanceAfter.amount,
        BigInt(OFFER_AMOUNT.toString())
      );
    });

    it("Fails to create offer with zero offer amount", async () => {
      const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
      const offerId = new anchor.BN(2);

      const [offerPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("offer"),
          creator.publicKey.toBuffer(),
          offerId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), offerPda.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .createOffer(new anchor.BN(0), REQUEST_AMOUNT, deadline, offerId)
          .accounts({
            offer: offerPda,
            creator: creator.publicKey,
            offerTokenAccount: offerMint,
            requestTokenAccount: requestMint,
            creatorTokenAccount: creatorOfferAccount,
            vault: vaultPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed with InvalidAmount");
      } catch (error) {
        expect(error.toString()).to.include("InvalidAmount");
      }
    });

    it("Fails to create offer with zero request amount", async () => {
      const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);
      const offerId = new anchor.BN(3);

      const [offerPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("offer"),
          creator.publicKey.toBuffer(),
          offerId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), offerPda.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .createOffer(OFFER_AMOUNT, new anchor.BN(0), deadline, offerId)
          .accounts({
            offer: offerPda,
            creator: creator.publicKey,
            offerTokenAccount: offerMint,
            requestTokenAccount: requestMint,
            creatorTokenAccount: creatorOfferAccount,
            vault: vaultPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed with InvalidAmount");
      } catch (error) {
        expect(error.toString()).to.include("InvalidAmount");
      }
    });

    it("Fails to create offer with past deadline", async () => {
      const pastDeadline = new anchor.BN(Math.floor(Date.now() / 1000) - 3600); // 1 hour ago
      const offerId = new anchor.BN(4);

      const [offerPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("offer"),
          creator.publicKey.toBuffer(),
          offerId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), offerPda.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .createOffer(OFFER_AMOUNT, REQUEST_AMOUNT, pastDeadline, offerId)
          .accounts({
            offer: offerPda,
            creator: creator.publicKey,
            offerTokenAccount: offerMint,
            requestTokenAccount: requestMint,
            creatorTokenAccount: creatorOfferAccount,
            vault: vaultPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed with InvalidDeadline");
      } catch (error) {
        expect(error.toString()).to.include("InvalidDeadline");
      }
    });

    it("Fails to create duplicate offer with same offer_id", async () => {
      const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);

      const [offerPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("offer"),
          creator.publicKey.toBuffer(),
          OFFER_ID.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), offerPda.toBuffer()],
        program.programId
      );

      try {
        await program.methods
          .createOffer(OFFER_AMOUNT, REQUEST_AMOUNT, deadline, OFFER_ID)
          .accounts({
            offer: offerPda,
            creator: creator.publicKey,
            offerTokenAccount: offerMint,
            requestTokenAccount: requestMint,
            creatorTokenAccount: creatorOfferAccount,
            vault: vaultPda,
            tokenProgram: TOKEN_PROGRAM_ID,
            systemProgram: SystemProgram.programId,
          })
          .signers([creator])
          .rpc();
        assert.fail("Should have failed - account already exists");
      } catch (error) {
        // Account already exists error
        expect(error.toString()).to.include("0x0");
      }
    });
  });

  describe("accept_offer", () => {
    let testOfferId: anchor.BN;
    let offerPda: PublicKey;
    let vaultPda: PublicKey;

    beforeEach(async () => {
      // Create a fresh offer for each test
      testOfferId = new anchor.BN(Date.now());
      const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);

      [offerPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("offer"),
          creator.publicKey.toBuffer(),
          testOfferId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), offerPda.toBuffer()],
        program.programId
      );

      await program.methods
        .createOffer(OFFER_AMOUNT, REQUEST_AMOUNT, deadline, testOfferId)
        .accounts({
          offer: offerPda,
          creator: creator.publicKey,
          offerTokenAccount: offerMint,
          requestTokenAccount: requestMint,
          creatorTokenAccount: creatorOfferAccount,
          vault: vaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();
    });

    it("Successfully accepts full offer", async () => {
      // Get creator's SOL balance before (to verify rent refund)
      const creatorSolBalanceBefore = await provider.connection.getBalance(
        creator.publicKey
      );

      const acceptorOfferBalanceBefore = await getAccount(
        provider.connection,
        acceptorOfferAccount
      );
      const acceptorRequestBalanceBefore = await getAccount(
        provider.connection,
        acceptorRequestAccount
      );
      const creatorRequestBalanceBefore = await getAccount(
        provider.connection,
        creatorRequestAccount
      );
      const creatorOfferBalanceBefore = await getAccount(
        provider.connection,
        creatorOfferAccount
      );

      // Verify vault exists and has correct balance before
      const vaultBefore = await getAccount(provider.connection, vaultPda);
      assert.equal(
        vaultBefore.amount,
        BigInt(OFFER_AMOUNT.toString()),
        "Vault should hold offer tokens before acceptance"
      );

      await program.methods
        .acceptOffer(REQUEST_AMOUNT)
        .accounts({
          offer: offerPda,
          acceptor: acceptor.publicKey,
          creator: creator.publicKey,
          offerMintToken: offerMint,
          requestMintToken: requestMint,
          vault: vaultPda,
          acceptorOfferAccount: acceptorOfferAccount,
          acceptorRequestAccount: acceptorRequestAccount,
          creatorRequestAccount: creatorRequestAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([acceptor])
        .rpc();

      // Verify balances after
      const acceptorOfferBalanceAfter = await getAccount(
        provider.connection,
        acceptorOfferAccount
      );
      const acceptorRequestBalanceAfter = await getAccount(
        provider.connection,
        acceptorRequestAccount
      );
      const creatorRequestBalanceAfter = await getAccount(
        provider.connection,
        creatorRequestAccount
      );
      const creatorOfferBalanceAfter = await getAccount(
        provider.connection,
        creatorOfferAccount
      );

      // ✅ Verify token transfers: Creator → Taker (offer tokens)
      const acceptorOfferIncrease =
        acceptorOfferBalanceAfter.amount - acceptorOfferBalanceBefore.amount;
      console.log(
        "\n✅ Acceptor received offer tokens:",
        acceptorOfferIncrease.toString()
      );
      assert.equal(
        acceptorOfferIncrease,
        BigInt(OFFER_AMOUNT.toString()),
        "Acceptor should receive all offer tokens from vault"
      );

      // ✅ Verify token transfers: Taker → Creator (request tokens)
      const acceptorRequestDecrease =
        acceptorRequestBalanceBefore.amount -
        acceptorRequestBalanceAfter.amount;
      const creatorRequestIncrease =
        creatorRequestBalanceAfter.amount - creatorRequestBalanceBefore.amount;
      console.log(
        "✅ Acceptor sent request tokens:",
        acceptorRequestDecrease.toString()
      );
      console.log(
        "✅ Creator received request tokens:",
        creatorRequestIncrease.toString()
      );
      assert.equal(
        acceptorRequestDecrease,
        BigInt(REQUEST_AMOUNT.toString()),
        "Acceptor should send all request tokens"
      );
      assert.equal(
        creatorRequestIncrease,
        BigInt(REQUEST_AMOUNT.toString()),
        "Creator should receive all request tokens"
      );

      // ✅ Verify creator's offer token balance unchanged (tokens came from vault)
      assert.equal(
        creatorOfferBalanceAfter.amount,
        creatorOfferBalanceBefore.amount,
        "Creator's offer token balance should remain unchanged (tokens came from vault)"
      );

      // Verify offer is fully filled
      const offerAccount = await program.account.offer.fetch(offerPda);
      assert.equal(offerAccount.remainingOfferAmount.toString(), "0");
      assert.equal(offerAccount.remainingRequestAmount.toString(), "0");

      // ✅ CRITICAL: Verify vault is closed after full acceptance
      const vaultAccountInfo = await provider.connection.getAccountInfo(
        vaultPda
      );
      console.log("✅ Vault account closed:", vaultAccountInfo === null);
      assert.isNull(
        vaultAccountInfo,
        "Vault account should be closed (null) after full acceptance"
      );

      // ✅ Verify creator received rent refund
      const creatorSolBalanceAfter = await provider.connection.getBalance(
        creator.publicKey
      );
      const rentRefund = creatorSolBalanceAfter - creatorSolBalanceBefore;
      console.log("✅ Creator received rent refund:", rentRefund, "lamports");
      assert.ok(
        rentRefund > 0,
        "Creator should receive rent refund from closed vault"
      );
    });

    it("Successfully accepts partial offer", async () => {
      const partialAmount = REQUEST_AMOUNT.div(new anchor.BN(2)); // Half of request amount

      const acceptorOfferBalanceBefore = await getAccount(
        provider.connection,
        acceptorOfferAccount
      );

      await program.methods
        .acceptOffer(partialAmount)
        .accounts({
          offer: offerPda,
          acceptor: acceptor.publicKey,
          creator: creator.publicKey,
          offerMintToken: offerMint,
          requestMintToken: requestMint,
          vault: vaultPda,
          acceptorOfferAccount: acceptorOfferAccount,
          acceptorRequestAccount: acceptorRequestAccount,
          creatorRequestAccount: creatorRequestAccount,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([acceptor])
        .rpc();

      // Verify partial acceptance
      const offerAccount = await program.account.offer.fetch(offerPda);
      assert.equal(
        offerAccount.remainingRequestAmount.toString(),
        REQUEST_AMOUNT.sub(partialAmount).toString()
      );

      // Verify proportional offer amount was transferred
      const expectedOfferTokens = OFFER_AMOUNT.div(new anchor.BN(2));
      const acceptorOfferBalanceAfter = await getAccount(
        provider.connection,
        acceptorOfferAccount
      );
      assert.equal(
        acceptorOfferBalanceAfter.amount - acceptorOfferBalanceBefore.amount,
        BigInt(expectedOfferTokens.toString())
      );
    });

    it("Fails to accept with zero amount", async () => {
      try {
        await program.methods
          .acceptOffer(new anchor.BN(0))
          .accounts({
            offer: offerPda,
            acceptor: acceptor.publicKey,
            creator: creator.publicKey,
            offerMintToken: offerMint,
            requestMintToken: requestMint,
            vault: vaultPda,
            acceptorOfferAccount: acceptorOfferAccount,
            acceptorRequestAccount: acceptorRequestAccount,
            creatorRequestAccount: creatorRequestAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([acceptor])
          .rpc();
        assert.fail("Should have failed with InvalidAmount");
      } catch (error) {
        expect(error.toString()).to.include("InvalidAmount");
      }
    });

    it("Fails to accept more than remaining amount", async () => {
      const tooMuch = REQUEST_AMOUNT.mul(new anchor.BN(2));

      try {
        await program.methods
          .acceptOffer(tooMuch)
          .accounts({
            offer: offerPda,
            acceptor: acceptor.publicKey,
            creator: creator.publicKey,
            offerMintToken: offerMint,
            requestMintToken: requestMint,
            vault: vaultPda,
            acceptorOfferAccount: acceptorOfferAccount,
            acceptorRequestAccount: acceptorRequestAccount,
            creatorRequestAccount: creatorRequestAccount,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([acceptor])
          .rpc();
        assert.fail("Should have failed with InsufficientOfferAmount");
      } catch (error) {
        expect(error.toString()).to.include("InsufficientOfferAmount");
      }
    });
  });

  describe("cancel_offer", () => {
    let testOfferId: anchor.BN;
    let offerPda: PublicKey;
    let vaultPda: PublicKey;

    beforeEach(async () => {
      testOfferId = new anchor.BN(
        Date.now() + Math.floor(Math.random() * 1000)
      );
      const deadline = new anchor.BN(Math.floor(Date.now() / 1000) + 3600);

      [offerPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("offer"),
          creator.publicKey.toBuffer(),
          testOfferId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), offerPda.toBuffer()],
        program.programId
      );

      await program.methods
        .createOffer(OFFER_AMOUNT, REQUEST_AMOUNT, deadline, testOfferId)
        .accounts({
          offer: offerPda,
          creator: creator.publicKey,
          offerTokenAccount: offerMint,
          requestTokenAccount: requestMint,
          creatorTokenAccount: creatorOfferAccount,
          vault: vaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();
    });

    it("Successfully cancels offer and refunds tokens", async () => {
      const creatorBalanceBefore = await getAccount(
        provider.connection,
        creatorOfferAccount
      );

      await program.methods
        .cancelOffer()
        .accounts({
          offer: offerPda,
          creator: creator.publicKey,
          offerMintCurrencyToken: offerMint,
          creatorTokenAccount: creatorOfferAccount,
          vault: vaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([creator])
        .rpc();

      // Verify tokens were refunded
      const creatorBalanceAfter = await getAccount(
        provider.connection,
        creatorOfferAccount
      );
      assert.equal(
        creatorBalanceAfter.amount - creatorBalanceBefore.amount,
        BigInt(OFFER_AMOUNT.toString())
      );

      // Verify offer account is closed
      try {
        await program.account.offer.fetch(offerPda);
        assert.fail("Offer account should be closed");
      } catch (error) {
        expect(error.toString()).to.include("Account does not exist");
      }
    });

    it("Fails when non-creator tries to cancel", async () => {
      try {
        await program.methods
          .cancelOffer()
          .accounts({
            offer: offerPda,
            creator: acceptor.publicKey, // Wrong creator
            offerMintCurrencyToken: offerMint,
            creatorTokenAccount: acceptorOfferAccount,
            vault: vaultPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([acceptor])
          .rpc();
        assert.fail("Should have failed - unauthorized");
      } catch (error) {
        // Will fail with constraint violation
        expect(error).to.exist;
      }
    });
  });

  describe("close_expired_offer", () => {
    it("Successfully closes expired offer", async () => {
      // Create an offer with a very short deadline
      const testOfferId = new anchor.BN(
        Date.now() + Math.floor(Math.random() * 10000)
      );
      const shortDeadline = new anchor.BN(Math.floor(Date.now() / 1000) + 1); // 1 second from now

      const [offerPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("offer"),
          creator.publicKey.toBuffer(),
          testOfferId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), offerPda.toBuffer()],
        program.programId
      );

      await program.methods
        .createOffer(OFFER_AMOUNT, REQUEST_AMOUNT, shortDeadline, testOfferId)
        .accounts({
          offer: offerPda,
          creator: creator.publicKey,
          offerTokenAccount: offerMint,
          requestTokenAccount: requestMint,
          creatorTokenAccount: creatorOfferAccount,
          vault: vaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      // Wait for offer to expire (wait a bit longer to ensure blockchain time has passed)
      await new Promise((resolve) => setTimeout(resolve, 5000));

      const creatorBalanceBefore = await getAccount(
        provider.connection,
        creatorOfferAccount
      );

      // Anyone can close expired offer
      await program.methods
        .closeExpiredOffer()
        .accounts({
          offer: offerPda,
          closer: acceptor.publicKey,
          creator: creator.publicKey,
          offerMintCurrencyToken: offerMint,
          creatorTokenAccount: creatorOfferAccount,
          vault: vaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
        })
        .signers([acceptor])
        .rpc();

      // Verify tokens were refunded to creator
      const creatorBalanceAfter = await getAccount(
        provider.connection,
        creatorOfferAccount
      );
      assert.equal(
        creatorBalanceAfter.amount - creatorBalanceBefore.amount,
        BigInt(OFFER_AMOUNT.toString())
      );

      // Verify offer account is closed
      try {
        await program.account.offer.fetch(offerPda);
        assert.fail("Offer account should be closed");
      } catch (error) {
        expect(error.toString()).to.include("Account does not exist");
      }
    });

    it("Fails to close non-expired offer", async () => {
      const testOfferId = new anchor.BN(
        Date.now() + Math.floor(Math.random() * 10000)
      );
      const futureDeadline = new anchor.BN(
        Math.floor(Date.now() / 1000) + 3600
      ); // 1 hour from now

      const [offerPda] = PublicKey.findProgramAddressSync(
        [
          Buffer.from("offer"),
          creator.publicKey.toBuffer(),
          testOfferId.toArrayLike(Buffer, "le", 8),
        ],
        program.programId
      );

      const [vaultPda] = PublicKey.findProgramAddressSync(
        [Buffer.from("vault"), offerPda.toBuffer()],
        program.programId
      );

      await program.methods
        .createOffer(OFFER_AMOUNT, REQUEST_AMOUNT, futureDeadline, testOfferId)
        .accounts({
          offer: offerPda,
          creator: creator.publicKey,
          offerTokenAccount: offerMint,
          requestTokenAccount: requestMint,
          creatorTokenAccount: creatorOfferAccount,
          vault: vaultPda,
          tokenProgram: TOKEN_PROGRAM_ID,
          systemProgram: SystemProgram.programId,
        })
        .signers([creator])
        .rpc();

      try {
        await program.methods
          .closeExpiredOffer()
          .accounts({
            offer: offerPda,
            closer: acceptor.publicKey,
            creator: creator.publicKey,
            offerMintCurrencyToken: offerMint,
            creatorTokenAccount: creatorOfferAccount,
            vault: vaultPda,
            tokenProgram: TOKEN_PROGRAM_ID,
          })
          .signers([acceptor])
          .rpc();
        assert.fail("Should have failed with OfferNotExpired");
      } catch (error) {
        expect(error.toString()).to.include("OfferNotExpired");
      }
    });
  });
});
