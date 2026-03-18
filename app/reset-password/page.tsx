"use client";

import { useEffect, useState } from "react";
import { supabase } from "@/lib/supabase";
import { applyThemeVars } from "@/components/ThemeProvider";

export default function ResetPasswordPage() {
  const [password,  setPassword]  = useState("");
  const [confirm,   setConfirm]   = useState("");
  const [busy,      setBusy]      = useState(false);
  const [error,     setError]     = useState<string | null>(null);
  const [success,   setSuccess]   = useState(false);
  const [ready,     setReady]     = useState(false); // session established from URL hash

  useEffect(() => {
    applyThemeVars("default");

    // Supabase puts the recovery token in the URL hash — exchange it for a session
    supabase.auth.onAuthStateChange((event) => {
      if (event === "PASSWORD_RECOVERY") {
        setReady(true);
      }
    });

    // Also try getSession in case the state already fired
    supabase.auth.getSession().then(({ data }) => {
      if (data.session) setReady(true);
    });
  }, []);

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setError(null);
    if (password !== confirm) { setError("Passwords don't match."); return; }
    if (password.length < 6)  { setError("Password must be at least 6 characters."); return; }

    setBusy(true);
    try {
      const { error } = await supabase.auth.updateUser({ password });
      if (error) { setError(error.message); return; }
      setSuccess(true);
      setTimeout(() => { window.location.href = "/"; }, 2000);
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const inputStyle: React.CSSProperties = {
    fontSize: "0.875rem", borderRadius: "0.625rem",
    padding: "0.625rem 0.75rem",
  };

  return (
    <div style={{
      minHeight: "100vh",
      backgroundColor: "var(--c-bg)",
      display: "flex",
      alignItems: "center",
      justifyContent: "center",
      padding: "1.5rem",
    }}>
      <div style={{ width: "100%", maxWidth: 380 }}>
        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--c-text1)", letterSpacing: "-0.02em" }}>
            Today ☀️
          </h1>
        </div>

        <div style={{
          backgroundColor: "var(--c-card)",
          border: "1px solid var(--c-border)",
          borderRadius: "1.25rem",
          padding: "1.75rem",
          boxShadow: "var(--c-shadow-h)",
        }}>
          <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--c-text1)", margin: "0 0 0.375rem" }}>
            Set new password
          </h2>
          <p style={{ fontSize: "0.8125rem", color: "var(--c-text3)", margin: "0 0 1.25rem" }}>
            Choose a new password for your account.
          </p>

          {success ? (
            <p style={{ fontSize: "0.875rem", color: "var(--c-accent)", textAlign: "center", fontWeight: 500 }}>
              Password updated! Redirecting…
            </p>
          ) : !ready ? (
            <p style={{ fontSize: "0.875rem", color: "var(--c-text3)", textAlign: "center" }}>
              Verifying reset link…
            </p>
          ) : (
            <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
              <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--c-text3)" }}>New password</span>
                <input
                  type="password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="th-input"
                  style={inputStyle}
                  autoFocus
                />
              </label>

              <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--c-text3)" }}>Confirm new password</span>
                <input
                  type="password"
                  value={confirm}
                  onChange={e => setConfirm(e.target.value)}
                  required
                  minLength={6}
                  autoComplete="new-password"
                  className="th-input"
                  style={inputStyle}
                />
              </label>

{error && <p style={{ fontSize: "0.8125rem", color: "#c45050", textAlign: "center", margin: 0 }}>{error}</p>}

              <button
                type="submit"
                disabled={busy}
                className="th-btn"
                style={{
                  padding: "0.625rem", borderRadius: "0.625rem",
                  fontSize: "0.875rem", fontWeight: 600,
                  opacity: busy ? 0.6 : 1, cursor: busy ? "default" : "pointer",
                }}
              >
                {busy ? "Updating…" : "Update password"}
              </button>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
