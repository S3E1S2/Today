"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { useAuth } from "./AuthProvider";

export default function DashboardHeader() {
  const { locale, t } = useLanguage();
  const { displayName, emoji } = useAuth();
  const [now, setNow] = useState(new Date());

  useEffect(() => {
    const id = setInterval(() => setNow(new Date()), 1000);
    return () => clearInterval(id);
  }, []);

  const h = now.getHours();
  const greeting = h < 12 ? t("greeting.morning") : h < 17 ? t("greeting.afternoon") : t("greeting.evening");

  const timeStr = now.toLocaleTimeString("en-US", {
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
  });

  const dateStr = now.toLocaleDateString(locale, {
    weekday: "long",
    month: "long",
    day: "numeric",
    year: "numeric",
  });

  return (
    <header className="mb-10 pr-12">
      <h1 className="text-3xl sm:text-4xl font-bold tracking-tight" style={{ color: "var(--c-text1)" }}>
        {greeting}{displayName ? `, ${displayName}` : ""} {emoji ?? "☀️"}
      </h1>
      <div className="flex items-center gap-3 mt-1.5 flex-wrap">
        <p className="text-base" style={{ color: "var(--c-text3)" }}>{dateStr}</p>
        <span style={{ color: "var(--c-border)" }}>·</span>
        <p className="text-base tabular-nums font-medium" style={{ color: "var(--c-text2)" }}>{timeStr}</p>
      </div>
    </header>
  );
}
