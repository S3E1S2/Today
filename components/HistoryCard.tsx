"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";

interface HistoryEvent {
  year: string;
  text: string;
}

function ClockIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

export default function HistoryCard() {
  const { locale, t } = useLanguage();
  const [events,  setEvents]  = useState<HistoryEvent[]>([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState<string | null>(null);

  useEffect(() => {
    const now   = new Date();
    const month = now.getMonth() + 1;
    const day   = now.getDate();

    fetch(`https://en.wikipedia.org/api/rest_v1/feed/onthisday/events/${month}/${day}`, {
      headers: { Accept: "application/json" },
    })
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json(); })
      .then(data => {
        const all: HistoryEvent[] = (data.events ?? []).map((e: { year: string | number; text: string }) => ({
          year: String(e.year),
          text: e.text,
        }));
        const shuffled = all.sort(() => Math.random() - 0.5).slice(0, 4);
        shuffled.sort((a, b) => Number(a.year) - Number(b.year));
        setEvents(shuffled);
      })
      .catch(e => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  const today = new Date();
  const dateLabel = today.toLocaleDateString(locale, { month: "long", day: "numeric" });

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <span style={{ color: "var(--c-accent)" }}><ClockIcon /></span>
        <h2 className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--c-text2)" }}>
          {t("history.title")} — {dateLabel}
        </h2>
      </div>

      {loading && (
        <div className="flex flex-col gap-4">
          {[...Array(4)].map((_, i) => (
            <div key={i} className="animate-pulse flex gap-3">
              <div className="h-4 w-12 rounded shrink-0 mt-0.5" style={{ backgroundColor: "var(--c-skel)" }} />
              <div className="flex-1">
                <div className="h-2.5 rounded w-full mb-1.5" style={{ backgroundColor: "var(--c-skel)" }} />
                <div className="h-2.5 rounded w-5/6" style={{ backgroundColor: "var(--c-skel)" }} />
              </div>
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="text-sm" style={{ color: "var(--c-text3)" }}>{t("history.error")}</p>
      )}

      {!loading && !error && (
        <div className="flex flex-col gap-4">
          {events.map((e, i) => (
            <div key={i} className="flex gap-3">
              <span className="text-xs font-mono font-semibold shrink-0 pt-0.5 w-12 text-right" style={{ color: "var(--c-accent)" }}>
                {e.year}
              </span>
              <p className="text-sm leading-relaxed" style={{ color: "var(--c-text2)" }}>{e.text}</p>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
