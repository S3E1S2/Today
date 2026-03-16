"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";

export default function AccountButton() {
  const { user, loading, signOut } = useAuth();
  const router = useRouter();
  const [open,   setOpen]   = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  // Close dropdown on outside click
  useEffect(() => {
    if (!open) return;
    const handler = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [open]);

  // Close dropdown on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  if (loading) return null;

  // ── Signed out: "Sign in" pill ──────────────────────────────────────────────
  if (!user) {
    return (
      <button
        onClick={() => router.push("/auth")}
        style={{
          position: "fixed", top: "1rem", right: "3.75rem", zIndex: 40,
          height: "2.25rem", padding: "0 0.875rem", borderRadius: "9999px",
          fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer",
          backgroundColor: "var(--c-card)", color: "var(--c-text3)",
          border: "1px solid var(--c-border)", boxShadow: "var(--c-shadow)",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--c-accent)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--c-text3)")}
      >
        Sign in
      </button>
    );
  }

  // ── Signed in: initials avatar + dropdown ───────────────────────────────────
  const initials = (user.email ?? "??")
    .split("@")[0]
    .slice(0, 2)
    .toUpperCase();

  return (
    <div
      ref={wrapRef}
      style={{ position: "fixed", top: "1rem", right: "3.75rem", zIndex: 40 }}
    >
      {/* Avatar button */}
      <button
        onClick={() => setOpen((v) => !v)}
        title={user.email ?? "Account"}
        style={{
          width: "2.25rem", height: "2.25rem", borderRadius: "9999px",
          backgroundColor: "var(--c-accent)", color: "var(--c-accent-fg)",
          border: "none", cursor: "pointer",
          fontSize: "0.6875rem", fontWeight: 700, letterSpacing: "0.05em",
          display: "flex", alignItems: "center", justifyContent: "center",
          boxShadow: "var(--c-shadow)",
        }}
      >
        {initials}
      </button>

      {/* Dropdown */}
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 0.5rem)",
          backgroundColor: "var(--c-card)",
          border: "1px solid var(--c-border)",
          borderRadius: "0.875rem",
          boxShadow: "0 4px 20px rgba(0,0,0,0.12), 0 1px 4px rgba(0,0,0,0.08)",
          padding: "0.5rem",
          minWidth: 210,
        }}>
          {/* Email */}
          <p style={{
            fontSize: "0.75rem", color: "var(--c-text3)",
            padding: "0.375rem 0.75rem 0.5rem",
            overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap",
          }}>
            {user.email}
          </p>
          <div style={{ height: 1, backgroundColor: "var(--c-divider)", margin: "0 0 0.25rem" }} />

          {/* Sign out */}
          <button
            onClick={async () => { setOpen(false); await signOut(); }}
            style={{
              width: "100%", textAlign: "left",
              padding: "0.5rem 0.75rem", borderRadius: "0.5rem",
              fontSize: "0.875rem", cursor: "pointer",
              color: "#c45050", backgroundColor: "transparent", border: "none",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.backgroundColor = "var(--c-item)")}
            onMouseLeave={(e) => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
