import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { getLeaderboard } from "../services/scoring";

const router = Router();

/**
 * GET /api/leaderboard/:wallet
 * Fetch individual stats for a witness.
 */
router.get("/:wallet", async (req: Request, res: Response) => {
  const { wallet } = req.params;

  try {
    const { data, error } = await supabase
      .from("witness_profiles")
      .select("*")
      .eq("wallet", wallet)
      .single();

    if (error && error.code !== "PGRST116") {
      throw error;
    }

    res.json(data || { 
      wallet, 
      score: 0, 
      submission_count: 0, 
      confirmed_count: 0, 
      badge_bitfield: 0 
    });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

router.get("/", async (req: Request, res: Response) => {
  const city  = req.query.city  as string | undefined;
  const limit = Math.min(parseInt(req.query.limit as string || "20"), 100);

  try {
    const leaders = await getLeaderboard(city, limit);
    res.json({ city: city ?? "global", leaders });
  } catch (err: any) {
    res.status(500).json({ error: err.message });
  }
});

export default router;
