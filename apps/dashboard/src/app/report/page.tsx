import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import CaptureSection from "@/components/CaptureSection";

export const metadata: Metadata = {
  title: "Live Report — WitnessChain",
  description: "Capture and submit live tamper-proof evidence directly from your browser.",
};

export default function ReportPage() {
  return (
    <>
      <Navbar />
      <div className="page-container">
        <header style={{ textAlign: "center", paddingTop: "60px", marginBottom: "40px" }}>
          <h1 className="hero-title" style={{ fontSize: "2.5rem" }}>
            Live <span className="hero-title-gradient">Evidence Capture</span>
          </h1>
          <p className="hero-subtitle" style={{ maxWidth: "600px" }}>
            Use your device camera to capture live incidents. The recording is hashed 
            instantly and queued for on-chain anchoring.
          </p>
        </header>

        <CaptureSection />

        <div style={{ maxWidth: "600px", margin: "40px auto", padding: "0 20px", color: "var(--text-muted)", fontSize: "0.85rem", textAlign: "center" }}>
          <p>
            <strong>Note:</strong> No media is stored on our servers until it is hashed 
            and signed. By capturing evidence, you are providing a cryptographically 
            sealed witness report.
          </p>
        </div>
      </div>
    </>
  );
}
