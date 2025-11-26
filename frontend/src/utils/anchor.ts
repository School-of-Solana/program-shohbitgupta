import { AnchorProvider, Program } from "@coral-xyz/anchor";
import { Connection, PublicKey } from "@solana/web3.js";
import { PROGRAM_ID, RPC_ENDPOINT } from "./constants";
import idl from "../idl/escrow.json";

export const getProgram = (wallet: any) => {
  const connection = new Connection(RPC_ENDPOINT, "confirmed");
  const provider = new AnchorProvider(connection, wallet, {
    commitment: "confirmed",
  });

  // The new @coral-xyz/anchor supports the new IDL format natively
  return new Program(idl as any, provider);
};

export const getOfferPda = (creator: PublicKey, offerId: number) => {
  const [offerPda] = PublicKey.findProgramAddressSync(
    [
      Buffer.from("offer"),
      creator.toBuffer(),
      Buffer.from(new Uint8Array(new BigUint64Array([BigInt(offerId)]).buffer)),
    ],
    PROGRAM_ID
  );
  return offerPda;
};

export const getVaultPda = (offerPda: PublicKey) => {
  const [vaultPda] = PublicKey.findProgramAddressSync(
    [Buffer.from("vault"), offerPda.toBuffer()],
    PROGRAM_ID
  );
  return vaultPda;
};
