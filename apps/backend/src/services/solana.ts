import * as anchor from "@coral-xyz/anchor";
import { Connection, Keypair, PublicKey } from "@solana/web3.js";
import { IDL } from "../types/evidence_registry";

const RPC_URL = process.env.SOLANA_RPC_URL || "https://api.devnet.solana.com";
const PROGRAM_ID = new PublicKey(process.env.PROGRAM_ID || "AnUPkBodvjwk4XZorYm8MtgJ9jy9E9VzJwG8GJfTvYnS");

// Load the service keypair (Authority that pays for gas)
const privateKeyArray = JSON.parse(process.env.SOLANA_PRIVATE_KEY || "[]");
const serviceKeypair = Keypair.fromSecretKey(Uint8Array.from(privateKeyArray));

const connection = new Connection(RPC_URL, "confirmed");
const wallet = new anchor.Wallet(serviceKeypair);
const provider = new anchor.AnchorProvider(connection, wallet, { preflightCommitment: "confirmed" });
const program = new anchor.Program(IDL as any, provider);

export async function anchorEvidenceOnChain(
  sha256Hash: string,
  ipfsCid: string,
  incidentId: string,
  latitude: number,
  longitude: number,
  witnessWallet: string
) {
  try {
    const hashBytes = Buffer.from(sha256Hash, "hex");
    if (hashBytes.length !== 32) throw new Error("Invalid SHA256 hash length");

    // Convert lat/lon to micro-degrees for i64 storage
    const latInt = BigInt(Math.floor(latitude * 1000000));
    const lonInt = BigInt(Math.floor(longitude * 1000000));

    const witnessPubkey = new PublicKey(witnessWallet);

    // PDA for the evidence
    const [evidencePda] = PublicKey.findProgramAddressSync(
      [
        Buffer.from("evidence"),
        witnessPubkey.toBuffer(),
        Buffer.from(incidentId.slice(0, 8)),
      ],
      PROGRAM_ID
    );

    // PDA for the witness profile
    const [profilePda] = PublicKey.findProgramAddressSync(
      [Buffer.from("profile"), witnessPubkey.toBuffer()],
      PROGRAM_ID
    );

    console.log(`[solana] Service anchoring evidence for ${witnessWallet.slice(0, 8)}...`);

    const tx = await (program.methods as any)
      .submitEvidence(
        Array.from(hashBytes),
        ipfsCid,
        incidentId,
        new anchor.BN(latInt.toString()),
        new anchor.BN(lonInt.toString())
      )
      .accounts({
        evidenceRecord: evidencePda,
        witnessProfile: profilePda,
        witness: witnessPubkey,
        authority: serviceKeypair.publicKey,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .signers([serviceKeypair])
      .rpc();

    console.log(`[solana] Anchored on-chain! Tx: ${tx}`);
    return tx;
  } catch (err: any) {
    console.error("[solana] Service anchoring failed:", err.message);
    return null;
  }
}
