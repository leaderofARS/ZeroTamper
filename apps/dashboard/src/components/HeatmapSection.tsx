"use client";
import { useState, useEffect } from "react";
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

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://witnesschain-backend.onrender.com";

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

type EvidenceRecord = {
  sha256_hash: string;
  ipfs_cid: string;
  solana_signature: string;
  witness_wallet: string;
  created_at: string;
};

type IncidentDetails = {
  incidentId: string;
  status: string;
  witnessCount: number;
  firstSeenAt: string;
  location: { lat: number; lon: number };
  evidenceRecords: EvidenceRecord[];
};

type Filters = {
  status: string;
  since: string;
};

export default function HeatmapSection() {
  const [filters, setFilters] = useState<Filters>({ status: "", since: "" });
  const [selected, setSelected] = useState<Incident | null>(null);

  useEffect(() => {
    if (selected) {
      const element = document.getElementById(`incident-${selected.id}`);
      if (element) {
        element.scrollIntoView({ behavior: "smooth", block: "center" });
      }
    }
  }, [selected]);

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
                    <IncidentRow 
                      key={inc.id} 
                      inc={inc} 
                      isSelected={selected?.id === inc.id} 
                      onSelect={() => setSelected(selected?.id === inc.id ? null : inc)} 
                    />
                  ))
              }
            </tbody>
          </table>
        </div>
      </div>
    </section>
  );
}

function IncidentRow({ inc, isSelected, onSelect }: { inc: Incident, isSelected: boolean, onSelect: () => void }) {
  return (
    <>
      <tr 
        id={`incident-${inc.id}`}
        className={isSelected ? "selected" : ""} 
        onClick={onSelect}
        style={{ cursor: "pointer" }}
      >
        <td data-label="Incident ID"><span className="hash-chip">{inc.id.slice(0, 8)}…</span></td>
        <td data-label="Status">
          <span className={`badge badge-${inc.status.toLowerCase()}`}>
            {inc.status === "Confirmed" ? "✅" : inc.status === "Flagged" ? "🚩" : "⏳"} {inc.status}
          </span>
        </td>
        <td data-label="Witnesses" style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>{inc.witness_count}</td>
        <td data-label="Location" style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--text-secondary)" }}>
          {inc.centroid_lat.toFixed(4)}, {inc.centroid_lon.toFixed(4)}
        </td>
        <td data-label="First Seen" style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
          {new Date(inc.first_seen_at).toLocaleString()}
        </td>
      </tr>
      {isSelected && (
        <tr className="detail-row">
          <td colSpan={5}>
            <IncidentDetail id={inc.id} />
          </td>
        </tr>
      )}
    </>
  );
}

function IncidentDetail({ id }: { id: string }) {

  const { data, error, isLoading } = useSWR<IncidentDetails>(
    `${BACKEND}/api/incidents/${id}`,
    fetcher
  );


  if (isLoading) return <div className="detail-content"><div className="skeleton" style={{ height: "100px", width: "100%" }} /></div>;
  if (error || !data) return <div className="detail-content" style={{ color: "var(--accent-red)" }}>Error loading incident details.</div>;

  return (
    <div className="detail-content">
      <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "24px" }}>
        <div>
          <h4 style={{ color: "var(--text-primary)", marginBottom: "12px", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            Incident Overview
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "8px", fontSize: "0.85rem" }}>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Full ID:</span>
              <span style={{ fontFamily: "monospace", color: "var(--accent-purple)" }}>{data.incidentId}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Coordinates:</span>
              <span>{data.location.lat.toFixed(6)}, {data.location.lon.toFixed(6)}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>Witness Count:</span>
              <span style={{ color: "var(--accent-cyan)", fontWeight: 600 }}>{data.witnessCount}</span>
            </div>
            <div style={{ display: "flex", justifyContent: "space-between" }}>
              <span style={{ color: "var(--text-muted)" }}>First Reported:</span>
              <span>{new Date(data.firstSeenAt).toLocaleString()}</span>
            </div>
          </div>
        </div>
        <div>
          <h4 style={{ color: "var(--text-primary)", marginBottom: "12px", fontSize: "0.9rem", textTransform: "uppercase", letterSpacing: "0.05em" }}>
            On-Chain Evidence ({data.evidenceRecords.length})
          </h4>
          <div style={{ display: "flex", flexDirection: "column", gap: "12px" }}>
            {data.evidenceRecords.map((rec, idx) => (
              <div key={idx} style={{ 
                background: "rgba(255,255,255,0.03)", 
                padding: "12px", 
                borderRadius: "8px",
                border: "1px solid var(--border-subtle)",
                fontSize: "0.8rem"
              }}>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "var(--accent-cyan)" }}>Witness Wallet</span>
                  <span style={{ fontFamily: "monospace" }}>{rec.witness_wallet.slice(0, 6)}…{rec.witness_wallet.slice(-4)}</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "var(--text-muted)" }}>Media Hash</span>
                  <span style={{ fontFamily: "monospace", fontSize: "0.75rem" }}>{rec.sha256_hash.slice(0, 16)}…</span>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between", marginBottom: "4px" }}>
                  <span style={{ color: "var(--text-muted)" }}>IPFS CID</span>
                  <a href={`https://gateway.pinata.cloud/ipfs/${rec.ipfs_cid}`} target="_blank" rel="noreferrer" style={{ color: "var(--accent-purple)", textDecoration: "none" }}>
                    {rec.ipfs_cid.slice(0, 8)}…{rec.ipfs_cid.slice(-4)} ↗
                  </a>
                </div>
                <div style={{ display: "flex", justifyContent: "space-between" }}>
                  <span style={{ color: "var(--text-muted)" }}>Solana TX</span>
                  {(rec.solana_signature || (rec as any).solanaSignature) ? (
                    <a href={`https://explorer.solana.com/tx/${rec.solana_signature || (rec as any).solanaSignature}?cluster=devnet`} target="_blank" rel="noreferrer" style={{ color: "var(--accent-cyan)", textDecoration: "none" }}>
                      {(rec.solana_signature || (rec as any).solanaSignature).slice(0, 8)}… ↗
                    </a>
                  ) : (
                    <span style={{ color: "var(--text-muted)" }}>Pending Anchor</span>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
      
    </div>
  );
}
