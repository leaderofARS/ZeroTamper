import { Router, Request, Response } from "express";
import { supabase } from "../lib/supabase";
import { getIncident } from "../services/clustering";

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
    res.status(500).json({ error: error.message });
    return;
  }

  res.json({ total: count, incidents: data });
});

export default router;
