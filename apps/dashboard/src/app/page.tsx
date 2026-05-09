"use client";

import Navbar from "@/components/Navbar";
import HeatmapSection from "@/components/HeatmapSection";
import useSWR from "swr";

const fetcher = (url: string) => fetch(url).then(res => res.json());
const BACKEND = process.env.NEXT_PUBLIC_BACKEND_URL || "https://witnesschain-backend.onrender.com";

export default function HomePage() {
  const { data: stats } = useSWR(`${BACKEND}/api/stats`, fetcher, {
    refreshInterval: 10000, // Refresh every 10s
  });

  const statItems = [
    { label: "Total Incidents",    value: stats?.totalIncidents ?? "—",    cls: "purple" },
    { label: "Confirmed Evidence", value: stats?.confirmedEvidence ?? "—", cls: "cyan"   },
    { label: "Active Witnesses",   value: stats?.activeWitnesses ?? "—",   cls: "purple" },
    { label: "On-chain Anchors",   value: stats?.onChainAnchors ?? "—",    cls: "cyan"   },
    { label: "Legal Exports",      value: stats?.legalExports ?? "—",      cls: "amber"  },
  ];

  return (
    <>
      <Navbar />

      {/* Hero */}
      <div className="hero">
        <div className="page-container">
          <div className="hero-eyebrow">
            <span className="hero-eyebrow-dot" />
            Live · Solana Devnet
          </div>
          <h1 className="hero-title">
            Where Bystanders Become<br />
            <span className="hero-title-gradient">Tamper-Proof Witnesses</span>
          </h1>
          <p className="hero-subtitle">
            Every recording is cryptographically hashed before upload. Every hash is
            anchored on-chain. Tampering is <strong>mathematically impossible.</strong>
          </p>
          <div className="hero-cta-group">
            <a href="#heatmap" className="btn btn-primary">View Incidents ↓</a>
            <a href="/leaderboard" className="btn btn-secondary">🏆 Leaderboard</a>
            <a href="/legal" className="btn btn-secondary">⚖️ Legal Portal</a>
          </div>
        </div>
      </div>

      {/* Stats bar */}
      <div className="stats-bar">
        {statItems.map(s => (
          <div key={s.label} className="stat-item">
            <div className={`stat-value ${s.cls}`}>{s.value}</div>
            <div className="stat-label">{s.label}</div>
          </div>
        ))}
      </div>

      <div className="page-container" id="heatmap">
        <HeatmapSection />
      </div>

      <footer className="footer">
        <div>WitnessChain · Built at NMIT Hacks 2026 · Bengaluru, India</div>
        <div className="footer-links">
          <a href="https://github.com/ZeroTamper/witnesschain" target="_blank" rel="noreferrer">GitHub</a>
          <a href="https://solana.com" target="_blank" rel="noreferrer">Solana</a>
          <a href="https://pinata.cloud" target="_blank" rel="noreferrer">IPFS / Pinata</a>
          <a href="/legal">Legal Portal</a>
        </div>
      </footer>
    </>
  );
}
