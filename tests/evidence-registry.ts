import * as anchor from "@coral-xyz/anchor";
import { Program, web3, BN } from "@coral-xyz/anchor";
import { EvidenceRegistry } from "../target/types/evidence_registry";
import { assert, expect } from "chai";
import * as crypto from "crypto";

const { SystemProgram, Keypair, PublicKey } = web3;

// ─────────────────────────────────────────────
//  Helper utilities
// ─────────────────────────────────────────────

function sha256(data: string): Buffer {
  return crypto.createHash("sha256").update(data).digest();
}

function mockCid(n: number = 1): string {
  return `QmWitnessChainTestCID${n}xxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxxx`.slice(0, 46);
}

function mockIncidentId(): string {
  return "550e8400-e29b-41d4-a716-446655440000";
}

async function getPda(
  seeds: Buffer[],
  programId: PublicKey
): Promise<[PublicKey, number]> {
  return PublicKey.findProgramAddressSync(seeds, programId);
}

// ─────────────────────────────────────────────
//  Test suite
// ─────────────────────────────────────────────

describe("WitnessChain — evidence-registry", () => {
  const provider = anchor.AnchorProvider.env();
  anchor.setProvider(provider);

  const program = anchor.workspace.EvidenceRegistry as Program<EvidenceRegistry>;
  const wallet = provider.wallet as anchor.Wallet;

  const incidentId = mockIncidentId();
  const cid = mockCid(1);
  const hashBytes = Array.from(sha256("test-video-content"));
  const latitude = 129716000; // 12.9716 * 1e7
  const longitude = 775946000; // 77.5946 * 1e7

  let evidencePda: PublicKey;
  let profilePda: PublicKey;

  before(async () => {
    [evidencePda] = await getPda(
      [
        Buffer.from("evidence"),
        wallet.publicKey.toBuffer(),
        Buffer.from(incidentId),
      ],
      program.programId
    );

    [profilePda] = await getPda(
      [Buffer.from("profile"), wallet.publicKey.toBuffer()],
      program.programId
    );
  });

  // ── 1. Submit Evidence ──────────────────────────────────────────

  it("submits evidence and creates PDA", async () => {
    const tx = await program.methods
      .submitEvidence(
        hashBytes,
        cid,
        incidentId,
        new BN(latitude),
        new BN(longitude)
      )
      .accounts({
        evidenceRecord: evidencePda,
        witnessProfile: profilePda,
        witness: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    console.log("submit_evidence tx:", tx);

    const record = await program.account.evidenceRecord.fetch(evidencePda);
    assert.equal(record.witness.toBase58(), wallet.publicKey.toBase58());
    assert.equal(record.ipfsCid, cid);
    assert.equal(record.incidentId, incidentId);
    assert.equal(record.latitude.toNumber(), latitude);
    assert.equal(record.longitude.toNumber(), longitude);
    assert.equal(record.corroborationCount, 1);
    assert.deepEqual(record.status, { pending: {} });
  });

  it("rejects duplicate submission from same wallet", async () => {
    try {
      await program.methods
        .submitEvidence(
          hashBytes,
          cid,
          incidentId,
          new BN(latitude),
          new BN(longitude)
        )
        .accounts({
          evidenceRecord: evidencePda,
          witnessProfile: profilePda,
          witness: wallet.publicKey,
          systemProgram: SystemProgram.programId,
        })
        .rpc();
      assert.fail("Should have thrown on duplicate submission");
    } catch (e: any) {
      // Account already exists — expected
      expect(e.message).to.match(/already in use|0x0/);
    }
  });

  // ── 2. Corroborate Evidence ─────────────────────────────────────

  it("corroborates evidence from a second witness", async () => {
    const corroborator = Keypair.generate();

    // Airdrop SOL to corroborator
    const sig = await provider.connection.requestAirdrop(
      corroborator.publicKey,
      2 * web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    const tx = await program.methods
      .corroborateEvidence(incidentId)
      .accounts({
        evidenceRecord: evidencePda,
        originalWitness: wallet.publicKey,
        corroborator: corroborator.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([corroborator])
      .rpc();

    console.log("corroborate_evidence tx:", tx);

    const record = await program.account.evidenceRecord.fetch(evidencePda);
    assert.equal(record.corroborationCount, 2);
    assert.deepEqual(record.status, { pending: {} }); // still below threshold
  });

  it("auto-confirms at corroboration threshold (3)", async () => {
    const thirdWitness = Keypair.generate();
    const sig = await provider.connection.requestAirdrop(
      thirdWitness.publicKey,
      2 * web3.LAMPORTS_PER_SOL
    );
    await provider.connection.confirmTransaction(sig);

    await program.methods
      .corroborateEvidence(incidentId)
      .accounts({
        evidenceRecord: evidencePda,
        originalWitness: wallet.publicKey,
        corroborator: thirdWitness.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .signers([thirdWitness])
      .rpc();

    const record = await program.account.evidenceRecord.fetch(evidencePda);
    assert.equal(record.corroborationCount, 3);
    assert.deepEqual(record.status, { confirmed: {} });
  });

  // ── 3. Flag Evidence ────────────────────────────────────────────

  it("flags evidence as manipulated", async () => {
    // Create a fresh evidence record to flag
    const flagIncidentId = "ffffffff-ffff-ffff-ffff-ffffffffffff";
    const [flagPda] = await getPda(
      [
        Buffer.from("evidence"),
        wallet.publicKey.toBuffer(),
        Buffer.from(flagIncidentId),
      ],
      program.programId
    );
    const [flagProfilePda] = await getPda(
      [Buffer.from("profile"), wallet.publicKey.toBuffer()],
      program.programId
    );

    await program.methods
      .submitEvidence(
        Array.from(sha256("flaggable-video")),
        mockCid(2),
        flagIncidentId,
        new BN(latitude),
        new BN(longitude)
      )
      .accounts({
        evidenceRecord: flagPda,
        witnessProfile: flagProfilePda,
        witness: wallet.publicKey,
        systemProgram: SystemProgram.programId,
      })
      .rpc();

    await program.methods
      .flagEvidence(flagIncidentId, "AI-generated content detected")
      .accounts({
        evidenceRecord: flagPda,
        evidenceOwner: wallet.publicKey,
        authority: wallet.publicKey,
      })
      .rpc();

    const record = await program.account.evidenceRecord.fetch(flagPda);
    assert.deepEqual(record.status, { flagged: {} });
  });

  // ── 4. Export Evidence ──────────────────────────────────────────

  it("exports evidence (emits event)", async () => {
    const tx = await program.methods
      .exportEvidence(incidentId)
      .accounts({
        evidenceRecord: evidencePda,
        evidenceOwner: wallet.publicKey,
        exporter: wallet.publicKey,
      })
      .rpc();

    console.log("export_evidence tx:", tx);
    // Success = event emitted on-chain, readable by indexers
  });

  // ── 5. Witness Score ────────────────────────────────────────────

  it("updates witness score", async () => {
    await program.methods
      .updateWitnessScore(new BN(250))
      .accounts({
        witnessProfile: profilePda,
        wallet: wallet.publicKey,
        authority: wallet.publicKey,
      })
      .rpc();

    const profile = await program.account.witnessProfile.fetch(profilePda);
    assert.isAbove(profile.score.toNumber(), 0);
  });
});
