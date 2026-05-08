import axios from "axios";
import { createHash } from "crypto";

const ML_SERVICE_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";

export interface DeepfakeResult {
  isDeepfake: boolean;
  confidence: number; // 0–1
  pHash: string;
}

/**
 * Send media bytes to the TensorFlow.js ML service for deepfake detection
 * and perceptual hashing (pHash).
 */
export async function analyzeMedia(buffer: Buffer, mimeType: string): Promise<DeepfakeResult> {
  try {
    const { data } = await axios.post<DeepfakeResult>(
      `${ML_SERVICE_URL}/analyze`,
      { data: buffer.toString("base64"), mimeType },
      { headers: { "Content-Type": "application/json" }, timeout: 30_000 }
    );
    return data;
  } catch (err) {
    console.warn("[deepfake-service] ML service unavailable, skipping analysis:", err);
    // Gracefully degrade — do not block submission if ML is down
    return {
      isDeepfake: false,
      confidence: 0,
      pHash: createHash("sha256").update(buffer).digest("hex").slice(0, 16),
    };
  }
}

/**
 * Check whether a pHash already exists in the database (duplicate detection).
 * Returns the existing incident_id if found, otherwise null.
 */
export async function findDuplicateByPHash(
  pHash: string,
  supabaseClient: import("@supabase/supabase-js").SupabaseClient
): Promise<string | null> {
  const { data } = await supabaseClient
    .from("evidence_records")
    .select("incident_id")
    .eq("p_hash", pHash)
    .limit(1)
    .single();

  return data?.incident_id ?? null;
}
