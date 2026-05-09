import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { getIncident } from "../services/clustering";
import { listMemoryIncidents } from "../lib/memoryStore";

const router = Router();

/**
 * GET /api/incidents/:incidentId
 * Return full incident cluster with all evidence records.
 */
router.get("/:incidentId", async (req: Request, res: Response) => {
  try {
    const incident = await getIncident(req.params.incidentId);
    res.json({
      incidentId: incident.id,
      status: incident.status,
      witnessCount: incident.witness_count,
      firstSeenAt: incident.first_seen_at,
      location: {
        lat: incident.centroid_lat,
        lon: incident.centroid_lon,
      },
      evidenceRecords: (incident as any).evidence_records ?? [],
    });
  } catch {
    res.status(404).json({ error: "Incident not found" });
  }
});

/**
 * GET /api/incidents
 * List incidents with optional filters: status, city bounding box, time range.
 */
router.get("/", async (req: Request, res: Response) => {
  const {
    status,
    minLat, maxLat, minLon, maxLon,
    since, until,
    limit = "50",
    offset = "0",
  } = req.query as Record<string, string>;

  let query = supabase
    .from("incidents")
    .select("id, status, witness_count, first_seen_at, centroid_lat, centroid_lon")
    .order("first_seen_at", { ascending: false })
    .range(parseInt(offset), parseInt(offset) + parseInt(limit) - 1);

  if (status) query = query.eq("status", status);
  if (minLat)  query = query.gte("centroid_lat", parseFloat(minLat));
  if (maxLat)  query = query.lte("centroid_lat", parseFloat(maxLat));
  if (minLon)  query = query.gte("centroid_lon", parseFloat(minLon));
  if (maxLon)  query = query.lte("centroid_lon", parseFloat(maxLon));
  if (since)   query = query.gte("first_seen_at", since);
  if (until)   query = query.lte("first_seen_at", until);

  const { data, error, count } = await query;

  if (error) {
    console.warn("[supabase] Returning in-memory incidents:", error.message);
    const incidents = listMemoryIncidents();
    res.json({ total: incidents.length, incidents });
    return;
  }

  res.json({ total: count, incidents: data });
});

/**
 * POST /api/incidents/:incidentId/ai-summary
 * Triggers Gemini AI analysis of the incident media.
 */
router.post("/:incidentId/ai-summary", async (req: Request, res: Response) => {
  const { incidentId } = req.params;
  const ML_URL = process.env.ML_SERVICE_URL || "http://localhost:5001";
  
  console.log(`[AI-Summary] Request for incident: ${incidentId}`);

  try {
    // 1. Get incident and its evidence
    const { data: evidence, error } = await supabase
      .from("evidence")
      .select("media_url, mime_type")
      .eq("incident_id", incidentId)
      .limit(1);

    if (error) {
      console.error("[AI-Summary] Supabase Error:", error.message);
      return res.status(500).json({ error: "Database query failed" });
    }

    if (!evidence || evidence.length === 0) {
      console.warn(`[AI-Summary] No evidence found for incident: ${incidentId}`);
      return res.status(404).json({ error: "No media records found for this incident. Cannot analyze." });
    }

    const targetEvidence = evidence[0];
    console.log(`[AI-Summary] Analyzing media: ${targetEvidence.media_url}`);

    // 2. Call ML Service
    const axios = require("axios");
    try {
      const mlResponse = await axios.post(`${ML_URL}/describe`, {
        mediaUrl: targetEvidence.media_url,
        mimeType: targetEvidence.mime_type
      }, { timeout: 20000 });

      res.json({ 
        summary: mlResponse.data.description,
        source: targetEvidence.media_url
      });
    } catch (mlErr: any) {
      console.error("[AI-Summary] ML Service Error:", mlErr.message);
      // Fallback for demo if ML service is down but we have evidence
      res.json({
        summary: "AI analysis was unable to reach the forensic engine. However, the evidence is securely hashed and anchored on Solana.",
        source: targetEvidence.media_url
      });
    }
  } catch (err: any) {
    console.error("[AI-Summary] unexpected Error:", err.message);
    res.status(500).json({ error: "Internal server error during analysis" });
  }
});

export default router;
