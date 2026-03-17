"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeId = "default" | "midnight" | "forest" | "rose" | "mono";

const STORAGE_KEY = "today-theme";

interface ThemeVars {
  "--c-bg": string;
  "--c-card": string;
  "--c-text1": string;
  "--c-text2": string;
  "--c-text3": string;
  "--c-accent": string;
  "--c-accent2": string;
  "--c-accent-fg": string;
  "--c-border": string;
  "--c-divider": string;
  "--c-skel": string;
  "--c-item": string;
  "--c-done-bg": string;
  "--c-done-fg": string;
  "--c-check": string;
  "--c-check-hover": string;
  "--c-streak": string;
  "--c-trash": string;
  "--c-ring": string;
  "--c-shadow": string;
  "--c-shadow-h": string;
}

const THEMES: Record<ThemeId, ThemeVars> = {
  default: {
    "--c-bg":          "#F8F3EB",
    "--c-card":        "#ffffff",
    "--c-text1":       "#2C1F0F",
    "--c-text2":       "#6B5235",
    "--c-text3":       "#A88B63",
    "--c-accent":      "#D4673A",
    "--c-accent2":     "#B8502A",
    "--c-accent-fg":   "#ffffff",
    "--c-border":      "#E2D4BF",
    "--c-divider":     "#EFE6D6",
    "--c-skel":        "#EFE6D6",
    "--c-item":        "#FDFBF7",
    "--c-done-bg":     "rgba(94, 140, 98, 0.10)",
    "--c-done-fg":     "#426647",
    "--c-check":       "#5E8C62",
    "--c-check-hover": "#7FA882",
    "--c-streak":      "#D4673A",
    "--c-trash":       "#DDD0BE",
    "--c-ring":        "rgba(212, 103, 58, 0.20)",
    "--c-shadow":      "0 1px 3px rgba(44,31,15,0.06), 0 4px 16px rgba(44,31,15,0.04)",
    "--c-shadow-h":    "0 2px 8px rgba(44,31,15,0.09), 0 8px 24px rgba(44,31,15,0.07)",
  },
  midnight: {
    "--c-bg":          "#0D1424",
    "--c-card":        "#152033",
    "--c-text1":       "#DCE8F8",
    "--c-text2":       "#7A9EC8",
    "--c-text3":       "#4A638C",
    "--c-accent":      "#5B9BD4",
    "--c-accent2":     "#7AB3E8",
    "--c-accent-fg":   "#0D1424",
    "--c-border":      "#1E3050",
    "--c-divider":     "#192840",
    "--c-skel":        "#1E3050",
    "--c-item":        "#0F1A2C",
    "--c-done-bg":     "rgba(91, 155, 212, 0.12)",
    "--c-done-fg":     "#7AB3E8",
    "--c-check":       "#5B9BD4",
    "--c-check-hover": "#7AB3E8",
    "--c-streak":      "#F0A050",
    "--c-trash":       "#1E3050",
    "--c-ring":        "rgba(91, 155, 212, 0.25)",
    "--c-shadow":      "0 1px 3px rgba(0,0,0,0.35), 0 4px 16px rgba(0,0,0,0.25)",
    "--c-shadow-h":    "0 2px 8px rgba(0,0,0,0.45), 0 8px 24px rgba(0,0,0,0.35)",
  },
  forest: {
    "--c-bg":          "#141F12",
    "--c-card":        "#1C2C1A",
    "--c-text1":       "#C4DDB8",
    "--c-text2":       "#689A5E",
    "--c-text3":       "#456038",
    "--c-accent":      "#72C464",
    "--c-accent2":     "#5AAD4E",
    "--c-accent-fg":   "#141F12",
    "--c-border":      "#253E22",
    "--c-divider":     "#1F3620",
    "--c-skel":        "#253E22",
    "--c-item":        "#141F12",
    "--c-done-bg":     "rgba(114, 196, 100, 0.12)",
    "--c-done-fg":     "#8ACF7E",
    "--c-check":       "#72C464",
    "--c-check-hover": "#5AAD4E",
    "--c-streak":      "#E8A030",
    "--c-trash":       "#253E22",
    "--c-ring":        "rgba(114, 196, 100, 0.25)",
    "--c-shadow":      "0 1px 3px rgba(0,0,0,0.40), 0 4px 16px rgba(0,0,0,0.30)",
    "--c-shadow-h":    "0 2px 8px rgba(0,0,0,0.50), 0 8px 24px rgba(0,0,0,0.40)",
  },
  rose: {
    "--c-bg":          "#FDF0F3",
    "--c-card":        "#ffffff",
    "--c-text1":       "#3D1520",
    "--c-text2":       "#8A4055",
    "--c-text3":       "#B07080",
    "--c-accent":      "#C45070",
    "--c-accent2":     "#A83D5C",
    "--c-accent-fg":   "#ffffff",
    "--c-border":      "#F0CDD5",
    "--c-divider":     "#F8E0E5",
    "--c-skel":        "#F5DADF",
    "--c-item":        "#FDF8F9",
    "--c-done-bg":     "rgba(196, 80, 112, 0.08)",
    "--c-done-fg":     "#A83D5C",
    "--c-check":       "#C45070",
    "--c-check-hover": "#D4708C",
    "--c-streak":      "#C45070",
    "--c-trash":       "#F0CDD5",
    "--c-ring":        "rgba(196, 80, 112, 0.20)",
    "--c-shadow":      "0 1px 3px rgba(61,21,32,0.06), 0 4px 16px rgba(61,21,32,0.04)",
    "--c-shadow-h":    "0 2px 8px rgba(61,21,32,0.09), 0 8px 24px rgba(61,21,32,0.07)",
  },
  mono: {
    "--c-bg":          "#F2F2F2",
    "--c-card":        "#ffffff",
    "--c-text1":       "#111111",
    "--c-text2":       "#444444",
    "--c-text3":       "#888888",
    "--c-accent":      "#111111",
    "--c-accent2":     "#333333",
    "--c-accent-fg":   "#ffffff",
    "--c-border":      "#DEDEDE",
    "--c-divider":     "#EBEBEB",
    "--c-skel":        "#E8E8E8",
    "--c-item":        "#F8F8F8",
    "--c-done-bg":     "rgba(0, 0, 0, 0.05)",
    "--c-done-fg":     "#444444",
    "--c-check":       "#111111",
    "--c-check-hover": "#555555",
    "--c-streak":      "#111111",
    "--c-trash":       "#CCCCCC",
    "--c-ring":        "rgba(0, 0, 0, 0.12)",
    "--c-shadow":      "0 1px 3px rgba(0,0,0,0.07), 0 4px 16px rgba(0,0,0,0.04)",
    "--c-shadow-h":    "0 2px 8px rgba(0,0,0,0.10), 0 8px 24px rgba(0,0,0,0.06)",
  },
};

function applyThemeVars(id: ThemeId) {
  const vars = THEMES[id];
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }

  // Inject scrollbar colors directly — CSS custom properties don't reliably
  // resolve inside ::-webkit-scrollbar pseudo-elements in all browsers.
  let el = document.getElementById("theme-scrollbar") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "theme-scrollbar";
    document.head.appendChild(el);
  }
  const thumb = vars["--c-text3"];
  const thumbHover = vars["--c-text2"];
  const track = vars["--c-skel"];
  el.textContent = `
    html { scrollbar-color: ${thumb} ${track}; scrollbar-width: thin; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: ${track}; }
    ::-webkit-scrollbar-thumb { background-color: ${thumb}; border-radius: 9999px; }
    ::-webkit-scrollbar-thumb:hover { background-color: ${thumbHover}; }
    ::-webkit-scrollbar-corner { background: ${track}; }
  `;
}

interface ThemeContext {
  theme: ThemeId;
  setTheme: (id: ThemeId) => void;
}

const ThemeCtx = createContext<ThemeContext>({
  theme: "default",
  setTheme: () => {},
});

export function useTheme() {
  return useContext(ThemeCtx);
}

export default function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<ThemeId>("default");

  // Read persisted theme on mount and apply
  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
      const id: ThemeId = saved && saved in THEMES ? saved : "default";
      setThemeState(id);
      applyThemeVars(id);
    } catch {}
  }, []);

  // Apply theme when settings-updated fires (e.g. synced from Supabase on login)
  useEffect(() => {
    const handler = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY) as ThemeId | null;
        const id: ThemeId = saved && saved in THEMES ? saved : "default";
        setThemeState(id);
        applyThemeVars(id);
      } catch {}
    };
    window.addEventListener("settings-updated", handler);
    return () => window.removeEventListener("settings-updated", handler);
  }, []);

  function setTheme(id: ThemeId) {
    setThemeState(id);
    applyThemeVars(id);
    try {
      localStorage.setItem(STORAGE_KEY, id);
    } catch {}
  }

  return (
    <ThemeCtx.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

// Export theme metadata for the settings UI
export const THEME_META = [
  { id: "default" as ThemeId, label: "Default",  description: "Warm & calm",   swatches: ["#F8F3EB", "#ffffff", "#D4673A"] as [string,string,string] },
  { id: "midnight" as ThemeId, label: "Midnight", description: "Deep navy",     swatches: ["#0D1424", "#152033", "#5B9BD4"] as [string,string,string] },
  { id: "forest" as ThemeId,  label: "Forest",   description: "Earthy greens", swatches: ["#141F12", "#1C2C1A", "#72C464"] as [string,string,string] },
  { id: "rose" as ThemeId,    label: "Rose",     description: "Soft & rosy",   swatches: ["#FDF0F3", "#ffffff", "#C45070"] as [string,string,string] },
  { id: "mono" as ThemeId,    label: "Mono",     description: "Pure minimal",  swatches: ["#F2F2F2", "#ffffff", "#111111"] as [string,string,string] },
];
