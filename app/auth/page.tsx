"use client";

import { useState, useEffect } from "react";
import { supabase } from "@/lib/supabase";

const LANGUAGES = [
  { code: "en-US", label: "EN" },
  { code: "es-ES", label: "ES" },
  { code: "fr-FR", label: "FR" },
  { code: "de-DE", label: "DE" },
  { code: "id-ID", label: "ID" },
];

export default function AuthPage() {
  const [mode,     setMode]     = useState<"signin" | "signup">("signin");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [info,     setInfo]     = useState<string | null>(null);
  const [language, setLanguage] = useState("en-US");

  useEffect(() => {
    try { setLanguage(localStorage.getItem("today-language") || "en-US"); } catch {}
  }, []);

  function applyLanguage(code: string) {
    setLanguage(code);
    try { localStorage.setItem("today-language", code); } catch {}
    window.dispatchEvent(new CustomEvent("settings-updated"));
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });
        console.log("[Auth] signUp data:", data, "error:", error);

        if (error) {
          setError(error.message);
          return;
        }

        if (data.session) {
          setInfo("Account created! Redirecting…");
          window.location.href = "/";
          return;
        }

        // No session yet (e.g. email confirmation pending — shouldn't happen
        // if confirmation is disabled, but handle gracefully)
        setInfo("Account created — signing you in…");
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        console.log("[Auth] post-signup signIn:", signInData, signInErr);
        if (signInData.session) {
          window.location.href = "/";
        } else {
          setError(signInErr?.message ?? "Could not sign in after registration.");
        }
        return;
      }

      // Sign in
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });
      console.log("[Auth] signIn data:", data, "error:", error);

      if (error && error.message !== "Email not confirmed") {
        setError(error.message);
        return;
      }

      if (data.session) {
        setInfo("Signed in! Redirecting…");
        window.location.href = "/";
        return;
      }

      // "Email not confirmed" path — session may still exist in storage
      const { data: { session } } = await supabase.auth.getSession();
      console.log("[Auth] getSession after signIn:", session);
      if (session) {
        window.location.href = "/";
      } else {
        setError("Could not establish a session. Check your credentials or try signing up.");
      }
    } catch (err) {
      console.error("[Auth] unexpected error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

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
          <p style={{ fontSize: "0.875rem", color: "var(--c-text3)", marginTop: "0.375rem" }}>
            Your personal morning dashboard
          </p>
        </div>

        <div style={{
          backgroundColor: "var(--c-card)",
          border: "1px solid var(--c-border)",
          borderRadius: "1.25rem",
          padding: "1.75rem",
          boxShadow: "var(--c-shadow-h)",
        }}>

          {/* Language picker */}
          <div style={{ display: "flex", justifyContent: "center", gap: "0.375rem", marginBottom: "1.25rem" }}>
            {LANGUAGES.map(lang => (
              <button
                key={lang.code}
                type="button"
                onClick={() => applyLanguage(lang.code)}
                style={{
                  padding: "0.25rem 0.625rem",
                  borderRadius: "9999px",
                  fontSize: "0.75rem",
                  fontWeight: language === lang.code ? 700 : 400,
                  cursor: "pointer",
                  border: `1.5px solid ${language === lang.code ? "var(--c-accent)" : "var(--c-border)"}`,
                  backgroundColor: language === lang.code ? "var(--c-accent)" : "transparent",
                  color: language === lang.code ? "var(--c-accent-fg)" : "var(--c-text3)",
                  transition: "all 0.15s",
                }}
              >
                {lang.label}
              </button>
            ))}
          </div>

          {/* Mode toggle */}
          <div style={{
            display: "flex", gap: "0.25rem", padding: "0.25rem",
            borderRadius: "0.875rem", backgroundColor: "var(--c-item)", marginBottom: "1.5rem",
          }}>
            {(["signin", "signup"] as const).map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => { setMode(m); setError(null); setInfo(null); }}
                style={{
                  flex: 1, padding: "0.5rem", borderRadius: "0.625rem",
                  fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", border: "none",
                  backgroundColor: mode === m ? "var(--c-card)" : "transparent",
                  color: mode === m ? "var(--c-text1)" : "var(--c-text3)",
                  boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                  transition: "all 0.15s",
                }}
              >
                {m === "signin" ? "Sign in" : "Sign up"}
              </button>
            ))}
          </div>

          <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
            <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--c-text3)" }}>Email</span>
              <input
                type="email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                required
                autoComplete="email"
                className="th-input"
                style={{ fontSize: "0.875rem", borderRadius: "0.625rem", padding: "0.625rem 0.75rem" }}
              />
            </label>

            <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
              <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--c-text3)" }}>Password</span>
              <input
                type="password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                required
                minLength={6}
                autoComplete={mode === "signup" ? "new-password" : "current-password"}
                className="th-input"
                style={{ fontSize: "0.875rem", borderRadius: "0.625rem", padding: "0.625rem 0.75rem" }}
              />
            </label>

            {error && (
              <p style={{ fontSize: "0.8125rem", color: "#c45050", textAlign: "center", margin: 0 }}>
                {error}
              </p>
            )}
            {info && (
              <p style={{ fontSize: "0.8125rem", color: "var(--c-accent)", textAlign: "center", margin: 0 }}>
                {info}
              </p>
            )}

            <button
              type="submit"
              disabled={busy}
              className="th-btn"
              style={{
                padding: "0.625rem", borderRadius: "0.625rem",
                fontSize: "0.875rem", fontWeight: 600, marginTop: "0.125rem",
                opacity: busy ? 0.6 : 1, cursor: busy ? "default" : "pointer",
              }}
            >
              {busy ? "…" : mode === "signin" ? "Sign in" : "Create account"}
            </button>
          </form>

          <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.25rem 0" }}>
            <div style={{ flex: 1, height: 1, backgroundColor: "var(--c-divider)" }} />
            <span style={{ fontSize: "0.75rem", color: "var(--c-text3)" }}>or</span>
            <div style={{ flex: 1, height: 1, backgroundColor: "var(--c-divider)" }} />
          </div>

          <button
            type="button"
            onClick={() => { window.location.href = "/"; }}
            style={{
              width: "100%", padding: "0.625rem", borderRadius: "0.625rem",
              fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
              color: "var(--c-text2)", backgroundColor: "transparent",
              border: "1px solid var(--c-border)", transition: "border-color 0.15s",
            }}
            onMouseEnter={(e) => (e.currentTarget.style.borderColor = "var(--c-accent)")}
            onMouseLeave={(e) => (e.currentTarget.style.borderColor = "var(--c-border)")}
          >
            Continue as guest →
          </button>

        </div>
      </div>
    </div>
  );
}
