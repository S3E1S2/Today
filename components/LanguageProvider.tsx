"use client";

import { createContext, useContext, useEffect, useState } from "react";
import en from "@/locales/en.json";
import es from "@/locales/es.json";
import fr from "@/locales/fr.json";
import de from "@/locales/de.json";
import id from "@/locales/id.json";

const LANGUAGE_KEY = "today-language";

type Dict = Record<string, string>;

const DICTS: Record<string, Dict> = {
  "en-US": en,
  "es-ES": es,
  "fr-FR": fr,
  "de-DE": de,
  "id-ID": id,
};

interface LangCtxType {
  locale: string;
  t: (key: string, vars?: Record<string, string | number>) => string;
}

const LangCtx = createContext<LangCtxType>({
  locale: "en-US",
  t: (key) => key,
});

export function useLanguage(): LangCtxType {
  return useContext(LangCtx);
}

export default function LanguageProvider({ children }: { children: React.ReactNode }) {
  const [locale, setLocale] = useState("en-US");

  useEffect(() => {
    const load = () => {
      try { setLocale(localStorage.getItem(LANGUAGE_KEY) || "en-US"); } catch {}
    };
    load();
    window.addEventListener("settings-updated", load);
    return () => window.removeEventListener("settings-updated", load);
  }, []);

  function t(key: string, vars?: Record<string, string | number>): string {
    const dict = DICTS[locale] ?? DICTS["en-US"];
    let str = (dict as Dict)[key] ?? (DICTS["en-US"] as Dict)[key] ?? key;
    if (vars) {
      for (const [k, v] of Object.entries(vars)) {
        str = str.replace(new RegExp(`\\{${k}\\}`, "g"), String(v));
      }
    }
    return str;
  }

  return (
    <LangCtx.Provider value={{ locale, t }}>
      {children}
    </LangCtx.Provider>
  );
}
