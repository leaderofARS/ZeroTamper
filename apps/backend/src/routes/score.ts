import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { recalculateScore, checkBadgeEligibility } from "../services/scoring";

const router = Router();

/**
 * GET /api/score/:wallet
 * Return the current witness score and badge count for a wallet.
 */
router.get("/:wallet", async (req: Request, res: Response) => {
  const { wallet } = req.params;

  const { data, error } = await supabase
    .from("witness_profiles")
    .select("score, submission_count, confirmed_count, badge_bitfield, city, display_name")
    .eq("wallet", wallet)
    .single();

  if (error || !data) {
    res.status(404).json({ error: "Witness profile not found" });
    return;
  }

  const badges = checkBadgeNames(data.badge_bitfield ?? 0);
  res.json({ wallet, ...data, badges });
});

/**
 * POST /api/score/:wallet/recalculate
 * Trigger a score recalculation (can be called after corroboration events).
 */
router.post("/:wallet/recalculate", async (req: Request, res: Response) => {
  try {
    const score = await recalculateScore(req.params.wallet);
    const eligible = await checkBadgeEligibility(req.params.wallet);
    res.json({ wallet: req.params.wallet, score, eligibleBadges: eligible });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

// Map badge bitfield to human-readable names
function checkBadgeNames(bitfield: number): string[] {
  const badges: Record<number, string> = {
    0: "🔍 First Witness",
    1: "🤝 Corroborator",
    2: "🛡️ Civic Guardian",
    3: "⚖️ Chain Anchor",
    4: "🏙️ City Sentinel",
  };
  return Object.entries(badges)
    .filter(([bit]) => bitfield & (1 << parseInt(bit)))
    .map(([, name]) => name);
}

export default router;
