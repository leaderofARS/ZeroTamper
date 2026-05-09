"use client";

import { useEffect, useState } from "react";
import { createClient } from "@/utils/supabase/client";
import { User } from "@supabase/supabase-js";

export default function AuthButton() {
  const [user, setUser] = useState<User | null>(null);
  const [loading, setLoading] = useState(true);
  const supabase = createClient();

  useEffect(() => {
    const getUser = async () => {
      const { data: { user } } = await supabase.auth.getUser();
      setUser(user);
      setLoading(false);
    };

    getUser();

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null);
    });

    return () => subscription.unsubscribe();
  }, [supabase.auth]);

  const handleSignOut = async () => {
    await supabase.auth.signOut();
  };

  const handleSignIn = async () => {
    // For simplicity in hackathon, we'll use a magic link or just redirect to a login page
    // but here we can trigger a simple prompt or redirect
    const email = window.prompt("Enter your email to sign in:");
    if (!email) return;

    const { error } = await supabase.auth.signInWithOtp({
      email,
      options: {
        emailRedirectTo: window.location.origin,
      },
    });

    if (error) {
      alert("Error: " + error.message);
    } else {
      alert("Check your email for the login link!");
    }
  };

  if (loading) return <div className="btn btn-secondary" style={{ opacity: 0.5 }}>...</div>;

  if (user) {
    return (
      <div style={{ display: "flex", alignItems: "center", gap: "12px" }}>
        <span style={{ fontSize: "0.85rem", color: "var(--text-muted)" }}>
          {user.email?.split("@")[0]}
        </span>
        <button onClick={handleSignOut} className="btn btn-secondary" style={{ padding: "8px 16px" }}>
          Sign Out
        </button>
      </div>
    );
  }

  return (
    <div style={{ display: "flex", gap: "8px" }}>
      <button onClick={handleSignIn} className="btn btn-primary" style={{ padding: "8px 16px" }}>
        Login
      </button>
    </div>
  );
}
