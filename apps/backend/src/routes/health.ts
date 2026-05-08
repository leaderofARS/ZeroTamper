import { Router, Request, Response } from "express";
import { connection } from "../lib/solana";

const router = Router();

router.get("/", async (_req: Request, res: Response) => {
  try {
    const slot = await connection.getSlot();
    res.json({
      status: "ok",
      service: "WitnessChain Backend",
      timestamp: new Date().toISOString(),
      solana: { connected: true, slot },
    });
  } catch {
    res.json({
      status: "degraded",
      service: "WitnessChain Backend",
      timestamp: new Date().toISOString(),
      solana: { connected: false },
    });
  }
});

export default router;
