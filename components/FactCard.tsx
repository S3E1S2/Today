"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";

interface Fact {
  text: string;
  source: string;
  source_url: string;
}

function LightbulbIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <line x1="9" y1="18" x2="15" y2="18" />
      <line x1="10" y1="22" x2="14" y2="22" />
      <path d="M15.09 14c.18-.98.65-1.74 1.41-2.5A4.65 4.65 0 0 0 18 8 6 6 0 0 0 6 8c0 1 .23 2.23 1.5 3.5A4.61 4.61 0 0 1 8.91 14" />
    </svg>
  );
}

function RefreshIcon() {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="23 4 23 10 17 10" />
      <polyline points="1 20 1 14 7 14" />
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15" />
    </svg>
  );
}

// API supports "en" and "de" natively; others we translate via MyMemory
const LOCALE_TO_API_LANG: Record<string, string> = { "de-DE": "de" };
const LOCALE_TO_TRANSLATE: Record<string, string> = {
  "es-ES": "en|es",
  "fr-FR": "en|fr",
  "id-ID": "en|id",
};

async function translateText(text: string, langpair: string): Promise<string> {
  const res = await fetch(
    `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=${langpair}`
  );
  if (!res.ok) return text;
  const data = await res.json() as { responseData?: { translatedText?: string }; responseStatus?: number };
  const translated = data?.responseData?.translatedText;
  if (!translated || data?.responseStatus === 403) return text;
  return translated;
}

async function loadFact(locale: string): Promise<Fact> {
  const apiLang = LOCALE_TO_API_LANG[locale] ?? "en";
  const r = await fetch(`https://uselessfacts.jsph.pl/api/v2/facts/random?language=${apiLang}`, {
    cache: "no-store",
  });
  if (!r.ok) throw new Error(`HTTP ${r.status}`);
  const fact: Fact = await r.json();

  const langpair = LOCALE_TO_TRANSLATE[locale];
  if (langpair) {
    fact.text = await translateText(fact.text, langpair);
  }

  return fact;
}

export default function FactCard() {
  const { t, locale } = useLanguage();
  const [fact,       setFact]       = useState<Fact | null>(null);
  const [loading,    setLoading]    = useState(true);
  const [refreshing, setRefreshing] = useState(false);
  const [error,      setError]      = useState<string | null>(null);

  const fetchFact = async (isRefresh = false) => {
    if (isRefresh) setRefreshing(true);
    else setLoading(true);
    setError(null);
    try {
      setFact(await loadFact(locale));
    } catch (e) {
      setError(String(e));
    } finally {
      setLoading(false);
      setRefreshing(false);
    }
  };

  useEffect(() => { fetchFact(); }, [locale]);

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span style={{ color: "var(--c-accent)" }}><LightbulbIcon /></span>
          <h2 className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--c-text2)" }}>
            {t("fact.title")}
          </h2>
        </div>
        <button
          onClick={() => fetchFact(true)}
          disabled={refreshing || loading}
          className="refresh-btn flex items-center gap-1.5 text-xs disabled:opacity-40 cursor-pointer"
        >
          <span className={refreshing ? "animate-spin" : ""}><RefreshIcon /></span>
          {t("fact.another")}
        </button>
      </div>

      {(loading || refreshing) && !fact && (
        <div className="animate-pulse flex flex-col gap-2">
          {[0, 1, 2].map((_, i) => (
            <div key={i} className="h-3 rounded" style={{ width: ["100%","91.67%","80%"][i], backgroundColor: "var(--c-skel)" }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="text-sm" style={{ color: "var(--c-text3)" }}>{t("fact.error")}</p>
      )}

      {fact && (
        <div className={`transition-opacity duration-300 ${refreshing ? "opacity-40" : "opacity-100"}`}>
          <p className="text-sm leading-relaxed" style={{ color: "var(--c-text1)" }}>{fact.text}</p>
          {fact.source && (
            <a href={fact.source_url} target="_blank" rel="noopener noreferrer" className="fact-source text-xs mt-3 block">
              {t("fact.via")} {fact.source}
            </a>
          )}
        </div>
      )}
    </div>
  );
}
