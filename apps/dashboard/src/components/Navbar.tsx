"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";

const NAV_LINKS = [
  { href: "/",            label: "🗺️ Heatmap"    },
  { href: "/leaderboard", label: "🏆 Leaderboard" },
  { href: "/legal",       label: "⚖️ Legal Portal" },
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

        <span className="navbar-badge">Devnet</span>
      </div>
    </nav>
  );
}
