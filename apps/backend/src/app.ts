import express from "express";
import cors from "cors";
import helmet from "helmet";
import compression from "compression";
import morgan from "morgan";
import rateLimit from "express-rate-limit";

import evidenceRouter from "./routes/evidence";
import incidentsRouter from "./routes/incidents";
import exportRouter from "./routes/export";
import scoreRouter from "./routes/score";
import leaderboardRouter from "./routes/leaderboard";
import healthRouter from "./routes/health";

const app = express();

// ── Security & middleware ──────────────────────────────────────────
app.use(helmet());
app.use(
  cors({
    origin: process.env.CORS_ORIGIN?.split(",") || "*",
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE"],
    allowedHeaders: ["Content-Type", "Authorization"],
  })
);
app.use(compression());
app.use(express.json({ limit: "2mb" }));
app.use(morgan("combined"));

// ── Global rate limiting ───────────────────────────────────────────
const globalLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: 300,
  standardHeaders: true,
  legacyHeaders: false,
  message: { error: "Too many requests, please try again later." },
});
app.use(globalLimiter);

// ── Routes ─────────────────────────────────────────────────────────
app.use("/api/health", healthRouter);
app.use("/api/evidence", evidenceRouter);
app.use("/api/incidents", incidentsRouter);
app.use("/api/export", exportRouter);
app.use("/api/score", scoreRouter);
app.use("/api/leaderboard", leaderboardRouter);

// ── 404 handler ────────────────────────────────────────────────────
app.use((_req, res) => {
  res.status(404).json({ error: "Route not found" });
});

// ── Global error handler ───────────────────────────────────────────
app.use((err: Error, _req: express.Request, res: express.Response, _next: express.NextFunction) => {
  console.error("[ERROR]", err.stack);
  res.status(500).json({ error: "Internal server error", message: err.message });
});

export default app;
