"use client";

import { createContext, useContext, useEffect, useState } from "react";

export type ThemeId = "default" | "midnight" | "forest" | "rose" | "mono" | "custom";

const STORAGE_KEY = "today-theme";
export const CUSTOM_STORAGE_KEY = "today-theme-custom";

export interface CustomColors {
  bg:     string;
  card:   string;
  accent: string;
  text:   string;
}

export const DEFAULT_CUSTOM: CustomColors = {
  bg:     "#F8F3EB",
  card:   "#ffffff",
  accent: "#D4673A",
  text:   "#2C1F0F",
};

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

const THEMES: Record<Exclude<ThemeId, "custom">, ThemeVars> = {
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

// ── Color utilities ────────────────────────────────────────────────────────

function hexToRgb(hex: string): [number, number, number] {
  const h = hex.replace("#", "");
  const full = h.length === 3 ? h.split("").map(c => c + c).join("") : h;
  const n = parseInt(full, 16);
  return [(n >> 16) & 255, (n >> 8) & 255, n & 255];
}

function rgbToHex(r: number, g: number, b: number): string {
  return "#" + [r, g, b]
    .map(v => Math.round(Math.max(0, Math.min(255, v))).toString(16).padStart(2, "0"))
    .join("");
}

function blend(a: string, b: string, t: number): string {
  const [ar, ag, ab] = hexToRgb(a);
  const [br, bg, bb] = hexToRgb(b);
  return rgbToHex(ar + (br - ar) * t, ag + (bg - ag) * t, ab + (bb - ab) * t);
}

function darken(hex: string, factor: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r * factor, g * factor, b * factor);
}

function lighten(hex: string, amount: number): string {
  const [r, g, b] = hexToRgb(hex);
  return rgbToHex(r + (255 - r) * amount, g + (255 - g) * amount, b + (255 - b) * amount);
}

function luminance(hex: string): number {
  const [r, g, b] = hexToRgb(hex);
  const toLinear = (c: number) => {
    const s = c / 255;
    return s <= 0.04045 ? s / 12.92 : ((s + 0.055) / 1.055) ** 2.4;
  };
  return 0.2126 * toLinear(r) + 0.7152 * toLinear(g) + 0.0722 * toLinear(b);
}

function contrastFg(hex: string): string {
  return luminance(hex) > 0.35 ? "#000000" : "#ffffff";
}

function rgbaStr(hex: string, alpha: number): string {
  const [r, g, b] = hexToRgb(hex);
  return `rgba(${r},${g},${b},${alpha})`;
}

export function deriveCustomTheme(c: CustomColors): ThemeVars {
  const isDark  = luminance(c.bg) < 0.15;
  const accent2 = isDark ? lighten(c.accent, 0.18) : darken(c.accent, 0.84);
  const accentFg = contrastFg(c.accent);
  const text2   = blend(c.text, c.bg, 0.42);
  const text3   = blend(c.text, c.bg, 0.68);
  const border  = blend(c.card, c.text, 0.12);
  const divider = blend(c.card, c.text, 0.06);
  const item    = blend(c.bg, c.card, 0.45);
  const doneFg  = isDark ? lighten(c.accent, 0.20) : darken(c.accent, 0.82);
  const [tr, tg, tb] = hexToRgb(c.text);
  const so = isDark ? 0.40 : 0.06;
  return {
    "--c-bg":          c.bg,
    "--c-card":        c.card,
    "--c-text1":       c.text,
    "--c-text2":       text2,
    "--c-text3":       text3,
    "--c-accent":      c.accent,
    "--c-accent2":     accent2,
    "--c-accent-fg":   accentFg,
    "--c-border":      border,
    "--c-divider":     divider,
    "--c-skel":        divider,
    "--c-item":        item,
    "--c-done-bg":     rgbaStr(c.accent, 0.10),
    "--c-done-fg":     doneFg,
    "--c-check":       c.accent,
    "--c-check-hover": accent2,
    "--c-streak":      c.accent,
    "--c-trash":       border,
    "--c-ring":        rgbaStr(c.accent, 0.22),
    "--c-shadow":      `0 1px 3px rgba(${tr},${tg},${tb},${so}), 0 4px 16px rgba(${tr},${tg},${tb},${so * 0.65})`,
    "--c-shadow-h":    `0 2px 8px rgba(${tr},${tg},${tb},${so * 1.6}), 0 8px 24px rgba(${tr},${tg},${tb},${so * 1.2})`,
  };
}

// ── Apply vars to DOM ──────────────────────────────────────────────────────

function applyVars(vars: ThemeVars) {
  const root = document.documentElement;
  for (const [key, value] of Object.entries(vars)) {
    root.style.setProperty(key, value);
  }
  let el = document.getElementById("theme-scrollbar") as HTMLStyleElement | null;
  if (!el) {
    el = document.createElement("style");
    el.id = "theme-scrollbar";
    document.head.appendChild(el);
  }
  const thumb      = vars["--c-text3"];
  const thumbHover = vars["--c-text2"];
  const track      = vars["--c-skel"];
  el.textContent = `
    html { scrollbar-color: ${thumb} ${track}; scrollbar-width: thin; }
    ::-webkit-scrollbar { width: 6px; height: 6px; }
    ::-webkit-scrollbar-track { background: ${track}; }
    ::-webkit-scrollbar-thumb { background-color: ${thumb}; border-radius: 9999px; }
    ::-webkit-scrollbar-thumb:hover { background-color: ${thumbHover}; }
    ::-webkit-scrollbar-corner { background: ${track}; }
  `;
}

export function applyThemeVars(id: ThemeId, customColors?: CustomColors) {
  if (id === "custom") {
    let colors = customColors;
    if (!colors) {
      try {
        const raw = localStorage.getItem(CUSTOM_STORAGE_KEY);
        colors = raw ? (JSON.parse(raw) as CustomColors) : DEFAULT_CUSTOM;
      } catch { colors = DEFAULT_CUSTOM; }
    }
    applyVars(deriveCustomTheme(colors));
  } else {
    applyVars(THEMES[id]);
  }
}

// ── Context ────────────────────────────────────────────────────────────────

const VALID_THEME_IDS = new Set<string>(["default", "midnight", "forest", "rose", "mono", "custom"]);

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

  useEffect(() => {
    try {
      const saved = localStorage.getItem(STORAGE_KEY);
      const id: ThemeId = saved && VALID_THEME_IDS.has(saved) ? (saved as ThemeId) : "default";
      setThemeState(id);
      applyThemeVars(id);
    } catch {}
  }, []);

  useEffect(() => {
    const handler = () => {
      try {
        const saved = localStorage.getItem(STORAGE_KEY);
        const id: ThemeId = saved && VALID_THEME_IDS.has(saved) ? (saved as ThemeId) : "default";
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
    try { localStorage.setItem(STORAGE_KEY, id); } catch {}
  }

  return (
    <ThemeCtx.Provider value={{ theme, setTheme }}>
      {children}
    </ThemeCtx.Provider>
  );
}

// Export theme metadata for the settings UI
export const THEME_META = [
  { id: "default"  as ThemeId, label: "Default",  description: "Warm & calm",   swatches: ["#F8F3EB", "#ffffff", "#D4673A"] as [string,string,string] },
  { id: "midnight" as ThemeId, label: "Midnight", description: "Deep navy",     swatches: ["#0D1424", "#152033", "#5B9BD4"] as [string,string,string] },
  { id: "forest"   as ThemeId, label: "Forest",   description: "Earthy greens", swatches: ["#141F12", "#1C2C1A", "#72C464"] as [string,string,string] },
  { id: "rose"     as ThemeId, label: "Rose",     description: "Soft & rosy",   swatches: ["#FDF0F3", "#ffffff", "#C45070"] as [string,string,string] },
  { id: "mono"     as ThemeId, label: "Mono",     description: "Pure minimal",  swatches: ["#F2F2F2", "#ffffff", "#111111"] as [string,string,string] },
];
