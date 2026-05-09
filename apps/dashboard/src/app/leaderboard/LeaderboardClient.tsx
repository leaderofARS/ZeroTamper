"use client";
import { useState } from "react";
import useSWR from "swr";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://witnesschain-backend.onrender.com";

const BADGE_NAMES: Record<number, string> = {
  0: "🔍 First Witness",
  1: "🤝 Corroborator",
  2: "🛡️ Civic Guardian",
  3: "⚖️ Chain Anchor",
  4: "🏙️ City Sentinel",
};

type Leader = {
  wallet: string;
  score: number;
  display_name?: string;
  city?: string;
  badge_count?: number;
  badge_bitfield?: number;
};

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("failed");
  return res.json();
}

export default function LeaderboardClient() {
  const [city, setCity] = useState("");
  const [inputCity, setInputCity] = useState("");

  const { data, isLoading } = useSWR<{ leaders: Leader[] }>(
    `${BACKEND}/api/leaderboard?${city ? `city=${encodeURIComponent(city)}` : ""}`,
    fetcher,
    { refreshInterval: 60_000 }
  );

  const leaders = data?.leaders ?? [];

  function getBadges(bitfield = 0): string[] {
    return Object.entries(BADGE_NAMES)
      .filter(([b]) => bitfield & (1 << parseInt(b)))
      .map(([, name]) => name);
  }

  return (
    <div>
      {/* City filter */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "32px", maxWidth: "420px" }}>
        <input
          id="city-search"
          type="text"
          className="input-field"
          placeholder="Filter by city (e.g. Bengaluru)"
          value={inputCity}
          onChange={e => setInputCity(e.target.value)}
          onKeyDown={e => { if (e.key === "Enter") setCity(inputCity); }}
        />
        <button id="city-search-btn" className="btn btn-primary" onClick={() => setCity(inputCity)}>
          Search
        </button>
        {city && (
          <button id="city-clear-btn" className="btn btn-secondary" onClick={() => { setCity(""); setInputCity(""); }}>
            Clear
          </button>
        )}
      </div>

      <div className="card" style={{ overflow: "hidden" }}>
        <div className="card-header">
          <span style={{ fontWeight: 600 }}>
            {city ? `Top Witnesses in ${city}` : "Global Top Witnesses"}
          </span>
          <span style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
            {leaders.length} entries
          </span>
        </div>

        <div>
          {isLoading
            ? Array.from({ length: 10 }).map((_, i) => (
                <div key={i} className="leaderboard-row">
                  <div className="skeleton" style={{ width: "36px", height: "36px", borderRadius: "50%" }} />
                  <div className="skeleton" style={{ height: "16px", width: "60%" }} />
                  <div className="skeleton" style={{ height: "16px", width: "60px" }} />
                  <div className="skeleton" style={{ height: "16px", width: "80px" }} />
                </div>
              ))
            : leaders.map((leader, i) => {
                const rank = i + 1;
                const rankClass = rank === 1 ? "rank-1" : rank === 2 ? "rank-2" : rank === 3 ? "rank-3" : "rank-other";
                const badges = getBadges(leader.badge_bitfield);

                return (
                  <div key={leader.wallet} className="leaderboard-row">
                    <span className={`leaderboard-rank ${rankClass}`}>
                      {rank <= 3 ? ["🥇","🥈","🥉"][rank - 1] : `#${rank}`}
                    </span>

                    <div>
                      <div style={{ fontWeight: 600, marginBottom: "2px" }}>
                        {leader.display_name || (
                          <span className="leaderboard-wallet">
                            {leader.wallet.slice(0, 8)}…{leader.wallet.slice(-6)}
                          </span>
                        )}
                      </div>
                      {badges.length > 0 && (
                        <div style={{ display: "flex", gap: "6px", flexWrap: "wrap" }}>
                          {badges.map(b => (
                            <span key={b} className="badge badge-confirmed" style={{ fontSize: "0.7rem", padding: "2px 7px" }}>
                              {b}
                            </span>
                          ))}
                        </div>
                      )}
                      {leader.city && (
                        <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "2px" }}>
                          📍 {leader.city}
                        </div>
                      )}
                    </div>

                    <span className="leaderboard-score">{leader.score.toLocaleString()}</span>

                    <div
                      className="score-ring"
                      style={{ "--pct": `${Math.min(100, (leader.score / 5000) * 360)}deg` } as React.CSSProperties}
                    >
                      <span className="score-value" style={{ fontSize: "0.7rem" }}>pts</span>
                    </div>
                  </div>
                );
              })
          }

          {!isLoading && leaders.length === 0 && (
            <div style={{ padding: "48px", textAlign: "center", color: "var(--text-muted)" }}>
              No witnesses found{city ? ` in "${city}"` : ""}
            </div>
          )}
        </div>
      </div>

      {/* Badge legend */}
      <div className="card" style={{ marginTop: "32px" }}>
        <div className="card-header">
          <span style={{ fontWeight: 600 }}>Soul-bound Badge Tiers</span>
        </div>
        <div className="card-body">
          <div className="grid-3">
            {Object.entries(BADGE_NAMES).map(([, name]) => (
              <div key={name} style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "14px",
                background: "var(--bg-glass)",
                borderRadius: "var(--radius-md)",
                border: "1px solid var(--border-subtle)",
              }}>
                <span style={{ fontSize: "1.4rem" }}>{name.split(" ")[0]}</span>
                <div>
                  <div style={{ fontWeight: 600, fontSize: "0.9rem" }}>{name.split(" ").slice(1).join(" ")}</div>
                  <div style={{ color: "var(--text-muted)", fontSize: "0.78rem" }}>Non-transferable · On-chain</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}
