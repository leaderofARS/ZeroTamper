import type { Metadata } from "next";
import Navbar from "@/components/Navbar";
import LegalPortalClient from "./LegalPortalClient";

export const metadata: Metadata = {
  title: "Legal Evidence Portal — WitnessChain",
  description: "Authorized law enforcement evidence export portal. Pull tamper-proof evidence bundles with full provenance.",
};

export default function LegalPage() {
  return (
    <>
      <Navbar />
      <div className="page-container" style={{ paddingTop: "48px" }}>
        <div className="legal-portal-header">
          <span className="legal-icon">⚖️</span>
          <div>
            <h1 style={{ fontSize: "1.6rem" }}>Legal Evidence Export Portal</h1>
            <p>
              Authorized law enforcement access only. All exports are cryptographically verified and
              logged on-chain. This portal is rate-limited and all access is auditable.
            </p>
          </div>
        </div>
        <LegalPortalClient />
      </div>
    </>
  );
}
