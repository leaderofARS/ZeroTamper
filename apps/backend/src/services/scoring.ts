import { supabase } from "../lib/supabase";
import { listMemoryLeaderboard } from "../lib/memoryStore";

/** Witness score formula constants */
const BASE_WEIGHT = 10;
const FIRST_WITNESS_WEIGHT = 25;
const CORROBORATOR_WEIGHT = 5;

const CONFIRMED_MULTIPLIER = 2.5;
const PENDING_MULTIPLIER   = 1.0;
const FLAGGED_MULTIPLIER   = 0.0;

/** Compute decayed points for a single submission. */
function computePoints(opts: {
  isFirstWitness: boolean;
  isCorroborator: boolean;
  status: "Pending" | "Confirmed" | "Flagged";
  daysSinceSubmission: number;
}): number {
  const weight = opts.isFirstWitness
    ? FIRST_WITNESS_WEIGHT
    : opts.isCorroborator
    ? CORROBORATOR_WEIGHT
    : BASE_WEIGHT;

  const multiplier =
    opts.status === "Confirmed"
      ? CONFIRMED_MULTIPLIER
      : opts.status === "Flagged"
      ? FLAGGED_MULTIPLIER
      : PENDING_MULTIPLIER;

  const decay = Math.exp(-0.01 * opts.daysSinceSubmission);

  return Math.round(weight * multiplier * decay * 100) / 100;
}

/** Recalculate the full score for a wallet and persist it. */
export async function recalculateScore(wallet: string): Promise<number> {
  const { data: submissions, error } = await supabase
    .from("evidence_records")
    .select("incident_id, is_first_witness, is_corroborator, created_at, incidents(status)")
    .eq("witness_wallet", wallet);

  if (error) throw new Error(`Score fetch error: ${error.message}`);

  const now = Date.now();
  let total = 0;

  for (const s of submissions ?? []) {
    const days = (now - new Date(s.created_at).getTime()) / 86_400_000;
    const incidentStatus = (s.incidents as any)?.status ?? "Pending";

    total += computePoints({
      isFirstWitness: s.is_first_witness,
      isCorroborator: s.is_corroborator,
      status: incidentStatus,
      daysSinceSubmission: days,
    });
  }

  const score = Math.round(total);

  await supabase
    .from("witness_profiles")
    .upsert({ wallet, score, updated_at: new Date().toISOString() }, { onConflict: "wallet" });

  return score;
}

/** Return the top N witnesses in a given city (approximated by bounding box). */
export async function getLeaderboard(city?: string, limit = 20) {
  let query = supabase
    .from("witness_profiles")
    .select("wallet, score, display_name, city, badge_count")
    .order("score", { ascending: false })
    .limit(limit);

  if (city) {
    query = query.ilike("city", `%${city}%`);
  }

  const { data, error } = await query;
  if (error) {
    console.warn("[supabase] Returning in-memory leaderboard:", error.message);
    return listMemoryLeaderboard(city, limit);
  }
  return data ?? [];
}

/** Check badge eligibility and return a list of badge_type numbers to mint. */
export async function checkBadgeEligibility(wallet: string): Promise<number[]> {
  const { data: profile } = await supabase
    .from("witness_profiles")
    .select("badge_bitfield, confirmed_count, submission_count")
    .eq("wallet", wallet)
    .single();

  if (!profile) return [];

  const toMint: number[] = [];
  const bitfield: number = profile.badge_bitfield ?? 0;

  // Badge 0: First Witness — has any submission
  if (profile.submission_count >= 1 && !(bitfield & 1)) toMint.push(0);
  // Badge 1: Corroborator — corroborated at least one incident
  // Badge 2: Civic Guardian — 10+ confirmed
  if (profile.confirmed_count >= 10 && !(bitfield & 4)) toMint.push(2);
  // Badge 3: Chain Anchor — evidence used in a legal export (set externally)
  // Badge 4: City Sentinel — top 10 in city (checked via leaderboard)

  return toMint;
}
