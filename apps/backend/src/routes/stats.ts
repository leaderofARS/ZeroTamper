import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";

const router = Router();

/**
 * GET /api/stats
 * Return global platform metrics for the homepage.
 */
router.get("/", async (_req: Request, res: Response) => {
  try {
    // 1. Total Incidents
    const { count: totalIncidents } = await supabase
      .from("incidents")
      .select("*", { count: "exact", head: true });

    // 2. Confirmed Evidence
    const { count: confirmedEvidence } = await supabase
      .from("evidence_records")
      .select("*", { count: "exact", head: true });

    // 3. Active Witnesses
    // In a real app, this would be a distinct count. 
    // For now, we'll fetch all unique wallets from evidence_records.
    const { data: witnesses } = await supabase
      .from("evidence_records")
      .select("witness_wallet");
    
    const uniqueWallets = new Set(witnesses?.map(w => w.witness_wallet));
    const activeWitnesses = uniqueWallets.size;

    // 4. On-chain Anchors (records with a signature)
    const { count: anchors } = await supabase
      .from("evidence_records")
      .select("*", { count: "exact", head: true })
      .not("solana_signature", "is", null);

    // 5. Legal Exports (count from legal_exports table)
    const { count: exports } = await supabase
      .from("legal_exports")
      .select("*", { count: "exact", head: true });

    res.json({
      totalIncidents: totalIncidents || 0,
      confirmedEvidence: confirmedEvidence || 0,
      activeWitnesses: activeWitnesses || 0,
      onChainAnchors: anchors || 0,
      legalExports: exports || 0,
    });
  } catch (err: any) {
    console.error("[stats] Error fetching global metrics:", err.message);
    // Fallback to zeros instead of erroring out
    res.json({
      totalIncidents: 0,
      confirmedEvidence: 0,
      activeWitnesses: 0,
      onChainAnchors: 0,
      legalExports: 0,
    });
  }
});

export default router;
