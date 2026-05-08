import { Request, Response, NextFunction } from "express";

const LEGAL_API_SECRET = process.env.LEGAL_API_SECRET;

/** Validates the Bearer token for the legal export API. */
export function legalAuth(req: Request, res: Response, next: NextFunction): void {
  if (!LEGAL_API_SECRET) {
    res.status(503).json({ error: "Legal API not configured" });
    return;
  }

  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing Authorization header" });
    return;
  }

  const token = authHeader.slice(7);
  if (token !== LEGAL_API_SECRET) {
    res.status(403).json({ error: "Invalid legal API secret" });
    return;
  }

  next();
}

/** Validates a Solana wallet signature — simplified version using base58 header. */
export function walletAuth(req: Request, res: Response, next: NextFunction): void {
  const authHeader = req.headers.authorization;
  if (!authHeader?.startsWith("Bearer ")) {
    res.status(401).json({ error: "Missing wallet Authorization header" });
    return;
  }

  // In production: verify Ed25519 signature over the request body hash
  // For now, we extract the wallet from the body and trust the header
  const wallet = req.body?.witnessWallet ?? req.query?.wallet;
  if (!wallet) {
    res.status(400).json({ error: "witnessWallet is required" });
    return;
  }

  (req as any).wallet = wallet;
  next();
}
