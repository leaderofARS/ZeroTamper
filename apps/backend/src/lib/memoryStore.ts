export type IncidentStatus = "Pending" | "Confirmed" | "Flagged";

export type MemoryEvidence = {
  sha256_hash: string;
  ipfs_cid: string;
  incident_id: string;
  witness_wallet: string;
  latitude: number;
  longitude: number;
  media_type: string;
  device_id_hash: string;
  solana_signature: string | null;
  is_first_witness: boolean;
  is_corroborator: boolean;
  deepfake_confidence: number;
  is_flagged_deepfake: boolean;
  p_hash: string;
  created_at: string;
};

export type MemoryIncident = {
  id: string;
  status: IncidentStatus;
  witness_count: number;
  first_seen_at: string;
  centroid_lat: number;
  centroid_lon: number;
  evidence_records: MemoryEvidence[];
};

export type MemoryProfile = {
  wallet: string;
  score: number;
  submission_count: number;
  confirmed_count: number;
  badge_bitfield: number;
  badge_count: number;
  display_name?: string;
  city?: string;
};

const incidents = new Map<string, MemoryIncident>();
const profiles = new Map<string, MemoryProfile>();

function distanceMetres(lat1: number, lon1: number, lat2: number, lon2: number) {
  const earth = 6_371_000;
  const toRad = (n: number) => (n * Math.PI) / 180;
  const dLat = toRad(lat2 - lat1);
  const dLon = toRad(lon2 - lon1);
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(toRad(lat1)) * Math.cos(toRad(lat2)) * Math.sin(dLon / 2) ** 2;
  return earth * 2 * Math.atan2(Math.sqrt(a), Math.sqrt(1 - a));
}

export function resolveMemoryIncident(latitude: number, longitude: number, timestamp: number, witnessWallet: string) {
  const submittedAt = new Date(timestamp * 1000).toISOString();
  let nearest: MemoryIncident | null = null;
  let nearestDistance = Infinity;

  for (const incident of incidents.values()) {
    const distance = distanceMetres(latitude, longitude, incident.centroid_lat, incident.centroid_lon);
    if (distance < 200 && distance < nearestDistance && incident.status !== "Flagged") {
      nearest = incident;
      nearestDistance = distance;
    }
  }

  if (!nearest) {
    const id = randomUUID();
    nearest = {
      id,
      status: "Pending",
      witness_count: 1,
      first_seen_at: submittedAt,
      centroid_lat: latitude,
      centroid_lon: longitude,
      evidence_records: [],
    };
    incidents.set(id, nearest);
    return id;
  }

  const isNewWitness = !nearest.evidence_records.some(e => e.witness_wallet === witnessWallet);
  const nextCount = isNewWitness ? nearest.witness_count + 1 : nearest.witness_count;
  
  nearest.centroid_lat = (nearest.centroid_lat * nearest.witness_count + latitude) / (nearest.witness_count + 1);
  nearest.centroid_lon = (nearest.centroid_lon * nearest.witness_count + longitude) / (nearest.witness_count + 1);
  nearest.witness_count = nextCount;
  nearest.status = nextCount >= 3 ? "Confirmed" : "Pending";
  return nearest.id;
}

export function addMemoryEvidence(record: MemoryEvidence) {
  let incident = incidents.get(record.incident_id);
  if (!incident) {
    incident = {
      id: record.incident_id,
      status: "Pending",
      witness_count: 1,
      first_seen_at: record.created_at,
      centroid_lat: record.latitude,
      centroid_lon: record.longitude,
      evidence_records: [],
    };
    incidents.set(record.incident_id, incident);
  }

  if (incident.evidence_records.some(e => e.witness_wallet === record.witness_wallet)) {
    return false;
  }

  incident.evidence_records.push(record);
  const uniqueWitnesses = new Set(incident.evidence_records.map(e => e.witness_wallet));
  incident.witness_count = uniqueWitnesses.size;
  incident.status = record.is_flagged_deepfake
    ? "Flagged"
    : incident.witness_count >= 3
    ? "Confirmed"
    : "Pending";

  const profile = profiles.get(record.witness_wallet) ?? {
    wallet: record.witness_wallet,
    score: 0,
    submission_count: 0,
    confirmed_count: 0,
    badge_bitfield: 0,
    badge_count: 0,
  };
  profile.submission_count += 1;
  profile.score = profile.submission_count * 10 + incident.evidence_records.filter(e => e.is_first_witness).length * 15;
  profiles.set(record.witness_wallet, profile);
  return true;
}

export function listMemoryIncidents() {
  return Array.from(incidents.values()).sort(
    (a, b) => new Date(b.first_seen_at).getTime() - new Date(a.first_seen_at).getTime()
  );
}

export function getMemoryIncident(id: string) {
  return incidents.get(id) ?? null;
}

export function listMemoryLeaderboard(city?: string, limit = 20) {
  return Array.from(profiles.values())
    .filter(profile => !city || profile.city?.toLowerCase().includes(city.toLowerCase()))
    .sort((a, b) => b.score - a.score)
    .slice(0, limit);
}
import { randomUUID } from "crypto";
