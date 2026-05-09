import { Connection, PublicKey } from "@solana/web3.js";

export const SOLANA_RPC_URL =
  process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";

export const PROGRAM_ID =
  process.env.PROGRAM_ID && process.env.PROGRAM_ID !== "REPLACE_WITH_DEPLOYED_PROGRAM_ID"
    ? new PublicKey(process.env.PROGRAM_ID)
    : null;

export const connection = new Connection(SOLANA_RPC_URL, "confirmed");
