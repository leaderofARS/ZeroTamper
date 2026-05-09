import { Router } from "express";
import { supabase } from "../lib/supabase";
import { getTransactionDetails } from "../services/solana";

const router = Router();

/**
 * GET /api/verify/summary/:query
 * Public verification by Incident ID or City.
 */
router.get("/summary/:query", async (req, res) => {
  const { query } = req.params;

  // Search by incident_id (UUID)
  let { data: incident, error } = await supabase
    .from("incidents")
    .select(`
      id,
      status,
      witness_count,
      first_seen_at,
      evidence_records (
        sha256_hash,
        solana_signature,
        witness_wallet
      )
    `)
    .eq("id", query)
    .single();

  // If not found, try searching by evidence hash or signature
  if (!incident) {
     const { data: record } = await supabase
        .from("evidence_records")
        .select("incident_id")
        .or(`sha256_hash.eq.${query},solana_signature.eq.${query}`)
        .single();
     
     if (record) {
        const { data: found } = await supabase
            .from("incidents")
            .select(`
                id,
                status,
                witness_count,
                first_seen_at,
                evidence_records (
                    sha256_hash,
                    solana_signature,
                    witness_wallet
                )
            `)
            .eq("id", record.incident_id)
            .single();
        incident = found;
     }
  }

  if (!incident) return res.status(404).json({ error: "Incident not found" });

  res.json({
    incidentId: incident.id,
    status: incident.status,
    witnesses: incident.witness_count,
    timestamp: incident.first_seen_at,
    isVerified: incident.status === "Confirmed",
    evidenceCount: incident.evidence_records?.length || 0,
    mainSignature: incident.evidence_records?.[0]?.solana_signature,
  });
});

/**
 * GET /api/verify/premium/:incidentId
 * Detailed end-to-end verification data (Premium package).
 */
router.get("/premium/:incidentId", async (req, res) => {
  const { incidentId } = req.params;

  const { data: incident, error } = await supabase
    .from("incidents")
    .select(`
      id,
      status,
      witness_count,
      first_seen_at,
      centroid_lat,
      centroid_lon,
      evidence_records (
        id,
        sha256_hash,
        ipfs_cid,
        solana_signature,
        witness_wallet,
        media_type,
        created_at
      )
    `)
    .eq("id", incidentId)
    .single();

  if (error || !incident) return res.status(404).json({ error: "Incident not found" });

  // Fetch detailed Solana data for each evidence record
  const evidenceWithOnChainData = await Promise.all(
    incident.evidence_records.map(async (rec: any) => {
      let onChain = null;
      if (rec.solana_signature) {
        onChain = await getTransactionDetails(rec.solana_signature);
      }
      return { ...rec, onChain };
    })
  );

  res.json({
    ...incident,
    evidence_records: evidenceWithOnChainData,
  });
});

export default router;
