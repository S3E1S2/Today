"use client";

import { useState, useEffect, useLayoutEffect } from "react";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "@/components/LanguageProvider";
import { applyThemeVars } from "@/components/ThemeProvider";
import type { ThemeId } from "@/components/ThemeProvider";

const LANGUAGES = [
  { code: "en-US", label: "EN" },
  { code: "es-ES", label: "ES" },
  { code: "fr-FR", label: "FR" },
  { code: "de-DE", label: "DE" },
  { code: "id-ID", label: "ID" },
];

function GlobeIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <line x1="2" y1="12" x2="22" y2="12" />
      <path d="M12 2a15.3 15.3 0 0 1 4 10 15.3 15.3 0 0 1-4 10 15.3 15.3 0 0 1-4-10 15.3 15.3 0 0 1 4-10z" />
    </svg>
  );
}

// ── Demo data generator ───────────────────────────────────────────────────────

function dateStr(daysAgo: number): string {
  const d = new Date();
  d.setDate(d.getDate() - daysAgo);
  return d.toLocaleDateString("en-CA");
}

function loadDemoData() {
  const habits = [
    { id: "demo-h1", name: "Morning run",          completedDates: [] as string[] },
    { id: "demo-h2", name: "Read 30 min",           completedDates: [] as string[] },
    { id: "demo-h3", name: "Meditate",              completedDates: [] as string[] },
    { id: "demo-h4", name: "8 glasses of water",    completedDates: [] as string[] },
    { id: "demo-h5", name: "No screens after 9 pm", completedDates: [] as string[] },
  ];

  // Completion patterns (true = done). Index 0 = today, index 1 = yesterday, etc.
  const patterns: boolean[][] = [
    [true,  true,  false, true,  true,  true,  false, true,  true,  true,  false, true,  true,  true,  true,  false, true,  true,  true,  true,  true,  false, true,  true,  true,  true,  false, true,  true,  true],
    [true,  false, true,  true,  true,  false, true,  true,  true,  true,  true,  false, true,  true,  true,  true,  true,  false, true,  true,  true,  true,  false, true,  true,  true,  true,  true,  false, true],
    [false, true,  true,  true,  false, true,  true,  false, true,  true,  true,  true,  true,  false, true,  true,  true,  true,  false, true,  true,  true,  true,  true,  false, true,  true,  true,  true,  false],
    [true,  true,  true,  false, true,  true,  true,  true,  false, true,  true,  true,  false, true,  true,  true,  true,  true,  true,  false, true,  true,  true,  false, true,  true,  true,  true,  false, true],
    [false, false, true,  true,  true,  false, false, true,  true,  false, true,  true,  true,  false, false, true,  true,  true,  true,  false, true,  false, true,  true,  true,  false, false, true,  true,  true],
  ];

  patterns.forEach((pat, i) => {
    pat.forEach((done, daysAgo) => {
      if (done) habits[i].completedDates.push(dateStr(daysAgo));
    });
  });

  const sleepEntries = [
    { date: dateStr(1),  bedtime: "23:00", wakeup: "07:10", hours: 8.2, quality: 4, score: 91 },
    { date: dateStr(2),  bedtime: "23:30", wakeup: "07:00", hours: 7.5, quality: 3, score: 77 },
    { date: dateStr(3),  bedtime: "22:45", wakeup: "06:50", hours: 8.1, quality: 5, score: 96 },
    { date: dateStr(4),  bedtime: "00:00", wakeup: "07:30", hours: 7.5, quality: 3, score: 77 },
    { date: dateStr(5),  bedtime: "23:15", wakeup: "07:20", hours: 8.1, quality: 4, score: 91 },
    { date: dateStr(6),  bedtime: "22:30", wakeup: "06:30", hours: 8.0, quality: 5, score: 96 },
    { date: dateStr(7),  bedtime: "23:45", wakeup: "07:45", hours: 8.0, quality: 4, score: 91 },
    { date: dateStr(8),  bedtime: "23:00", wakeup: "06:45", hours: 7.8, quality: 3, score: 80 },
    { date: dateStr(9),  bedtime: "22:50", wakeup: "07:00", hours: 8.2, quality: 4, score: 91 },
    { date: dateStr(10), bedtime: "23:20", wakeup: "07:10", hours: 7.8, quality: 4, score: 88 },
    { date: dateStr(11), bedtime: "23:00", wakeup: "07:30", hours: 8.5, quality: 5, score: 100 },
    { date: dateStr(12), bedtime: "00:15", wakeup: "07:30", hours: 7.3, quality: 2, score: 66 },
    { date: dateStr(13), bedtime: "22:45", wakeup: "06:45", hours: 8.0, quality: 4, score: 91 },
    { date: dateStr(14), bedtime: "23:10", wakeup: "07:00", hours: 7.8, quality: 3, score: 80 },
  ];

  const moods: Record<string, { score: 1|2|3|4|5; note: string }> = {};
  const moodData: [number, 1|2|3|4|5, string][] = [
    [1,  4, "Productive day, finished a big project."],
    [2,  3, "A bit tired but got through it."],
    [3,  5, "Best sleep in weeks — felt amazing!"],
    [4,  3, "Rainy and slow."],
    [5,  4, "Good run in the morning set the tone."],
    [6,  5, "Weekend vibes ✨"],
    [7,  4, "Relaxed and recharged."],
    [8,  3, "Monday slump."],
    [9,  4, "Had a great lunch with a friend."],
    [10, 4, "Solid day all around."],
    [11, 5, "Feeling on top of the world!"],
    [12, 2, "Rough night, didn't sleep well."],
    [13, 4, "Recovery day — took it easy."],
    [14, 3, "Just another day."],
  ];
  moodData.forEach(([daysAgo, score, note]) => {
    moods[dateStr(daysAgo)] = { score, note };
  });

  const journalEntries: Record<string, string> = {
    [dateStr(1)]: "Wrapped up the project presentation today. Felt really good about how it went — the team seemed engaged and my manager gave positive feedback. Treated myself to a nice dinner after. 🎉",
    [dateStr(2)]: "Bit of a slower day. Got distracted in the afternoon but managed to finish my reading goal. The book is getting really good — hard to put down.",
    [dateStr(3)]: "Perfect morning: 6am run, meditation, and a proper breakfast before work. This is the routine I want to stick with. Everything just feels clearer when I start the day right.",
    [dateStr(4)]: "Rainy all day. Worked from the couch with a blanket and tea ☕. Sometimes those cozy work-from-home days are exactly what's needed.",
    [dateStr(5)]: "Caught up with an old friend over video call. It's been months and it felt like no time had passed at all. Need to do that more often.",
    [dateStr(6)]: "Spent most of the day outside — walked around the park, read in the sun, grabbed coffee from that little place on the corner. Weekends like this are rare gems.",
    [dateStr(7)]: "Quiet Sunday. Meal prepped for the week, did some light stretching, watched a documentary. Feeling ready for the week ahead.",
  };

  const countdowns = [
    { id: "demo-c1", name: "Summer vacation 🏖️", date: dateStr(-82) },
    { id: "demo-c2", name: "Team offsite",        date: dateStr(-14) },
    { id: "demo-c3", name: "Mom's birthday 🎂",   date: dateStr(-31) },
  ];

  return { habits, sleepEntries, moods, journalEntries, countdowns };
}

function clearAppLocalStorage() {
  try {
    Object.keys(localStorage)
      .filter(k => k.startsWith("today-"))
      .forEach(k => localStorage.removeItem(k));
  } catch {}
}

function applyDemoToLocalStorage() {
  const { habits, sleepEntries, moods, journalEntries, countdowns } = loadDemoData();
  try {
    localStorage.setItem("today-habits-v1", JSON.stringify(habits));
    localStorage.setItem("today-sleep-v1", JSON.stringify(sleepEntries));
    localStorage.setItem("today-moods-v1", JSON.stringify(moods));
    localStorage.setItem("today-countdowns", JSON.stringify(countdowns));
    Object.entries(journalEntries).forEach(([date, text]) => {
      localStorage.setItem(`today-journal-${date}`, text);
    });
  } catch {}
}

// ── Auth page ─────────────────────────────────────────────────────────────────

export default function AuthPage() {
  const { t } = useLanguage();
  const [mode,     setMode]     = useState<"signin" | "signup" | "forgot">("signin");
  const [email,    setEmail]    = useState("");
  const [password, setPassword] = useState("");
  const [hint,     setHint]     = useState("");      // signup: password hint
  const [showHint, setShowHint] = useState(false);   // signin: toggle hint display
  const [hintText, setHintText] = useState<string | null>(null);
  const [hintLoading, setHintLoading] = useState(false);
  const [busy,     setBusy]     = useState(false);
  const [error,    setError]    = useState<string | null>(null);
  const [info,     setInfo]     = useState<string | null>(null);
  const [language, setLanguage] = useState("en-US");

  // Apply default theme immediately (before paint) so there's no flash of a custom theme
  useLayoutEffect(() => {
    try { localStorage.setItem("today-theme", "default"); } catch {}
    applyThemeVars("default");
  }, []);

  useEffect(() => {
    try { setLanguage(localStorage.getItem("today-language") || "en-US"); } catch {}
  }, []);

  function cycleLanguage() {
    const idx = LANGUAGES.findIndex(l => l.code === language);
    const next = LANGUAGES[(idx + 1) % LANGUAGES.length];
    setLanguage(next.code);
    try { localStorage.setItem("today-language", next.code); } catch {}
    window.dispatchEvent(new CustomEvent("settings-updated"));
  }

  function switchMode(m: "signin" | "signup" | "forgot") {
    setMode(m);
    setError(null);
    setInfo(null);
    setShowHint(false);
    setHintText(null);
  }

  async function fetchHint() {
    if (!email) return;
    setHintLoading(true);
    setHintText(null);
    try {
      const res = await fetch("/api/hint", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      });
      const data = await res.json();
      setHintText(data?.hint ?? "");
    } catch {
      setHintText("");
    } finally {
      setHintLoading(false);
    }
  }

  async function handleToggleHint() {
    if (showHint) { setShowHint(false); return; }
    setShowHint(true);
    if (hintText === null) await fetchHint();
  }

  async function handleForgot(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);
    try {
      const { error } = await supabase.auth.resetPasswordForEmail(email, {
        redirectTo: window.location.origin + "/reset-password",
      });
      if (error) { setError(error.message); return; }
      setInfo(t("auth.resetEmailSent"));
    } catch {
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    setError(null);
    setInfo(null);

    try {
      if (mode === "signup") {
        const { data, error } = await supabase.auth.signUp({ email, password });

        if (error) { setError(error.message); return; }

        // Save email + optional hint via server API (works with or without a session)
        const saveHintToProfile = async (userId: string) => {
          await fetch("/api/save-profile", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ userId, email, hint: hint.trim() || undefined }),
          });
        };

        if (data.user) await saveHintToProfile(data.user.id);

        if (data.session) {
          clearAppLocalStorage();
          setInfo("Account created! Redirecting…");
          window.location.href = "/";
          return;
        }

        setInfo("Account created — signing you in…");
        const { data: signInData, error: signInErr } = await supabase.auth.signInWithPassword({ email, password });
        if (signInData.session) {
          clearAppLocalStorage();
          window.location.href = "/";
        } else if (signInErr?.message === "Invalid login credentials") {
          setError("An account with this email already exists. Try signing in instead, or use Forgot Password if you don't remember your password.");
        } else {
          setError(signInErr?.message ?? "Could not sign in after registration.");
        }
        return;
      }

      // Sign in
      const { data, error } = await supabase.auth.signInWithPassword({ email, password });

      if (error) {
        setError(error.message);
        return;
      }

      if (data.session) {
        clearAppLocalStorage();
        setInfo("Signed in! Redirecting…");
        window.location.href = "/";
        return;
      }

      setError("Could not establish a session. Check your credentials or try signing up.");
    } catch (err) {
      console.error("[Auth] unexpected error:", err);
      setError("Something went wrong. Please try again.");
    } finally {
      setBusy(false);
    }
  }

  const currentLangLabel = LANGUAGES.find(l => l.code === language)?.label ?? "EN";

  const inputStyle: React.CSSProperties = {
    fontSize: "0.875rem", borderRadius: "0.625rem", padding: "0.625rem 0.75rem",
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

        {/* Language button */}
        <div style={{ display: "flex", justifyContent: "flex-end", marginBottom: "0.75rem" }}>
          <button
            type="button"
            onClick={cycleLanguage}
            title="Change language"
            style={{
              display: "flex", alignItems: "center", gap: "0.375rem",
              padding: "0.375rem 0.75rem", borderRadius: "9999px",
              fontSize: "0.75rem", fontWeight: 500, cursor: "pointer",
              backgroundColor: "var(--c-card, #fff)", color: "var(--c-text3, #888)",
              border: "1px solid var(--c-border, #e5e7eb)", boxShadow: "var(--c-shadow, 0 1px 4px rgba(0,0,0,0.08))",
            }}
            onMouseEnter={e => (e.currentTarget.style.color = "var(--c-accent)")}
            onMouseLeave={e => (e.currentTarget.style.color = "var(--c-text3)")}
          >
            <GlobeIcon />
            {currentLangLabel}
          </button>
        </div>

        <div style={{ textAlign: "center", marginBottom: "2rem" }}>
          <h1 style={{ fontSize: "1.75rem", fontWeight: 700, color: "var(--c-text1)", letterSpacing: "-0.02em" }}>
            Today ☀️
          </h1>
          <p style={{ fontSize: "0.875rem", color: "var(--c-text3)", marginTop: "0.375rem" }}>
            {t("auth.subtitle")}
          </p>
        </div>

        <div style={{
          backgroundColor: "var(--c-card)",
          border: "1px solid var(--c-border)",
          borderRadius: "1.25rem",
          padding: "1.75rem",
          boxShadow: "var(--c-shadow-h)",
        }}>

          {/* ── Forgot password mode ─────────────────────────────────────── */}
          {mode === "forgot" && (
            <>
              <div style={{ marginBottom: "1.25rem" }}>
                <h2 style={{ fontSize: "1rem", fontWeight: 700, color: "var(--c-text1)", margin: "0 0 0.25rem" }}>
                  {t("auth.forgotPassword")}
                </h2>
                <p style={{ fontSize: "0.8125rem", color: "var(--c-text3)", margin: 0 }}>
                  Enter your email and we'll send a reset link.
                </p>
              </div>

              <form onSubmit={handleForgot} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--c-text3)" }}>{t("auth.email")}</span>
                  <input
                    type="email"
                    value={email}
                    onChange={e => setEmail(e.target.value)}
                    required
                    autoComplete="email"
                    className="th-input"
                    style={inputStyle}
                  />
                </label>

                {error && <p style={{ fontSize: "0.8125rem", color: "#c45050", textAlign: "center", margin: 0 }}>{error}</p>}
                {info  && <p style={{ fontSize: "0.8125rem", color: "var(--c-accent)", textAlign: "center", margin: 0 }}>{info}</p>}

                <button
                  type="submit"
                  disabled={busy}
                  className="th-btn"
                  style={{ padding: "0.625rem", borderRadius: "0.625rem", fontSize: "0.875rem", fontWeight: 600, opacity: busy ? 0.6 : 1, cursor: busy ? "default" : "pointer" }}
                >
                  {busy ? t("auth.sending") : t("auth.sendResetLink")}
                </button>
              </form>

              <button
                type="button"
                onClick={() => switchMode("signin")}
                style={{
                  marginTop: "1rem", background: "none", border: "none", cursor: "pointer",
                  fontSize: "0.8125rem", color: "var(--c-text3)", padding: 0,
                }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--c-accent)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--c-text3)")}
              >
                ← {t("auth.backToSignIn")}
              </button>
            </>
          )}

          {/* ── Sign in / Sign up mode ───────────────────────────────────── */}
          {mode !== "forgot" && (
            <>
              {/* Mode toggle */}
              <div style={{
                display: "flex", gap: "0.25rem", padding: "0.25rem",
                borderRadius: "0.875rem", backgroundColor: "var(--c-item)", marginBottom: "1.5rem",
              }}>
                {(["signin", "signup"] as const).map((m) => (
                  <button
                    key={m}
                    type="button"
                    onClick={() => switchMode(m)}
                    style={{
                      flex: 1, padding: "0.5rem", borderRadius: "0.625rem",
                      fontSize: "0.875rem", fontWeight: 500, cursor: "pointer", border: "none",
                      backgroundColor: mode === m ? "var(--c-card)" : "transparent",
                      color: mode === m ? "var(--c-text1)" : "var(--c-text3)",
                      boxShadow: mode === m ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                      transition: "all 0.15s",
                    }}
                  >
                    {m === "signin" ? t("auth.signin") : t("auth.signup")}
                  </button>
                ))}
              </div>

              <form onSubmit={handleSubmit} style={{ display: "flex", flexDirection: "column", gap: "0.875rem" }}>
                <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--c-text3)" }}>{t("auth.email")}</span>
                  <input
                    type="email"
                    value={email}
                    onChange={e => { setEmail(e.target.value); setHintText(null); }}
                    required
                    autoComplete="email"
                    className="th-input"
                    style={inputStyle}
                  />
                </label>

                <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                  <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--c-text3)" }}>{t("auth.password")}</span>
                  <input
                    type="password"
                    value={password}
                    onChange={e => setPassword(e.target.value)}
                    required
                    autoComplete={mode === "signup" ? "new-password" : "current-password"}
                    className="th-input"
                    style={inputStyle}
                  />
                </label>

                {/* Sign in: show hint + forgot password */}
                {mode === "signin" && (
                  <div style={{ marginTop: "-0.25rem" }}>
                    <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center" }}>
                      <button
                        type="button"
                        onClick={handleToggleHint}
                        disabled={!email}
                        style={{
                          background: "none", border: "none", cursor: email ? "pointer" : "default",
                          fontSize: "0.75rem", color: showHint ? "var(--c-accent)" : "var(--c-text3)", padding: 0,
                          opacity: email ? 1 : 0.4,
                        }}
                      >
                        {hintLoading ? "…" : showHint ? t("auth.hideHint") : t("auth.showHint")}
                      </button>
                      <button
                        type="button"
                        onClick={() => switchMode("forgot")}
                        style={{
                          background: "none", border: "none", cursor: "pointer",
                          fontSize: "0.75rem", color: "var(--c-text3)", padding: 0, flexShrink: 0,
                        }}
                        onMouseEnter={e => (e.currentTarget.style.color = "var(--c-accent)")}
                        onMouseLeave={e => (e.currentTarget.style.color = "var(--c-text3)")}
                      >
                        {t("auth.forgotPassword")}
                      </button>
                    </div>
                    {showHint && hintText !== null && (
                      <p style={{ fontSize: "0.75rem", color: "var(--c-text2)", margin: "0.25rem 0 0", maxWidth: 220 }}>
                        {hintText
                          ? <><strong>{t("auth.yourHint")}</strong> {hintText}</>
                          : <em style={{ color: "var(--c-text3)" }}>{t("auth.noHint")}</em>
                        }
                      </p>
                    )}
                  </div>
                )}

                {/* Sign up: hint field */}
                {mode === "signup" && (
                  <label style={{ display: "flex", flexDirection: "column", gap: "0.375rem" }}>
                    <span style={{ fontSize: "0.75rem", fontWeight: 500, color: "var(--c-text3)" }}>{t("auth.passwordHint")}</span>
                    <input
                      type="text"
                      value={hint}
                      onChange={e => setHint(e.target.value)}
                      placeholder={t("auth.passwordHintPlaceholder")}
                      className="th-input"
                      style={inputStyle}
                    />
                    <p style={{ fontSize: "0.6875rem", color: "var(--c-text3)", margin: 0, lineHeight: 1.4 }}>
                      {t("auth.passwordHintNote")}
                    </p>
                  </label>
                )}

                {error && <p style={{ fontSize: "0.8125rem", color: "#c45050", textAlign: "center", margin: 0 }}>{error}</p>}
                {info  && <p style={{ fontSize: "0.8125rem", color: "var(--c-accent)", textAlign: "center", margin: 0 }}>{info}</p>}

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
                  {busy
                    ? (mode === "signin" ? t("auth.signingIn") : t("auth.creating"))
                    : (mode === "signin" ? t("auth.signin") : t("auth.createAccount"))}
                </button>
              </form>

              <div style={{ display: "flex", alignItems: "center", gap: "0.75rem", margin: "1.25rem 0" }}>
                <div style={{ flex: 1, height: 1, backgroundColor: "var(--c-divider)" }} />
                <span style={{ fontSize: "0.75rem", color: "var(--c-text3)" }}>or</span>
                <div style={{ flex: 1, height: 1, backgroundColor: "var(--c-divider)" }} />
              </div>

              <div style={{ display: "flex", flexDirection: "column", gap: "0.5rem" }}>
                <button
                  type="button"
                  onClick={async () => {
                    await supabase.auth.signOut();
                    try {
                      localStorage.setItem("today-language", "en-US");
                      localStorage.setItem("today-theme", "default");
                    } catch {}
                    window.location.href = "/";
                  }}
                  style={{
                    width: "100%", padding: "0.625rem", borderRadius: "0.625rem",
                    fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
                    color: "var(--c-text2)", backgroundColor: "transparent",
                    border: "1px solid var(--c-border)", transition: "border-color 0.15s",
                  }}
                  onMouseEnter={e => (e.currentTarget.style.borderColor = "var(--c-accent)")}
                  onMouseLeave={e => (e.currentTarget.style.borderColor = "var(--c-border)")}
                >
                  {t("auth.guest")}
                </button>

                {process.env.NODE_ENV === "development" && (
                  <button
                    type="button"
                    onClick={() => {
                      applyDemoToLocalStorage();
                      window.location.href = "/";
                    }}
                    style={{
                      width: "100%", padding: "0.625rem", borderRadius: "0.625rem",
                      fontSize: "0.875rem", fontWeight: 500, cursor: "pointer",
                      color: "var(--c-accent)", backgroundColor: "var(--c-done-bg)",
                      border: "1px solid var(--c-accent)", transition: "opacity 0.15s",
                    }}
                    onMouseEnter={e => (e.currentTarget.style.opacity = "0.8")}
                    onMouseLeave={e => (e.currentTarget.style.opacity = "1")}
                  >
                    {t("auth.tryDemo")}
                  </button>
                )}
              </div>
            </>
          )}

        </div>
      </div>
    </div>
  );
}
