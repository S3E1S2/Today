"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";

interface Article {
  title: string;
  extract: string;
  content_urls: { desktop: { page: string } };
}

const LOCALE_TO_WIKI: Record<string, string> = {
  "en-US": "en", "es-ES": "es", "fr-FR": "fr", "de-DE": "de", "id-ID": "id",
};

function CompassIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polygon points="16.24 7.76 14.12 14.12 7.76 16.24 9.88 9.88 16.24 7.76" />
    </svg>
  );
}

export default function WikiDiscover() {
  const { locale, t } = useLanguage();
  const [article, setArticle] = useState<Article | null>(null);
  const [error, setError]     = useState(false);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    setArticle(null);
    setError(false);
    setLoading(true);

    const today    = new Date().toISOString().slice(0, 10);
    const cacheKey = `today-wiki-${locale}`;
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { date, data } = JSON.parse(cached);
        if (date === today) { setArticle(data); setLoading(false); return; }
      }
    } catch {}

    const lang = LOCALE_TO_WIKI[locale] ?? "en";
    fetch(`https://${lang}.wikipedia.org/api/rest_v1/page/random/summary`, {
      headers: { Accept: "application/json" },
    })
      .then(r => { if (!r.ok) throw new Error(); return r.json(); })
      .then((data: Article) => {
        setArticle(data);
        try { localStorage.setItem(cacheKey, JSON.stringify({ date: today, data })); } catch {}
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, [locale]);

  // Two-sentence extract
  const extract = article
    ? article.extract.split(". ").slice(0, 2).join(". ").replace(/\.?$/, ".").trim()
    : null;

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <span style={{ color: "var(--c-accent)" }}><CompassIcon /></span>
        <h2 className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--c-text2)" }}>
          {t("discover.title")}
        </h2>
      </div>

      {loading && (
        <div className="animate-pulse flex flex-col gap-2">
          <div className="h-3.5 rounded w-2/3" style={{ backgroundColor: "var(--c-skel)" }} />
          {[0, 1, 2].map(i => (
            <div key={i} className="h-2.5 rounded" style={{ width: ["100%","91.67%","75%"][i], backgroundColor: "var(--c-skel)" }} />
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="text-sm" style={{ color: "var(--c-text3)" }}>{t("discover.error")}</p>
      )}

      {article && !loading && (
        <>
          <p className="text-sm font-semibold leading-snug" style={{ color: "var(--c-text1)" }}>
            {article.title}
          </p>
          <p className="text-sm leading-relaxed" style={{ color: "var(--c-text2)" }}>
            {extract}
          </p>
          <a
            href={article.content_urls.desktop.page}
            target="_blank"
            rel="noopener noreferrer"
            className="text-xs font-medium"
            style={{ color: "var(--c-accent)" }}
          >
            {t("discover.readMore")}
          </a>
        </>
      )}
    </div>
  );
}
