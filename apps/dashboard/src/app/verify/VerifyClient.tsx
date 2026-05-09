"use client";

import { useState, useEffect } from "react";
import Navbar from "@/components/Navbar";
import { useSearchParams } from "next/navigation";

const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "http://localhost:4000";

export default function VerifyClient() {
  const searchParams = useSearchParams();
  const queryParam = searchParams.get("q");

  const [query, setQuery] = useState(queryParam || "");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<any>(null);
  const [premiumData, setPremiumData] = useState<any>(null);
  const [error, setError] = useState("");

  const handleVerify = async (e?: React.FormEvent) => {
    if (e) e.preventDefault();
    if (!query) return;

    setLoading(true);
    setError("");
    setResult(null);
    setPremiumData(null);

    try {
      const res = await fetch(`${BACKEND}/api/verify/summary/${query}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Verification failed");
      setResult(data);
      
      // Auto-fetch premium if we found an incident
      if (data.incidentId) {
        fetchPremium(data.incidentId);
      }
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchPremium = async (id: string) => {
    try {
      const res = await fetch(`${BACKEND}/api/verify/premium/${id}`);
      const data = await res.json();
      if (res.ok) setPremiumData(data);
    } catch (e) {
      console.error("Premium fetch failed", e);
    }
  };

  useEffect(() => {
    if (queryParam) handleVerify();
  }, [queryParam]);

  return (
    <>
      <Navbar />
      <div className="page-container">
        <header style={{ textAlign: "center", paddingTop: "60px", marginBottom: "40px" }}>
          <h1 className="hero-title" style={{ fontSize: "2.5rem" }}>
            On-chain <span className="hero-title-gradient">Verification Portal</span>
          </h1>
          <p className="hero-subtitle" style={{ maxWidth: "600px" }}>
            Enter an Incident ID, Evidence Hash, or Solana Signature to verify 
            authenticity and trace provenance.
          </p>
        </header>

        <div className="card" style={{ maxWidth: "700px", margin: "0 auto 40px", padding: "32px" }}>
          <form onSubmit={handleVerify} style={{ display: "flex", gap: "12px" }}>
            <input
              className="input-field"
              style={{ flex: 1 }}
              placeholder="UUID, SHA256 Hash, or Solana Signature..."
              value={query}
              onChange={(e) => setQuery(e.target.value)}
            />
            <button className="btn btn-primary" disabled={loading}>
              {loading ? "Verifying..." : "Verify Status"}
            </button>
          </form>
          {error && <p style={{ color: "var(--accent-red)", marginTop: "12px", fontSize: "0.9rem" }}>⚠️ {error}</p>}
        </div>

        {result && (
          <div style={{ maxWidth: "900px", margin: "0 auto" }}>
            {/* Public Summary Badge Section */}
            <div className="card" style={{ 
              marginBottom: "32px", 
              border: result.isVerified ? "1px solid var(--accent-green)" : "1px solid var(--accent-orange)",
              background: result.isVerified ? "rgba(77,255,171,0.02)" : "rgba(255,171,77,0.02)"
            }}>
              <div className="card-body" style={{ display: "flex", alignItems: "center", justifyContent: "space-between", padding: "40px" }}>
                <div>
                  <div style={{ 
                    display: "inline-flex", 
                    alignItems: "center", 
                    gap: "8px", 
                    background: result.isVerified ? "var(--accent-green)" : "var(--accent-orange)",
                    color: "#000",
                    padding: "6px 16px",
                    borderRadius: "100px",
                    fontWeight: 800,
                    fontSize: "0.8rem",
                    textTransform: "uppercase",
                    letterSpacing: "0.05em",
                    marginBottom: "16px"
                  }}>
                    {result.isVerified ? "✓ Verified Secure" : "⚠ Pending Verification"}
                  </div>
                  <h2 style={{ fontSize: "2rem", marginBottom: "8px" }}>{result.isVerified ? "Authentic Evidence" : "Processing Proof"}</h2>
                  <p style={{ color: "var(--text-muted)", marginBottom: "0" }}>
                    Incident <code style={{ color: "var(--text-primary)" }}>{result.incidentId.slice(0, 8)}</code> 
                    has been corroborated by {result.witnesses} independent witnesses.
                  </p>
                </div>
                <div style={{ textAlign: "center" }}>
                   <div style={{ fontSize: "4rem" }}>{result.isVerified ? "🛡️" : "⏳"}</div>
                   <div style={{ fontSize: "0.75rem", color: "var(--text-muted)", marginTop: "8px", fontFamily: "monospace" }}>
                     Timestamp: {new Date(result.timestamp).toLocaleString()}
                   </div>
                </div>
              </div>
            </div>

            {/* Premium Package Section (On-chain data) */}
            {premiumData && (
              <div className="card" style={{ marginBottom: "60px" }}>
                <div className="card-header" style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                  <h3 style={{ margin: 0 }}>End-to-End On-chain Provenance</h3>
                  <div className="badge badge-success">Premium Verification Package</div>
                </div>
                <div className="card-body" style={{ padding: "0" }}>
                  <div style={{ padding: "24px" }}>
                    <p style={{ color: "var(--text-muted)", fontSize: "0.9rem", marginBottom: "24px" }}>
                      This package displays real-time data from the Solana blockchain, verifying the exact 
                      state of the Evidence Registry at the time of submission.
                    </p>

                    {premiumData.evidence_records.map((rec: any, idx: number) => (
                      <div key={rec.id} style={{ 
                        background: "rgba(255,255,255,0.02)", 
                        borderRadius: "var(--radius-lg)", 
                        padding: "24px",
                        marginBottom: "24px",
                        border: "1px solid var(--border-subtle)"
                      }}>
                        <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-start", marginBottom: "20px" }}>
                          <div>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Evidence Hash</div>
                            <div style={{ fontFamily: "monospace", fontSize: "0.85rem", color: "var(--accent-purple)" }}>{rec.sha256_hash}</div>
                          </div>
                          <div style={{ textAlign: "right" }}>
                            <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Media Type</div>
                            <div style={{ fontSize: "0.9rem" }}>{rec.media_type}</div>
                          </div>
                        </div>

                        {rec.onChain ? (
                          <div style={{ borderTop: "1px solid var(--border-subtle)", paddingTop: "20px" }}>
                             <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "16px", marginBottom: "24px" }}>
                                <div className="info-box">
                                  <div className="info-label">On-chain Result</div>
                                  <div className="info-value" style={{ color: "var(--accent-green)" }}>SUCCESS</div>
                                </div>
                                <div className="info-box">
                                  <div className="info-label">Confirmation Status</div>
                                  <div className="info-value">FINALIZED</div>
                                </div>
                                <div className="info-box">
                                  <div className="info-label">Slot</div>
                                  <div className="info-value">{rec.onChain.slot.toLocaleString()}</div>
                                </div>
                                <div className="info-box">
                                  <div className="info-label">Transaction Fee</div>
                                  <div className="info-value">◎ {(rec.onChain.fee / 1e9).toFixed(8)}</div>
                                </div>
                             </div>

                             <div style={{ marginBottom: "16px" }}>
                                <div style={{ fontSize: "0.7rem", color: "var(--text-muted)", textTransform: "uppercase", marginBottom: "8px" }}>Instruction: SubmitEvidence</div>
                                <div style={{ 
                                  background: "#000", 
                                  padding: "16px", 
                                  borderRadius: "8px", 
                                  fontFamily: "monospace", 
                                  fontSize: "0.75rem",
                                  border: "1px solid var(--border-subtle)",
                                  overflow: "auto"
                                }}>
                                  <div style={{ color: "var(--accent-purple)", marginBottom: "4px" }}>// Program: EvidenceRegistry</div>
                                  <div>witness: <span style={{ color: "var(--accent-blue)" }}>{rec.witness_wallet}</span></div>
                                  <div>ipfs_cid: <span style={{ color: "var(--accent-orange)" }}>"{rec.ipfs_cid}"</span></div>
                                  <div>latitude: <span style={{ color: "var(--accent-green)" }}>{premiumData.centroid_lat}</span></div>
                                  <div>longitude: <span style={{ color: "var(--accent-green)" }}>{premiumData.centroid_lon}</span></div>
                                </div>
                             </div>

                             <div style={{ display: "flex", gap: "12px", marginTop: "16px" }}>
                                <a 
                                  href={`https://explorer.solana.com/tx/${rec.solana_signature}?cluster=devnet`} 
                                  target="_blank" 
                                  className="btn btn-secondary" 
                                  style={{ flex: 1, fontSize: "0.8rem", padding: "10px" }}
                                >
                                  View on Explorer
                                </a>
                                <a 
                                  href={`https://gateway.pinata.cloud/ipfs/${rec.ipfs_cid}`} 
                                  target="_blank" 
                                  className="btn btn-secondary" 
                                  style={{ flex: 1, fontSize: "0.8rem", padding: "10px" }}
                                >
                                  View Media Source
                                </a>
                             </div>
                          </div>
                        ) : (
                          <div style={{ textAlign: "center", padding: "20px", color: "var(--text-muted)" }}>
                            On-chain technical data currently unavailable for this record.
                          </div>
                        )}
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      <style jsx>{`
        .info-box {
          background: rgba(255,255,255,0.03);
          padding: 12px 16px;
          border-radius: 8px;
        }
        .info-label {
          font-size: 0.65rem;
          color: var(--text-muted);
          text-transform: uppercase;
          margin-bottom: 4px;
          letter-spacing: 0.05em;
        }
        .info-value {
          font-size: 0.95rem;
          font-weight: 600;
          font-family: monospace;
        }
      `}</style>
    </>
  );
}
