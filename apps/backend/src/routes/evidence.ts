import { Router, Request, Response } from "express";
import { z } from "zod";
import { supabase } from "../lib/supabase";
import { resolveIncidentCluster } from "../services/clustering";
import { recalculateScore } from "../services/scoring";
import { analyzeMedia, findDuplicateByPHash } from "../services/deepfake";
import { submitLimiter } from "../middleware/rateLimiter";
import { walletAuth } from "../middleware/auth";

const router = Router();

const SubmitSchema = z.object({
  sha256Hash: z.string().length(64, "sha256Hash must be 64 hex chars"),
  ipfsCid: z.string().min(10).max(64),
  latitude: z.number().min(-90).max(90),
  longitude: z.number().min(-180).max(180),
  mediaType: z.string(),
  deviceIdHash: z.string().max(64),
  witnessWallet: z.string().min(32).max(50),
  solanaSignature: z.string().optional(),
  mediaBase64: z.string().optional(), // for deepfake analysis
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
    // 1. Deepfake / duplicate check
    let deepfakeResult = { isDeepfake: false, confidence: 0, pHash: data.sha256Hash.slice(0, 16) };
    if (data.mediaBase64) {
      const buffer = Buffer.from(data.mediaBase64, "base64");
      deepfakeResult = await analyzeMedia(buffer, data.mediaType);

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

    // 2. Cluster into an incident
    const now = Math.floor(Date.now() / 1000);
    const incidentId = await resolveIncidentCluster(data.latitude, data.longitude, now);

    // 3. Determine if first witness
    const { count } = await supabase
      .from("evidence_records")
      .select("*", { count: "exact", head: true })
      .eq("incident_id", incidentId);
    const isFirstWitness = (count ?? 0) === 0;

    // 4. Persist evidence record
    const { error: insertErr } = await supabase.from("evidence_records").insert({
      sha256_hash: data.sha256Hash,
      ipfs_cid: data.ipfsCid,
      incident_id: incidentId,
      witness_wallet: data.witnessWallet,
      latitude: data.latitude,
      longitude: data.longitude,
      media_type: data.mediaType,
      device_id_hash: data.deviceIdHash,
      solana_signature: data.solanaSignature ?? null,
      is_first_witness: isFirstWitness,
      is_corroborator: !isFirstWitness,
      deepfake_confidence: deepfakeResult.confidence,
      is_flagged_deepfake: deepfakeResult.isDeepfake,
      p_hash: deepfakeResult.pHash,
      created_at: new Date().toISOString(),
    });

    if (insertErr) throw new Error(insertErr.message);

    // 5. Auto-flag if deepfake confidence is high
    if (deepfakeResult.isDeepfake && deepfakeResult.confidence > 0.85) {
      await supabase
        .from("incidents")
        .update({ status: "Flagged" })
        .eq("id", incidentId);
    }

    // 6. Recalculate witness score asynchronously
    recalculateScore(data.witnessWallet).catch(console.error);

    res.status(201).json({
      success: true,
      incidentId,
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
