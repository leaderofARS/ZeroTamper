import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import { resolveIncidentCluster } from "../services/clustering";
import { recalculateScore } from "../services/scoring";
import { analyzeMedia, findDuplicateByPHash } from "../services/deepfake";
import { uploadToIPFS } from "../services/ipfs";
import { anchorEvidenceOnChain } from "../services/solana";
import { addMemoryEvidence } from "../lib/memoryStore";
import { submitLimiter } from "../middleware/rateLimiter";
import { walletAuth } from "../middleware/auth";

const router = Router();

const SubmitSchema = z.object({
  sha256Hash: z.string().length(64, "sha256Hash must be 64 hex chars"),
  ipfsCid: z.string().min(10).max(64).optional(),
  latitude: z.number().min(-90).max(90).optional(),
  longitude: z.number().min(-180).max(180).optional(),
  mediaType: z.string().optional(),
  deviceIdHash: z.string().max(64).optional(),
  witnessWallet: z.string().min(32).max(50).optional(),
  solanaSignature: z.string().optional(),
  mediaBase64: z.string().optional(), 
  updateOnly: z.boolean().optional(),
});

/**
 * POST /api/evidence/submit
 * Submit a new piece of evidence for an incident.
 */
router.post("/submit", submitLimiter, walletAuth, async (req: Request, res: Response) => {
  const parsed = SubmitSchema.safeParse(req.body);
  if (!parsed.success) {
    res.status(400).json({ error: "Validation failed", details: parsed.error.flatten() });
    return;
  }

  const data = parsed.data;

  try {
    // 1. Handle Update-Only (for signature anchoring from frontend)
    if (data.updateOnly && data.solanaSignature) {
      console.log(`[submission] Updating signature for ${data.sha256Hash.slice(0, 8)}`);
      const { error: updateErr } = await supabase
        .from("evidence_records")
        .update({ solana_signature: data.solanaSignature })
        .eq("sha256_hash", data.sha256Hash);
      
      if (updateErr) return res.status(500).json({ error: updateErr.message });
      return res.json({ status: "updated" });
    }

    // 2. Resolve Incident Cluster
    if (!data.latitude || !data.longitude || !data.witnessWallet || !data.mediaType) {
      return res.status(400).json({ error: "Missing required fields for new submission" });
    }

    const timestamp = Math.floor(Date.now() / 1000);
    const incidentId = await resolveIncidentCluster(data.latitude, data.longitude, timestamp);

    // Check for exact duplicate hash
    const { data: existing } = await supabase
      .from("evidence_records")
      .select("id, incident_id, ipfs_cid")
      .eq("sha256_hash", data.sha256Hash)
      .single();

    if (existing) {
      return res.status(200).json({ 
        incidentId: existing.incident_id, 
        ipfsCid: existing.ipfs_cid, 
        message: "Duplicate hash, skipping upload" 
      });
    }

    const mediaBuffer = data.mediaBase64 ? Buffer.from(data.mediaBase64, "base64") : null;

    // 3. Pin media if the client did not already provide a CID.
    let ipfsCid = data.ipfsCid;
    if (!ipfsCid && mediaBuffer) {
      try {
        console.log(`[submission] Uploading ${data.mediaType} to IPFS... (Size: ${mediaBuffer.length} bytes)`);
        ipfsCid = await uploadToIPFS(mediaBuffer, `${data.sha256Hash}.bin`, {
          sha256Hash: data.sha256Hash,
          witnessWallet: data.witnessWallet,
        });
        console.log(`[submission] IPFS Upload Success: ${ipfsCid}`);
      } catch (err) {
        const message = err instanceof Error ? err.message : String(err);
        console.warn("[ipfs] Pinata unavailable, using deterministic demo CID:", message);
        ipfsCid = `demo-${data.sha256Hash.slice(0, 48)}`;
      }
    }

    if (!ipfsCid) {
      res.status(400).json({ error: "ipfsCid or mediaBase64 is required" });
      return;
    }

    // 4. Deepfake / duplicate check
    let deepfakeResult = { isDeepfake: false, confidence: 0, pHash: data.sha256Hash.slice(0, 16) };
    if (mediaBuffer) {
      deepfakeResult = await analyzeMedia(mediaBuffer, data.mediaType);

      const duplicate = await findDuplicateByPHash(deepfakeResult.pHash, supabase);
      if (duplicate) {
        res.status(409).json({
          error: "Duplicate evidence detected",
          existingIncidentId: duplicate,
          pHash: deepfakeResult.pHash,
        });
        return;
      }
    }

    // 5. Determine if first witness
    const { count } = await supabase
      .from("evidence_records")
      .select("*", { count: "exact", head: true })
      .eq("incident_id", incidentId);
    const isFirstWitness = (count ?? 0) === 0;

    // 6. Persist evidence record
    const { error: insertErr } = await supabase.from("evidence_records").insert({
      sha256_hash: data.sha256Hash,
      ipfs_cid: ipfsCid,
      incident_id: incidentId,
      witness_wallet: data.witnessWallet,
      latitude: data.latitude,
      longitude: data.longitude,
      media_type: data.mediaType,
      device_id_hash: data.deviceIdHash || "UNKNOWN",
      solana_signature: data.solanaSignature ?? null,
      is_first_witness: isFirstWitness,
      is_corroborator: !isFirstWitness,
      deepfake_confidence: deepfakeResult.confidence,
      is_flagged_deepfake: deepfakeResult.isDeepfake,
      p_hash: deepfakeResult.pHash,
      created_at: new Date().toISOString(),
    });

    if (insertErr) {
      if (insertErr.code === "23505") {
        res.status(409).json({ error: "Wallet has already submitted evidence for this incident" });
        return;
      }
      console.warn("[supabase] Persisting evidence in memory:", insertErr.message);
      const stored = addMemoryEvidence({
        sha256_hash: data.sha256Hash,
        ipfs_cid: ipfsCid,
        incident_id: incidentId,
        witness_wallet: data.witnessWallet,
        latitude: data.latitude,
        longitude: data.longitude,
        media_type: data.mediaType,
        device_id_hash: data.deviceIdHash || "UNKNOWN",
        solana_signature: data.solanaSignature ?? null,
        is_first_witness: isFirstWitness,
        is_corroborator: !isFirstWitness,
        deepfake_confidence: deepfakeResult.confidence,
        is_flagged_deepfake: deepfakeResult.isDeepfake,
        p_hash: deepfakeResult.pHash,
        created_at: new Date().toISOString(),
      });
      if (!stored) {
        res.status(409).json({ error: "Wallet has already submitted evidence for this incident" });
        return;
      }
    }

    const { data: profile } = await supabase
      .from("witness_profiles")
      .select("submission_count")
      .eq("wallet", data.witnessWallet)
      .single();

    await supabase.from("witness_profiles").upsert(
      {
        wallet: data.witnessWallet,
        submission_count: (profile?.submission_count ?? 0) + 1,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "wallet" }
    );

    // 7. Auto-flag if deepfake confidence is high
    if (deepfakeResult.isDeepfake && deepfakeResult.confidence > 0.85) {
      await supabase
        .from("incidents")
        .update({ status: "Flagged" })
        .eq("id", incidentId);
    }

    // 8. Anchor on Solana Devnet (Service-side subsidized anchoring)
    try {
      console.log(`[solana] Attempting to anchor ${data.sha256Hash.slice(0, 8)}...`);
      const tx = await anchorEvidenceOnChain(
        data.sha256Hash,
        ipfsCid,
        incidentId,
        data.latitude,
        data.longitude,
        data.witnessWallet
      );
      
      if (tx) {
        await supabase
          .from("evidence_records")
          .update({ solana_signature: tx })
          .eq("sha256_hash", data.sha256Hash);
        console.log(`[solana] Signature updated: ${tx}`);
      } else {
        console.warn("[solana] Anchoring returned null (check service logs)");
      }
    } catch (err: any) {
      console.error("[solana] Synchronous anchoring failed:", err.message);
    }

    // 9. Recalculate witness score asynchronously
    recalculateScore(data.witnessWallet).catch(err => {
      const message = err instanceof Error ? err.message : String(err);
      console.warn("[score] Recalculation skipped:", message);
    });

    res.status(201).json({
      success: true,
      incidentId,
      ipfsCid,
      isFirstWitness,
      deepfake: deepfakeResult,
    });
  } catch (err: any) {
    console.error("[evidence/submit]", err);
    res.status(500).json({ error: err.message });
  }
});

/**
 * GET /api/evidence/:sha256Hash
 * Retrieve a specific evidence record by hash.
 */
router.get("/:sha256Hash", async (req: Request, res: Response) => {
  const { sha256Hash } = req.params;

  const { data, error } = await supabase
    .from("evidence_records")
    .select("*")
    .eq("sha256_hash", sha256Hash)
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Evidence not found" });
    return;
  }

  res.json(data);
});

export default router;
