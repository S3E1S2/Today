"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { useAuth } from "./AuthProvider";

interface Quote { q: string; a: string; }

// WMO weathercode → i18n key
const WMO_KEY: Record<number, string> = {
  0:  "weather.clear",        1:  "weather.mostlyClear",
  2:  "weather.partlyCloudy", 3:  "weather.overcast",
  45: "weather.foggy",        48: "weather.foggy",
  51: "weather.lightDrizzle", 53: "weather.drizzle",   55: "weather.drizzle",
  61: "weather.lightRain",    63: "weather.rain",       65: "weather.heavyRain",
  71: "weather.lightSnow",    73: "weather.snow",       75: "weather.heavySnow",
  80: "weather.showers",      81: "weather.showers",    82: "weather.heavyShowers",
  95: "weather.thunderstorm", 96: "weather.thunderstorm", 99: "weather.thunderstorm",
};

const LOCALE_TO_TRANSLATE: Record<string, string> = {
  "es-ES": "en|es", "fr-FR": "en|fr", "de-DE": "en|de", "id-ID": "en|id",
};

async function translateText(text: string, langpair: string): Promise<string> {
  try {
    const res = await fetch(
      `https://api.mymemory.translated.net/get?q=${encodeURIComponent(text.slice(0, 500))}&langpair=${langpair}`
    );
    if (!res.ok) return text;
    const data = await res.json() as { responseData?: { translatedText?: string }; responseStatus?: number };
    const translated = data?.responseData?.translatedText;
    if (!translated || data?.responseStatus === 403) return text;
    return translated;
  } catch { return text; }
}

export default function DashboardHeader() {
  const { locale, t } = useLanguage();
  const { displayName, emoji } = useAuth();
  const [now, setNow]         = useState<Date | null>(null);
  const [quote, setQuote]     = useState<Quote | null>(null);
  const [weatherCode, setWeatherCode] = useState<number | null>(null);
  const [temp, setTemp]       = useState<number | null>(null);

  useEffect(() => {
    setNow(new Date());
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  // Daily quote — fetch English once, translate per locale, cache both
  useEffect(() => {
    const today    = new Date().toISOString().slice(0, 10);
    const cacheKey = `today-quote-${locale}`;

    // Check locale-specific cache first
    try {
      const cached = localStorage.getItem(cacheKey);
      if (cached) {
        const { date, data } = JSON.parse(cached);
        if (date === today) { setQuote(data); return; }
      }
    } catch {}

    const langpair = LOCALE_TO_TRANSLATE[locale];

    // Fetch English quote
    fetch("/api/quote")
      .then(r => r.json())
      .then(async (d: Quote & { error?: string }) => {
        if (d.error || !d.q) return;
        let q = d.q;
        if (langpair) q = await translateText(q, langpair);
        const translated: Quote = { q, a: d.a };
        setQuote(translated);
        try { localStorage.setItem(cacheKey, JSON.stringify({ date: today, data: translated })); } catch {}
      })
      .catch(() => {});
  }, [locale]);

  // Weather — geolocation + Open-Meteo
  useEffect(() => {
    if (typeof navigator === "undefined" || !navigator.geolocation) return;
    navigator.geolocation.getCurrentPosition(
      async ({ coords: { latitude: lat, longitude: lon } }) => {
        try {
          const res = await fetch(
            `https://api.open-meteo.com/v1/forecast?latitude=${lat}&longitude=${lon}` +
            `&current=temperature_2m,weathercode&timezone=auto`
          );
          const data = await res.json();
          setTemp(Math.round(data.current.temperature_2m));
          setWeatherCode(data.current.weathercode);
        } catch {}
      },
      () => {}
    );
  }, []);

  const h        = now ? now.getHours() : 6;
  const greeting = h < 12 ? t("greeting.morning") : h < 17 ? t("greeting.afternoon") : t("greeting.evening");

  const timeStr = now ? now.toLocaleTimeString("en-US", {
    hour: "numeric", minute: "2-digit", hour12: true,
  }) : null;

  const dateStr = now ? now.toLocaleDateString(locale, {
    weekday: "long", month: "long", day: "numeric", year: "numeric",
  }) : null;

  const conditionKey = weatherCode !== null ? (WMO_KEY[weatherCode] ?? "weather.unknown") : null;

  return (
    <header className="mb-8 pr-12">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: "var(--c-text1)" }}>
        {greeting}{displayName ? `, ${displayName}` : ""} {emoji ?? "☀️"}
      </h1>

      {/* Date · Time · Weather */}
      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
        {dateStr && <p className="text-base" style={{ color: "var(--c-text3)" }}>{dateStr}</p>}
        {dateStr && timeStr && <span style={{ color: "var(--c-border)" }}>·</span>}
        {timeStr && <p className="text-base tabular-nums font-medium" style={{ color: "var(--c-text2)" }}>{timeStr}</p>}
        {temp !== null && conditionKey && (
          <>
            <span style={{ color: "var(--c-border)" }}>·</span>
            <p className="text-base" style={{ color: "var(--c-text3)" }}>
              {temp}° {t(conditionKey)}
            </p>
          </>
        )}
      </div>

      {/* Quote */}
      {quote && (
        <p className="text-sm italic mt-2 leading-relaxed" style={{ color: "var(--c-text3)" }}>
          &ldquo;{quote.q}&rdquo; &mdash; <span style={{ fontStyle: "normal" }}>{quote.a}</span>
        </p>
      )}
    </header>
  );
}
