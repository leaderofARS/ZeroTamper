import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "WitnessChain — Decentralized Bystander Evidence Network",
  description:
    "Tamper-proof civic evidence on Solana. Every witness is a player, every recording is immutable, justice has a leaderboard.",
  keywords: "blockchain, evidence, Solana, IPFS, civic, witness, tamper-proof",
  openGraph: {
    title: "WitnessChain",
    description: "Decentralized Bystander Evidence Network on Solana",
    type: "website",
  },
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="en">
      <head>
        <link rel="preconnect" href="https://fonts.googleapis.com" />
        <link rel="preconnect" href="https://fonts.gstatic.com" crossOrigin="anonymous" />
        <link
          href="https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700;800;900&family=Space+Grotesk:wght@400;500;600;700&display=swap"
          rel="stylesheet"
        />
      </head>
      <body>{children}</body>
    </html>
  );
}
