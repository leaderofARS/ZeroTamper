import type { Metadata } from "next";
import { Suspense } from "react";
import VerifyClient from "./VerifyClient";

export const metadata: Metadata = {
  title: "Verification Portal — WitnessChain",
  description: "Verify the authenticity and on-chain provenance of bystander evidence.",
};

export default function VerifyPage() {
  return (
    <Suspense fallback={<div className="loading-container">Loading Verification Engine...</div>}>
      <VerifyClient />
    </Suspense>
  );
}
