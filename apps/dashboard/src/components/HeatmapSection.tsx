"use client";
import { useState } from "react";
import dynamic from "next/dynamic";
import useSWR from "swr";

const MapComponent = dynamic(() => import("./MapComponent"), {
  ssr: false,
  loading: () => (
    <div style={{
      width: "100%", height: "100%", 
      display: "flex", alignItems: "center", justifyContent: "center",
      background: "var(--bg-surface)", color: "var(--text-muted)"
    }}>
      Loading Map Engine...
    </div>
  )
});

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
  const [selected, setSelected] = useState<Incident | null>(null);

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

      <div className="map-wrapper" style={{ background: "var(--bg-surface)", position: "relative" }}>
        <MapComponent 
          incidents={incidents} 
          selected={selected} 
          onSelect={setSelected} 
        />
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
