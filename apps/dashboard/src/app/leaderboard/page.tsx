import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import LeaderboardClient from "./LeaderboardClient";

export const metadata: Metadata = {
  title: "Witness Leaderboard — WitnessChain",
  description: "Top witnesses ranked by score in your city. Soul-bound NFT badges for top performers.",
};

export default function LeaderboardPage() {
  return (
    <>
      <Navbar />
      <div className="page-container" style={{ paddingTop: "48px" }}>
        <div style={{ marginBottom: "40px" }}>
          <h1 className="hero-title" style={{ fontSize: "2rem", marginBottom: "12px" }}>
            🏆 Witness <span className="hero-title-gradient">Leaderboard</span>
          </h1>
          <p style={{ color: "var(--text-secondary)" }}>
            Top witnesses ranked by score. All badges are soul-bound — non-transferable, non-purchasable.
          </p>
        </div>
        <LeaderboardClient />
      </div>
    </>
  );
}
