"use client";

import { useEffect, useRef, useState } from "react";
import { useTheme, THEME_META, applyThemeVars, DEFAULT_CUSTOM, CUSTOM_STORAGE_KEY } from "./ThemeProvider";
import type { ThemeId, CustomColors } from "./ThemeProvider";
import { useLanguage } from "./LanguageProvider";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";
import { useDashboard, DEFAULT_ORDER, type SectionId } from "./DraggableDashboard";

const WEEK_START_KEY = "today-week-start";
const LANGUAGE_KEY   = "today-language";

const LANGUAGES = [
  { code: "en-US", label: "English" },
  { code: "es-ES", label: "Español" },
  { code: "fr-FR", label: "Français" },
  { code: "de-DE", label: "Deutsch" },
  { code: "id-ID", label: "Indonesia" },
];

const COLOR_FIELDS: { key: keyof CustomColors; labelKey: string }[] = [
  { key: "bg",     labelKey: "settings.customBg"     },
  { key: "card",   labelKey: "settings.customCard"   },
  { key: "accent", labelKey: "settings.customAccent" },
  { key: "text",   labelKey: "settings.customText"   },
];

function GearIcon() {
  return (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="3" />
      <path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1-2.83 2.83l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-4 0v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83-2.83l.06-.06A1.65 1.65 0 0 0 4.68 15a1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1 0-4h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 2.83-2.83l.06.06A1.65 1.65 0 0 0 9 4.68a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 4 0v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 2.83l-.06.06A1.65 1.65 0 0 0 19.4 9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 0 4h-.09a1.65 1.65 0 0 0-1.51 1Z" />
    </svg>
  );
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}

function XIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="18" y1="6" x2="6" y2="18" />
      <line x1="6" y1="6" x2="18" y2="18" />
    </svg>
  );
}

function SectionLabel({ children }: { children: React.ReactNode }) {
  return (
    <p className="text-[10px] font-semibold uppercase tracking-widest mb-2" style={{ color: "var(--c-text3)" }}>
      {children}
    </p>
  );
}

function ColorSwatch({ color }: { color: string }) {
  return (
    <span style={{
      display: "inline-block", width: 20, height: 20, borderRadius: "50%",
      backgroundColor: color, border: "1.5px solid rgba(0,0,0,0.12)",
      flexShrink: 0,
    }} />
  );
}

export default function SettingsModal() {
  const { theme, setTheme } = useTheme();
  const { t } = useLanguage();
  const { user } = useAuth();
  const { visibility, setVisibility } = useDashboard();
  const [open, setOpen]               = useState(false);
  const [weekStart, setWeekStartState] = useState<0 | 1>(0);
  const [language,  setLanguageState]  = useState("en-US");
  const [customColors, setCustomColors] = useState<CustomColors>(DEFAULT_CUSTOM);
  const modalRef = useRef<HTMLDivElement>(null);

  // Load persisted settings on open
  useEffect(() => {
    if (!open) return;
    try {
      setWeekStartState(localStorage.getItem(WEEK_START_KEY) === "1" ? 1 : 0);
      setLanguageState(localStorage.getItem(LANGUAGE_KEY) || "en-US");
      const raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
      setCustomColors(raw ? JSON.parse(raw) : DEFAULT_CUSTOM);
    } catch {}
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const handler = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [open]);

  useEffect(() => {
    if (open) modalRef.current?.focus();
  }, [open]);

  function applyWeekStart(v: 0 | 1) {
    setWeekStartState(v);
    try { localStorage.setItem(WEEK_START_KEY, String(v)); } catch {}
    window.dispatchEvent(new CustomEvent("settings-updated"));
    if (user) {
      supabase.from("profiles").upsert({ id: user.id, week_start: v })
        .then(({ error }) => { if (error) console.error("[Settings] week_start save failed:", error); });
    }
  }

  function applyLanguage(code: string) {
    setLanguageState(code);
    try { localStorage.setItem(LANGUAGE_KEY, code); } catch {}
    window.dispatchEvent(new CustomEvent("settings-updated"));
    if (user) {
      supabase.from("profiles").upsert({ id: user.id, language: code })
        .then(({ error }) => { if (error) console.error("[Settings] language save failed:", error); });
    }
  }

  function applyTheme(id: ThemeId) {
    setTheme(id);
    if (user) {
      supabase.from("profiles").upsert({ id: user.id, theme: id })
        .then(({ error }) => { if (error) console.error("[Settings] theme save failed:", error); });
    }
  }

  function handleCustomColor(key: keyof CustomColors, value: string) {
    const next = { ...customColors, [key]: value };
    setCustomColors(next);
    try { localStorage.setItem(CUSTOM_STORAGE_KEY, JSON.stringify(next)); } catch {}
    applyThemeVars("custom", next);
    if (user) {
      // Save theme and custom_colors as separate upserts so theme saves even if the
      // custom_colors column doesn't exist yet (needs migration to add it).
      supabase.from("profiles").upsert({ id: user.id, theme: "custom" })
        .then(({ error }) => { if (error) console.error("[Settings] theme save failed:", error); });
      supabase.from("profiles").upsert({ id: user.id, custom_colors: JSON.stringify(next) })
        .then(({ error }) => { if (error) console.error("[Settings] custom_colors save failed — run: ALTER TABLE profiles ADD COLUMN IF NOT EXISTS custom_colors TEXT;", error); });
    }
    if (theme !== "custom") setTheme("custom");
  }

  return (
    <>
      {/* Gear button */}
      <button
        onClick={() => setOpen(true)}
        aria-label={t("settings.openLabel")}
        style={{
          position: "fixed",
          top: "1rem",
          right: "1rem",
          zIndex: 40,
          backgroundColor: "var(--c-card)",
          color: "var(--c-text3)",
          border: "1px solid var(--c-border)",
          boxShadow: "var(--c-shadow)",
        }}
        className="w-9 h-9 rounded-full flex items-center justify-center transition-colors hover:cursor-pointer"
        onMouseEnter={e => (e.currentTarget.style.color = "var(--c-accent)")}
        onMouseLeave={e => (e.currentTarget.style.color = "var(--c-text3)")}
      >
        <GearIcon />
      </button>

      {/* Backdrop */}
      {open && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4"
          style={{ backgroundColor: "rgba(0,0,0,0.60)" }}
          onClick={(e) => { if (e.target === e.currentTarget) setOpen(false); }}
        >
          <div
            ref={modalRef}
            tabIndex={-1}
            role="dialog"
            aria-modal="true"
            aria-label="Settings"
            className="w-full max-w-sm rounded-2xl p-6 outline-none max-h-[90vh] overflow-y-auto"
            style={{
              backgroundColor: "var(--c-card)",
              border: "1px solid var(--c-border)",
              boxShadow: "0 4px 24px rgba(0,0,0,0.15), 0 16px 48px rgba(0,0,0,0.20)",
            }}
          >
            {/* Header */}
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-base font-semibold" style={{ color: "var(--c-text1)" }}>{t("settings.title")}</h2>
                <p className="text-xs mt-0.5" style={{ color: "var(--c-text3)" }}>{t("settings.subtitle")}</p>
              </div>
              <button
                onClick={() => setOpen(false)}
                className="w-8 h-8 rounded-full flex items-center justify-center transition-colors cursor-pointer"
                style={{ color: "var(--c-text3)", backgroundColor: "var(--c-item)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--c-text1)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--c-text3)")}
                aria-label={t("settings.closeLabel")}
              >
                <XIcon />
              </button>
            </div>

            {/* ── Theme ── */}
            <SectionLabel>{t("settings.theme")}</SectionLabel>
            <div className="flex flex-col gap-2 mb-6">
              {THEME_META.map((thm) => {
                const selected = theme === thm.id;
                return (
                  <button
                    key={thm.id}
                    onClick={() => applyTheme(thm.id)}
                    className="flex items-center gap-4 w-full rounded-xl px-4 py-3 text-left transition-all cursor-pointer"
                    style={{
                      backgroundColor: selected ? "var(--c-done-bg)" : "var(--c-item)",
                      border: `2px solid ${selected ? "var(--c-accent)" : "transparent"}`,
                    }}
                  >
                    <div className="flex gap-1 shrink-0">
                      {thm.swatches.map((color, i) => (
                        <span key={i} className="w-5 h-5 rounded-full border border-black/10" style={{ backgroundColor: color }} />
                      ))}
                    </div>
                    <div className="flex-1 min-w-0">
                      <p className="text-sm font-medium leading-none" style={{ color: "var(--c-text1)" }}>{t(`theme.${thm.id}.label`)}</p>
                      <p className="text-xs mt-1" style={{ color: "var(--c-text3)" }}>{t(`theme.${thm.id}.desc`)}</p>
                    </div>
                    <span
                      className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                      style={{
                        backgroundColor: selected ? "var(--c-accent)" : "transparent",
                        color: "var(--c-accent-fg)",
                        border: selected ? "none" : "2px solid var(--c-border)",
                      }}
                    >
                      {selected && <CheckIcon />}
                    </span>
                  </button>
                );
              })}

              {/* Custom theme row */}
              {(() => {
                const selected = theme === "custom";
                return (
                  <div>
                    <button
                      onClick={() => applyTheme("custom")}
                      className="flex items-center gap-4 w-full rounded-xl px-4 py-3 text-left transition-all cursor-pointer"
                      style={{
                        backgroundColor: selected ? "var(--c-done-bg)" : "var(--c-item)",
                        border: `2px solid ${selected ? "var(--c-accent)" : "transparent"}`,
                        borderRadius: selected ? "0.75rem 0.75rem 0 0" : "0.75rem",
                      }}
                    >
                      <div className="flex gap-1 shrink-0">
                        <ColorSwatch color={customColors.bg} />
                        <ColorSwatch color={customColors.card} />
                        <ColorSwatch color={customColors.accent} />
                      </div>
                      <div className="flex-1 min-w-0">
                        <p className="text-sm font-medium leading-none" style={{ color: "var(--c-text1)" }}>{t("theme.custom.label")}</p>
                        <p className="text-xs mt-1" style={{ color: "var(--c-text3)" }}>{t("theme.custom.desc")}</p>
                      </div>
                      <span
                        className="w-5 h-5 rounded-full flex items-center justify-center shrink-0"
                        style={{
                          backgroundColor: selected ? "var(--c-accent)" : "transparent",
                          color: "var(--c-accent-fg)",
                          border: selected ? "none" : "2px solid var(--c-border)",
                        }}
                      >
                        {selected && <CheckIcon />}
                      </span>
                    </button>

                    {/* Color picker panel — always visible when custom selected */}
                    {selected && (
                      <div
                        className="flex flex-col gap-3 px-4 py-3"
                        style={{
                          backgroundColor: "var(--c-item)",
                          border: "2px solid var(--c-accent)",
                          borderTop: "1px solid var(--c-divider)",
                          borderRadius: "0 0 0.75rem 0.75rem",
                        }}
                      >
                        {COLOR_FIELDS.map(({ key, labelKey }) => (
                          <div key={key} className="flex items-center justify-between gap-3">
                            <span className="text-sm" style={{ color: "var(--c-text2)" }}>
                              {t(labelKey)}
                            </span>
                            <div className="flex items-center gap-2">
                              <span className="text-xs font-mono" style={{ color: "var(--c-text3)" }}>
                                {customColors[key]}
                              </span>
                              <label style={{ position: "relative", cursor: "pointer", display: "flex" }}>
                                <span style={{
                                  display: "block", width: 28, height: 28, borderRadius: "50%",
                                  backgroundColor: customColors[key],
                                  border: "2px solid var(--c-border)",
                                  flexShrink: 0,
                                }} />
                                <input
                                  type="color"
                                  value={customColors[key]}
                                  onChange={e => handleCustomColor(key, e.target.value)}
                                  style={{ position: "absolute", opacity: 0, width: 0, height: 0, pointerEvents: "none" }}
                                  tabIndex={-1}
                                />
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                );
              })()}
            </div>

            {/* ── Language ── */}
            <div className="mb-6" style={{ borderTop: "1px solid var(--c-divider)", paddingTop: "1.25rem" }}>
              <SectionLabel>{t("settings.language")}</SectionLabel>
              <div className="flex flex-col gap-1.5">
                {LANGUAGES.map(lang => {
                  const selected = language === lang.code;
                  return (
                    <button
                      key={lang.code}
                      onClick={() => applyLanguage(lang.code)}
                      className="flex items-center justify-between w-full rounded-xl px-4 py-2.5 text-left cursor-pointer transition-all"
                      style={{
                        backgroundColor: selected ? "var(--c-done-bg)" : "var(--c-item)",
                        border: `2px solid ${selected ? "var(--c-accent)" : "transparent"}`,
                      }}
                    >
                      <span className="text-sm font-medium" style={{ color: "var(--c-text1)" }}>{lang.label}</span>
                      <span className="text-xs" style={{ color: "var(--c-text3)" }}>{lang.code}</span>
                    </button>
                  );
                })}
              </div>
            </div>

            {/* ── Sections ── */}
            <div className="mb-6" style={{ borderTop: "1px solid var(--c-divider)", paddingTop: "1.25rem" }}>
              <SectionLabel>{t("settings.sections")}</SectionLabel>
              <div className="flex flex-col gap-1.5">
                {DEFAULT_ORDER.map(id => (
                  <div
                    key={id}
                    className="flex items-center justify-between px-4 py-2.5 rounded-xl"
                    style={{ backgroundColor: "var(--c-item)" }}
                  >
                    <span className="text-sm" style={{ color: "var(--c-text1)" }}>
                      {t(`section.${id.replace(/-/g, "")}`)}
                    </span>
                    <button
                      type="button"
                      onClick={() => setVisibility(id as SectionId, !visibility[id as SectionId])}
                      className="cursor-pointer"
                      style={{
                        width: 36, height: 20, borderRadius: 9999,
                        backgroundColor: visibility[id as SectionId] ? "var(--c-accent)" : "var(--c-border)",
                        position: "relative", border: "none", transition: "background-color 0.2s",
                        flexShrink: 0,
                      }}
                    >
                      <span style={{
                        position: "absolute", top: 2,
                        left: visibility[id as SectionId] ? 18 : 2,
                        width: 16, height: 16, borderRadius: "50%",
                        backgroundColor: "white",
                        transition: "left 0.2s",
                        display: "block",
                      }} />
                    </button>
                  </div>
                ))}
              </div>
            </div>

            {/* ── Calendar ── */}
            <div style={{ borderTop: "1px solid var(--c-divider)", paddingTop: "1.25rem" }}>
              <SectionLabel>{t("settings.calendar")}</SectionLabel>
              <div className="flex items-center justify-between">
                <span className="text-sm" style={{ color: "var(--c-text2)" }}>{t("settings.weekStartsOn")}</span>
                <div
                  className="flex gap-1 p-1 rounded-xl"
                  style={{ backgroundColor: "var(--c-item)" }}
                >
                  {([{ labelKey: "settings.sunday", value: 0 }, { labelKey: "settings.monday", value: 1 }] as const).map(opt => (
                    <button
                      key={opt.value}
                      onClick={() => applyWeekStart(opt.value)}
                      className="px-4 py-1.5 rounded-lg text-sm font-medium transition-all cursor-pointer"
                      style={{
                        backgroundColor: weekStart === opt.value ? "var(--c-card)" : "transparent",
                        color:           weekStart === opt.value ? "var(--c-text1)" : "var(--c-text3)",
                        boxShadow:       weekStart === opt.value ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                      }}
                    >
                      {t(opt.labelKey)}
                    </button>
                  ))}
                </div>
              </div>
            </div>

          </div>
        </div>
      )}
    </>
  );
}
