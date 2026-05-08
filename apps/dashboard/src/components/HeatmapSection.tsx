"use client";
import { useState } from "react";
import useSWR from "swr";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

async function fetcher(url: string) {
  const res = await fetch(url);
  if (!res.ok) throw new Error("Fetch failed");
  return res.json();
}

type Incident = {
  id: string;
  status: "Pending" | "Confirmed" | "Flagged";
  witness_count: number;
  first_seen_at: string;
  centroid_lat: number;
  centroid_lon: number;
};

type Filters = {
  status: string;
  since: string;
};

export default function HeatmapSection() {
  const [filters, setFilters] = useState<Filters>({ status: "", since: "" });

  const params = new URLSearchParams({
    ...(filters.status ? { status: filters.status } : {}),
    ...(filters.since  ? { since: filters.since }   : {}),
    limit: "200",
  });

  const { data, isLoading } = useSWR<{ incidents: Incident[] }>(
    `${BACKEND}/api/incidents?${params}`,
    fetcher,
    { refreshInterval: 30_000 }
  );

  const incidents = data?.incidents ?? [];
  const confirmed = incidents.filter(i => i.status === "Confirmed").length;
  const pending   = incidents.filter(i => i.status === "Pending").length;
  const flagged   = incidents.filter(i => i.status === "Flagged").length;

  return (
    <section className="section">
      <div className="section-header">
        <h2 className="section-title">
          <span className="section-title-icon icon-cyan">🗺️</span>
          Live Incident Heatmap
        </h2>
        <div style={{ display: "flex", gap: "8px" }}>
          <select
            id="status-filter"
            className="input-field"
            style={{ width: "auto", padding: "8px 12px" }}
            value={filters.status}
            onChange={e => setFilters(f => ({ ...f, status: e.target.value }))}
          >
            <option value="">All Status</option>
            <option value="Confirmed">Confirmed</option>
            <option value="Pending">Pending</option>
            <option value="Flagged">Flagged</option>
          </select>
          <input
            id="since-filter"
            type="date"
            className="input-field"
            style={{ width: "auto", padding: "8px 12px" }}
            value={filters.since}
            onChange={e => setFilters(f => ({ ...f, since: e.target.value }))}
          />
        </div>
      </div>

      {/* Stats summary */}
      <div style={{ display: "flex", gap: "12px", marginBottom: "20px", flexWrap: "wrap" }}>
        <span className="badge badge-confirmed">✅ {confirmed} Confirmed</span>
        <span className="badge badge-pending">⏳ {pending} Pending</span>
        <span className="badge badge-flagged">🚩 {flagged} Flagged</span>
        <span className="badge" style={{ background: "rgba(153,69,255,0.1)", color: "var(--accent-purple)", border: "1px solid rgba(153,69,255,0.3)" }}>
          Total: {incidents.length}
        </span>
      </div>

      {/* Map placeholder — replace with react-map-gl MapboxMap once token is configured */}
      <div className="map-wrapper" style={{ background: "var(--bg-surface)", position: "relative" }}>
        <div style={{
          position: "absolute", inset: 0,
          background: `
            radial-gradient(circle at 30% 45%, rgba(153,69,255,0.25) 0%, transparent 35%),
            radial-gradient(circle at 65% 30%, rgba(20,241,149,0.2) 0%, transparent 28%),
            radial-gradient(circle at 50% 70%, rgba(245,166,35,0.15) 0%, transparent 20%),
            radial-gradient(circle at 20% 75%, rgba(153,69,255,0.12) 0%, transparent 18%)
          `,
          display: "flex",
          flexDirection: "column",
          alignItems: "center",
          justifyContent: "center",
          color: "var(--text-secondary)",
          fontSize: "0.9rem",
        }}>
          {isLoading ? (
            <div>Loading incidents…</div>
          ) : (
            <>
              <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🗺️</div>
              <div style={{ fontSize: "1rem", fontWeight: 600, color: "var(--text-primary)", marginBottom: "8px" }}>
                Bengaluru, Karnataka
              </div>
              <div>{incidents.length} incidents in view</div>
              <div style={{ marginTop: "8px", fontSize: "0.8rem", color: "var(--text-muted)" }}>
                Set NEXT_PUBLIC_MAPBOX_TOKEN to enable interactive heatmap
              </div>

              {/* Render dots for incidents */}
              {incidents.slice(0, 30).map((inc, i) => (
                <div
                  key={inc.id}
                  title={`${inc.status} — ${inc.witness_count} witnesses`}
                  style={{
                    position: "absolute",
                    left: `${20 + ((inc.centroid_lon - 77.4) / 0.5) * 60}%`,
                    top:  `${80 - ((inc.centroid_lat - 12.8) / 0.4) * 60}%`,
                    width: inc.status === "Confirmed" ? "12px" : "8px",
                    height: inc.status === "Confirmed" ? "12px" : "8px",
                    borderRadius: "50%",
                    background: inc.status === "Confirmed" ? "var(--accent-cyan)"
                              : inc.status === "Flagged"   ? "var(--accent-red)"
                              :                              "var(--accent-amber)",
                    boxShadow: `0 0 12px currentColor`,
                    cursor: "pointer",
                    animation: "pulse 2s infinite",
                    animationDelay: `${(i * 0.1) % 2}s`,
                  }}
                />
              ))}
            </>
          )}
        </div>
      </div>

      {/* Incident list */}
      <div style={{ marginTop: "32px" }}>
        <div className="card">
          <div className="card-header">
            <span style={{ fontWeight: 600 }}>Recent Incidents</span>
          </div>
          <table className="evidence-table">
            <thead>
              <tr>
                <th>Incident ID</th>
                <th>Status</th>
                <th>Witnesses</th>
                <th>Location</th>
                <th>First Seen</th>
              </tr>
            </thead>
            <tbody>
              {isLoading
                ? Array.from({ length: 5 }).map((_, i) => (
                    <tr key={i}>
                      {Array.from({ length: 5 }).map((_, j) => (
                        <td key={j}><div className="skeleton" style={{ height: "16px", width: "80%" }} /></td>
                      ))}
                    </tr>
                  ))
                : incidents.slice(0, 10).map(inc => (
                    <tr key={inc.id}>
                      <td><span className="hash-chip">{inc.id.slice(0, 8)}…</span></td>
                      <td>
                        <span className={`badge badge-${inc.status.toLowerCase()}`}>
                          {inc.status === "Confirmed" ? "✅" : inc.status === "Flagged" ? "🚩" : "⏳"} {inc.status}
                        </span>
                      </td>
                      <td style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>{inc.witness_count}</td>
                      <td style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
                        {inc.centroid_lat.toFixed(4)}, {inc.centroid_lon.toFixed(4)}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {new Date(inc.first_seen_at).toLocaleString()}
                      </td>
                    </tr>
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}
