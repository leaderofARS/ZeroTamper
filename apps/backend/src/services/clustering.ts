import { supabase } from "../lib/supabase";
import { randomUUID } from "crypto";
import { getMemoryIncident, resolveMemoryIncident } from "../lib/memoryStore";

/** GPS radius (metres) for grouping submissions into the same incident. */
const CLUSTER_RADIUS_METRES = 200;
/** Time window (seconds) for incident clustering. */
const CLUSTER_TIME_WINDOW_SECONDS = 3600; // 1 hour

/** Haversine distance in metres between two GPS coordinates. */
function haversineMetres(
  lat1: number, lon1: number,
  lat2: number, lon2: number
): number {
  const R = 6_371_000; // Earth radius in metres
  const φ1 = (lat1 * Math.PI) / 180;
  const φ2 = (lat2 * Math.PI) / 180;
  const Δφ = ((lat2 - lat1) * Math.PI) / 180;
  const Δλ = ((lon2 - lon1) * Math.PI) / 180;

  const a =
    Math.sin(Δφ / 2) ** 2 +
    Math.cos(φ1) * Math.cos(φ2) * Math.sin(Δλ / 2) ** 2;

  return R * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

/**
 * Given a GPS position and timestamp, finds an existing incident cluster
 * or creates a new one. Returns the incident_id.
 */
export async function resolveIncidentCluster(
  latitude: number,
  longitude: number,
  timestamp: number
): Promise<string> {
  const windowStart = new Date((timestamp - CLUSTER_TIME_WINDOW_SECONDS) * 1000).toISOString();
  const windowEnd   = new Date((timestamp + CLUSTER_TIME_WINDOW_SECONDS) * 1000).toISOString();

  // Fetch all open incidents within the time window
  const { data: candidates, error } = await supabase
    .from("incidents")
    .select("id, centroid_lat, centroid_lon, witness_count, status")
    .gte("first_seen_at", windowStart)
    .lte("first_seen_at", windowEnd)
    .neq("status", "Flagged");

  if (error) {
    console.warn("[supabase] Falling back to in-memory incident clustering:", error.message);
    return resolveMemoryIncident(latitude, longitude, timestamp);
  }

  // Find the nearest cluster within the radius
  let bestId: string | null = null;
  let bestDist = Infinity;

  for (const c of candidates ?? []) {
    const dist = haversineMetres(latitude, longitude, c.centroid_lat, c.centroid_lon);
    if (dist < CLUSTER_RADIUS_METRES && dist < bestDist) {
      bestDist = dist;
      bestId = c.id;
    }
  }

  if (bestId) {
    // Update the centroid as a running average and increment count
    const { data: existing } = await supabase
      .from("incidents")
      .select("centroid_lat, centroid_lon, witness_count")
      .eq("id", bestId)
      .single();

    if (existing) {
      const n = existing.witness_count + 1;
      const newLat = (existing.centroid_lat * existing.witness_count + latitude) / n;
      const newLon = (existing.centroid_lon * existing.witness_count + longitude) / n;

      await supabase
        .from("incidents")
        .update({
          centroid_lat: newLat,
          centroid_lon: newLon,
          witness_count: n,
          status: n >= 3 ? "Confirmed" : "Pending",
          updated_at: new Date().toISOString(),
        })
        .eq("id", bestId);
    }

    return bestId;
  }

  // Create a new incident cluster
  const newId = randomUUID();
  const { error: insertError } = await supabase.from("incidents").insert({
    id: newId,
    centroid_lat: latitude,
    centroid_lon: longitude,
    first_seen_at: new Date(timestamp * 1000).toISOString(),
    witness_count: 1,
    status: "Pending",
    updated_at: new Date(timestamp * 1000).toISOString(),
  });

  if (insertError) {
    console.warn("[supabase] Falling back to in-memory incident creation:", insertError.message);
    return resolveMemoryIncident(latitude, longitude, timestamp);
  }
  return newId;
}

/** Return the full incident record with all evidence. */
export async function getIncident(incidentId: string) {
  const { data: incident, error } = await supabase
    .from("incidents")
    .select(`
      id,
      status,
      witness_count,
      first_seen_at,
      centroid_lat,
      centroid_lon,
      evidence_records (
        sha256_hash,
        ipfs_cid,
        solana_signature,
        witness_wallet,
        created_at
      )
    `)
    .eq("id", incidentId)
    .single();

  if (error || !incident) {
    const memoryIncident = getMemoryIncident(incidentId);
    if (memoryIncident) return memoryIncident;
    throw new Error("Incident not found");
  }
  return incident;
}
