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

    try {
      const res = await fetch(`${BACKEND}/api/verify/summary/${query}`);
      const data = await res.json();

      if (!res.ok) throw new Error(data.error || "Verification failed");
      setResult(data);
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
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
            authenticity.
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
          <div style={{ maxWidth: "900px", margin: "0 auto", marginBottom: "100px" }}>
            {/* Public Summary Badge Section */}
            <div className="card" style={{ 
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
