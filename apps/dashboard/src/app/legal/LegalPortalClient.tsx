"use client";
import { useState } from "react";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

type EvidenceItem = {
  sha256Hash: string;
  ipfsCid: string;
  ipfsGatewayUrl: string;
  solanaSignature?: string;
  witnessWallet: string;
  submittedAt: string;
};

type Bundle = {
  incidentId: string;
  exportedAt: string;
  status: string;
  witnessCount: number;
  firstSeenAt: string;
  location: { lat: number; lon: number };
  evidenceBundle: EvidenceItem[];
  chainOfCustody: Array<{
    step: number;
    actor: string;
    action: string;
    timestamp: string;
    txSignature?: string;
  }>;
  verificationInstructions: string;
  bundleCid?: string;
};

export default function LegalPortalClient() {
  const [incidentId, setIncidentId] = useState("");
  const [apiSecret, setApiSecret]   = useState("");
  const [bundle, setBundle]         = useState<Bundle | null>(null);
  const [loading, setLoading]       = useState(false);
  const [error, setError]           = useState("");
  const [activeTab, setActiveTab]   = useState<"evidence" | "custody" | "verify">("evidence");

  async function handleExport() {
    if (!incidentId.trim() || !apiSecret.trim()) {
      setError("Incident ID and API secret are required.");
      return;
    }
    setLoading(true);
    setError("");
    setBundle(null);

    try {
      const res = await fetch(`${BACKEND}/api/export/${incidentId.trim()}`, {
        headers: { Authorization: `Bearer ${apiSecret}` },
      });

      if (!res.ok) {
        const body = await res.json().catch(() => ({}));
        throw new Error(body.error || `HTTP ${res.status}`);
      }

      const data = await res.json();
      setBundle(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  }

  async function handleDownloadPDF() {
    const res = await fetch(`${BACKEND}/api/export/${incidentId}?format=pdf`, {
      headers: { Authorization: `Bearer ${apiSecret}` },
    });
    const blob = await res.blob();
    const url  = URL.createObjectURL(blob);
    const a    = document.createElement("a");
    a.href     = url;
    a.download = `evidence-${incidentId}.pdf`;
    a.click();
    URL.revokeObjectURL(url);
  }

  return (
    <div>
      {/* Input form */}
      <div className="card" style={{ marginBottom: "32px" }}>
        <div className="card-header">
          <span style={{ fontWeight: 600 }}>Export Evidence Bundle</span>
        </div>
        <div className="card-body">
          <div className="grid-2">
            <div className="input-group">
              <label className="input-label" htmlFor="incident-id-input">Incident ID</label>
              <input
                id="incident-id-input"
                type="text"
                className="input-field"
                placeholder="550e8400-e29b-41d4-a716-446655440000"
                value={incidentId}
                onChange={e => setIncidentId(e.target.value)}
              />
            </div>
            <div className="input-group">
              <label className="input-label" htmlFor="api-secret-input">Legal API Secret</label>
              <input
                id="api-secret-input"
                type="password"
                className="input-field"
                placeholder="Bearer token"
                value={apiSecret}
                onChange={e => setApiSecret(e.target.value)}
              />
            </div>
          </div>
          {error && (
            <div style={{
              padding: "12px 16px",
              background: "rgba(255,77,109,0.1)",
              border: "1px solid rgba(255,77,109,0.3)",
              borderRadius: "var(--radius-md)",
              color: "var(--accent-red)",
              marginBottom: "16px",
              fontSize: "0.875rem",
            }}>
              ⚠️ {error}
            </div>
          )}
          <button
            id="export-btn"
            className="btn btn-primary"
            onClick={handleExport}
            disabled={loading}
          >
            {loading ? "Fetching…" : "🔍 Retrieve Evidence Bundle"}
          </button>
        </div>
      </div>

      {/* Bundle result */}
      {bundle && (
        <div>
          {/* Summary header */}
          <div className="card" style={{ marginBottom: "20px" }}>
            <div className="card-body">
              <div className="grid-3" style={{ gap: "24px" }}>
                <div>
                  <div className="stat-label">Incident ID</div>
                  <div style={{ fontFamily: "monospace", fontSize: "0.85rem", marginTop: "4px", color: "var(--text-primary)" }}>
                    {bundle.incidentId}
                  </div>
                </div>
                <div>
                  <div className="stat-label">Status</div>
                  <span className={`badge badge-${bundle.status.toLowerCase()}`} style={{ marginTop: "4px", display: "inline-flex" }}>
                    {bundle.status}
                  </span>
                </div>
                <div>
                  <div className="stat-label">Witnesses</div>
                  <div className="stat-value cyan" style={{ fontSize: "1.5rem", marginTop: "4px" }}>
                    {bundle.witnessCount}
                  </div>
                </div>
                <div>
                  <div className="stat-label">First Seen</div>
                  <div style={{ fontSize: "0.875rem", marginTop: "4px" }}>
                    {new Date(bundle.firstSeenAt).toLocaleString()}
                  </div>
                </div>
                <div>
                  <div className="stat-label">Location</div>
                  <div style={{ fontFamily: "monospace", fontSize: "0.85rem", marginTop: "4px" }}>
                    {bundle.location.lat.toFixed(6)}, {bundle.location.lon.toFixed(6)}
                  </div>
                </div>
                {bundle.bundleCid && (
                  <div>
                    <div className="stat-label">Bundle CID (IPFS)</div>
                    <a
                      href={`https://gateway.pinata.cloud/ipfs/${bundle.bundleCid}`}
                      target="_blank"
                      rel="noreferrer"
                      style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--accent-cyan)", marginTop: "4px", display: "block" }}
                    >
                      {bundle.bundleCid.slice(0, 20)}…
                    </a>
                  </div>
                )}
              </div>
            </div>
            <div className="card-footer">
              <button id="download-pdf-btn" className="btn btn-primary" onClick={handleDownloadPDF}>
                📄 Download PDF Bundle
              </button>
              <button
                id="copy-json-btn"
                className="btn btn-secondary"
                onClick={() => navigator.clipboard.writeText(JSON.stringify(bundle, null, 2))}
              >
                📋 Copy JSON
              </button>
            </div>
          </div>

          {/* Tabs */}
          <div className="tabs">
            {(["evidence", "custody", "verify"] as const).map(tab => (
              <button
                key={tab}
                id={`tab-${tab}`}
                className={`tab ${activeTab === tab ? "active" : ""}`}
                onClick={() => setActiveTab(tab)}
              >
                {tab === "evidence" ? "📎 Evidence Records"
                  : tab === "custody" ? "🔗 Chain of Custody"
                  : "✅ Verification"}
              </button>
            ))}
          </div>

          {/* Evidence tab */}
          {activeTab === "evidence" && (
            <div className="card">
              <table className="evidence-table">
                <thead>
                  <tr>
                    <th>#</th>
                    <th>SHA-256 Hash</th>
                    <th>IPFS CID</th>
                    <th>Solana Tx</th>
                    <th>Submitted</th>
                  </tr>
                </thead>
                <tbody>
                  {bundle.evidenceBundle.map((e, i) => (
                    <tr key={i}>
                      <td style={{ color: "var(--text-muted)" }}>{i + 1}</td>
                      <td><span className="hash-chip">{e.sha256Hash.slice(0, 12)}…</span></td>
                      <td>
                        <a
                          href={e.ipfsGatewayUrl}
                          target="_blank"
                          rel="noreferrer"
                          style={{ color: "var(--accent-cyan)", fontFamily: "monospace", fontSize: "0.8rem" }}
                        >
                          {e.ipfsCid.slice(0, 10)}…
                        </a>
                      </td>
                      <td>
                        {e.solanaSignature ? (
                          <a
                            href={`https://explorer.solana.com/tx/${e.solanaSignature}?cluster=devnet`}
                            target="_blank"
                            rel="noreferrer"
                            style={{ color: "var(--accent-purple)", fontFamily: "monospace", fontSize: "0.8rem" }}
                          >
                            {e.solanaSignature.slice(0, 10)}…
                          </a>
                        ) : (
                          <span style={{ color: "var(--text-muted)" }}>pending</span>
                        )}
                      </td>
                      <td style={{ color: "var(--text-muted)", fontSize: "0.85rem" }}>
                        {new Date(e.submittedAt).toLocaleString()}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          {/* Chain of custody tab */}
          {activeTab === "custody" && (
            <div className="card">
              <div className="card-body">
                <div style={{ position: "relative" }}>
                  {bundle.chainOfCustody.map((step, i) => (
                    <div
                      key={i}
                      style={{
                        display: "flex",
                        gap: "16px",
                        marginBottom: i < bundle.chainOfCustody.length - 1 ? "24px" : 0,
                        position: "relative",
                      }}
                    >
                      <div style={{ display: "flex", flexDirection: "column", alignItems: "center" }}>
                        <div style={{
                          width: "36px",
                          height: "36px",
                          borderRadius: "50%",
                          background: "linear-gradient(135deg, var(--accent-purple), var(--accent-cyan))",
                          display: "flex",
                          alignItems: "center",
                          justifyContent: "center",
                          fontSize: "0.85rem",
                          fontWeight: 700,
                          flexShrink: 0,
                        }}>
                          {step.step}
                        </div>
                        {i < bundle.chainOfCustody.length - 1 && (
                          <div style={{
                            width: "2px",
                            flex: 1,
                            minHeight: "24px",
                            background: "var(--border-subtle)",
                            marginTop: "4px",
                          }} />
                        )}
                      </div>
                      <div style={{ paddingTop: "6px" }}>
                        <div style={{ fontWeight: 600, marginBottom: "4px" }}>
                          {step.action}
                        </div>
                        <div style={{ fontFamily: "monospace", fontSize: "0.8rem", color: "var(--text-secondary)", marginBottom: "2px" }}>
                          {step.actor.slice(0, 12)}…{step.actor.slice(-6)}
                        </div>
                        <div style={{ fontSize: "0.8rem", color: "var(--text-muted)" }}>
                          {new Date(step.timestamp).toLocaleString()}
                          {step.txSignature && (
                            <> ·{" "}
                              <a
                                href={`https://explorer.solana.com/tx/${step.txSignature}?cluster=devnet`}
                                target="_blank"
                                rel="noreferrer"
                                style={{ color: "var(--accent-purple)" }}
                              >
                                View on-chain ↗
                              </a>
                            </>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {/* Verification tab */}
          {activeTab === "verify" && (
            <div className="card">
              <div className="card-body">
                <pre style={{
                  background: "var(--bg-surface)",
                  border: "1px solid var(--border-subtle)",
                  borderRadius: "var(--radius-md)",
                  padding: "20px",
                  fontSize: "0.875rem",
                  color: "var(--accent-cyan)",
                  whiteSpace: "pre-wrap",
                  lineHeight: 1.8,
                }}>
                  {bundle.verificationInstructions}
                </pre>
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
