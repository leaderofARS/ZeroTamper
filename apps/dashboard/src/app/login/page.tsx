"use client";

import { useState } from "react";
import { createClient } from "@/utils/supabase/client";
import Navbar from "@/components/Navbar";

export default function LoginPage() {
  const [email, setEmail] = useState("");
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState("");
  const [error, setError] = useState("");
  const supabase = createClient();

    const handleAuth = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setMessage("");
    setError("");

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: "https://zero-tamper-dashboard.vercel.app",
      },
    });

    if (error) {
      setError(error.message);
    } else {
      setMessage("Check your email for the magic link!");
    }
    setLoading(false);
  };

  const handleOAuth = async (provider: 'google' | 'github') => {
    const { error } = await supabase.auth.signInWithOAuth({
      provider,
      options: {
        redirectTo: "https://zero-tamper-dashboard.vercel.app",
      },
    });
    if (error) setError(error.message);
  };

  return (
    <>
      <Navbar />
      <div className="page-container" style={{ display: "flex", alignItems: "center", justifyContent: "center", minHeight: "80vh" }}>
        <div className="card" style={{ maxWidth: "400px", width: "100%", padding: "40px" }}>
          <div style={{ textAlign: "center", marginBottom: "32px" }}>
            <div style={{ fontSize: "3rem", marginBottom: "16px" }}>🛡️</div>
            <h1 style={{ fontSize: "1.8rem", marginBottom: "8px" }}>Welcome Back</h1>
            <p style={{ color: "var(--text-muted)", fontSize: "0.95rem" }}>
              Sign in to access the Legal Portal and manage your witness profile.
            </p>
          </div>

          <form onSubmit={handleAuth}>
            <div className="input-group" style={{ marginBottom: "24px" }}>
              <label className="input-label" htmlFor="email">Email Address</label>
              <input
                id="email"
                type="email"
                className="input-field"
                placeholder="guardian@witnesschain.io"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
              />
            </div>

            {message && (
              <div style={{
                padding: "12px 16px",
                background: "rgba(187,154,247,0.1)",
                border: "1px solid rgba(187,154,247,0.3)",
                borderRadius: "var(--radius-md)",
                color: "var(--accent-purple)",
                marginBottom: "24px",
                fontSize: "0.875rem",
                textAlign: "center"
              }}>
                ✨ {message}
              </div>
            )}

            {error && (
              <div style={{
                padding: "12px 16px",
                background: "rgba(255,77,109,0.1)",
                border: "1px solid rgba(255,77,109,0.3)",
                borderRadius: "var(--radius-md)",
                color: "var(--accent-red)",
                marginBottom: "24px",
                fontSize: "0.875rem",
                textAlign: "center"
              }}>
                ⚠️ {error}
              </div>
            )}

            <button
              type="submit"
              className="btn btn-primary"
              style={{ width: "100%", padding: "12px" }}
              disabled={loading}
            >
              {loading ? "Sending link..." : "Send Magic Link"}
            </button>

            <div style={{ display: "flex", alignItems: "center", margin: "24px 0", gap: "12px" }}>
              <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
              <span style={{ fontSize: "0.75rem", color: "var(--text-muted)", textTransform: "uppercase" }}>Or continue with</span>
              <div style={{ flex: 1, height: "1px", background: "var(--border-subtle)" }} />
            </div>

            <div style={{ display: "grid", gridTemplateColumns: "1fr 1fr", gap: "12px" }}>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ justifyContent: "center" }}
                onClick={() => handleOAuth('google')}
              >
                Google
              </button>
              <button 
                type="button" 
                className="btn btn-secondary" 
                style={{ justifyContent: "center" }}
                onClick={() => handleOAuth('github')}
              >
                GitHub
              </button>
            </div>
          </form>

          <div style={{ marginTop: "32px", textAlign: "center", fontSize: "0.85rem", color: "var(--text-muted)" }}>
            No account yet? <a href="/signup" style={{ color: "var(--accent-purple)", fontWeight: 600 }}>Sign Up</a>
          </div>
        </div>
      </div>
    </>
  );
}
