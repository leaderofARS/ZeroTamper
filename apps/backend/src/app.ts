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
import statsRouter from "./routes/stats";

const app = express();

// Required for Render / Load balancers
app.set("trust proxy", 1);

// ── Sanitize URLs (Fix double slashes) ──────────────────────────
app.use((req, _res, next) => {
  req.url = req.url.replace(/\/+/g, "/");
  next();
});

// ── Security & middleware ──────────────────────────────────────────
app.use(helmet({
  crossOriginResourcePolicy: { policy: "cross-origin" }
}));
app.use(
  cors({
    origin: process.env.CORS_ORIGIN === "*" ? "*" : process.env.CORS_ORIGIN?.split(","),
    methods: ["GET", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
    credentials: true,
  })
);
app.use(compression());
app.use(express.json({ limit: "50mb" }));
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
app.get("/", (_req, res) => {
  res.json({ message: "WitnessChain API is running. Check /api/health for status." });
});

app.use("/api/health", healthRouter);
app.use("/api/evidence", evidenceRouter);
app.use("/api/incidents", incidentsRouter);
app.use("/api/export", exportRouter);
app.use("/api/score", scoreRouter);
app.use("/api/leaderboard", leaderboardRouter);
app.use("/api/stats", statsRouter);

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
