import "dotenv/config";
import express from "express";
import cors from "cors";
import { loadModel, detectDeepfake, modelLoadError } from "./deepfake";
import { computePHash } from "./phash";

const app  = express();
const PORT = process.env.ML_PORT || 5001;

app.use(cors());
app.use(express.json({ limit: "50mb" }));

// Load TF model on startup
loadModel().catch(() => {});

/**
 * POST /analyze
 * Body: { data: string (base64), mimeType: string }
 * Returns: { isDeepfake: boolean, confidence: number, pHash: string }
 */
app.post("/analyze", async (req, res) => {
  const { data, mimeType } = req.body as { data?: string; mimeType?: string };

  if (!data) {
    res.status(400).json({ error: "data (base64) is required" });
    return;
  }

  const buffer = Buffer.from(data, "base64");

  // Only analyse image types (for video, analyse the first frame — future work)
  const isImage = mimeType?.startsWith("image/") ?? true;

  let confidence = 0;
  let pHash = "0000000000000000";

  if (isImage) {
    try {
      [confidence, pHash] = await Promise.all([
        detectDeepfake(buffer),
        computePHash(buffer),
      ]);
    } catch (err: any) {
      console.error("[analyze]", err.message);
    }
  }

  res.json({
    isDeepfake: confidence > 0.75,
    confidence: Math.round(confidence * 1000) / 1000,
    pHash,
    modelMode: modelLoadError ? "heuristic" : "ml",
  });
});

/** GET /health */
app.get("/health", (_req, res) => {
  res.json({
    status: "ok",
    model: modelLoadError ? `fallback (${modelLoadError})` : "loaded",
    timestamp: new Date().toISOString(),
  });
});

app.listen(PORT, () => {
  console.log(`🤖 WitnessChain ML Service on http://localhost:${PORT}`);
  console.log(`   Model: ${modelLoadError ? "heuristic fallback" : "TF.js"}`);
});
