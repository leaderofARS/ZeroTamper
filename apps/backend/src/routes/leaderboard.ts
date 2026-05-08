import { Router, Request, Response } from "express";
import { getLeaderboard } from "../services/scoring";

const router = Router();

/**
 * GET /api/leaderboard
 * Query params: city?, limit? (default 20)
 */
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
