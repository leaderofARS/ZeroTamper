"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import dynamic from "next/dynamic";
import AuthButton from "./AuthButton";

const WalletMultiButton = dynamic(
  async () => (await import("@solana/wallet-adapter-react-ui")).WalletMultiButton,
  { ssr: false }
);

const NAV_LINKS = [
  { href: "/",            label: "🗺️ Heatmap"    },
  { href: "/report",      label: "🎥 Live Report" },
  { href: "/leaderboard", label: "🏆 Leaderboard" },
  { href: "/legal",       label: "⚖️ Legal Portal" },
  { href: "/verify",      label: "🛡️ Verify"       },
];

export default function Navbar() {
  const pathname = usePathname();

  return (
    <nav className="navbar">
      <div className="navbar-inner">
        <Link href="/" className="navbar-logo">
          <span className="navbar-logo-icon">🔗</span>
          WitnessChain
        </Link>

        <ul className="navbar-links">
          {NAV_LINKS.map(({ href, label }) => (
            <li key={href}>
              <Link href={href} className={pathname === href ? "active" : ""}>
                {label}
              </Link>
            </li>
          ))}
        </ul>

        <div style={{ display: "flex", alignItems: "center", gap: "16px" }}>
          <span className="navbar-badge" style={{ margin: 0 }}>Devnet</span>
          <AuthButton />
          <div className="wallet-btn-wrapper">
             <WalletMultiButton />
          </div>
        </div>
      </div>
    </nav>
  );
}
