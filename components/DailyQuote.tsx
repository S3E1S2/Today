"use client";

import { useEffect, useState } from "react";

interface Quote { q: string; a: string; }

const CACHE_KEY = "today-quote";

export default function DailyQuote() {
  const [quote, setQuote] = useState<Quote | null>(null);

  useEffect(() => {
    const today = new Date().toISOString().slice(0, 10);
    try {
      const cached = localStorage.getItem(CACHE_KEY);
      if (cached) {
        const { date, data } = JSON.parse(cached);
        if (date === today) { setQuote(data); return; }
      }
    } catch {}

    fetch("/api/quote")
      .then(r => r.json())
      .then((data: Quote & { error?: string }) => {
        if (!data.error && data.q) {
          setQuote(data);
          try { localStorage.setItem(CACHE_KEY, JSON.stringify({ date: today, data })); } catch {}
        }
      })
      .catch(() => {});
  }, []);

  if (!quote) return null;

  return (
    <div style={{ marginBottom: "1.75rem" }}>
      <p className="text-sm italic leading-relaxed" style={{ color: "var(--c-text2)" }}>
        &ldquo;{quote.q}&rdquo;
      </p>
      <p className="text-xs mt-1" style={{ color: "var(--c-text3)" }}>
        — {quote.a}
      </p>
    </div>
  );
}
