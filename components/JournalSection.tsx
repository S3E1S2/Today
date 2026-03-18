"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";

const LS_PREFIX = "today-journal-";

function localDS(date: Date) {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function BookIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 19.5A2.5 2.5 0 0 1 6.5 17H20" />
      <path d="M6.5 2H20v20H6.5A2.5 2.5 0 0 1 4 19.5v-15A2.5 2.5 0 0 1 6.5 2z" />
    </svg>
  );
}

function ChevLeft() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="15 18 9 12 15 6" />
    </svg>
  );
}
function ChevRight() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="9 18 15 12 9 6" />
    </svg>
  );
}

export default function JournalSection() {
  const { locale, t } = useLanguage();
  const { user }      = useAuth();
  const sectionRef    = useRef<HTMLDivElement>(null);

  const [currentDate, setCurrentDate] = useState<Date>(new Date());
  const [content, setContent]         = useState("");
  const [status, setStatus]           = useState<"idle" | "saving" | "saved">("idle");
  const debounceRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  const dateStr = localDS(currentDate);
  const isToday = dateStr === localDS(new Date());

  // Load entry for current date
  useEffect(() => {
    setContent("");
    setStatus("idle");
    // Load from localStorage first (instant, works even if Supabase table missing)
    try {
      const local = localStorage.getItem(LS_PREFIX + dateStr);
      if (local) setContent(local);
    } catch {}

    // If logged in, try Supabase and override local if found
    if (user) {
      supabase
        .from("journal_entries")
        .select("content")
        .eq("user_id", user.id)
        .eq("date", dateStr)
        .single()
        .then(({ data }) => { if (data?.content) setContent(data.content); });
    }
  }, [dateStr, user?.id]);

  // Listen for calendar date-open events
  useEffect(() => {
    const handler = (e: Event) => {
      const ds = (e as CustomEvent<string>).detail;
      if (ds) {
        const [y, mo, d] = ds.split("-").map(Number);
        setCurrentDate(new Date(y, mo - 1, d));
        setTimeout(() => {
          sectionRef.current?.scrollIntoView({ behavior: "smooth", block: "start" });
        }, 80);
      }
    };
    window.addEventListener("journal-date-open", handler);
    return () => window.removeEventListener("journal-date-open", handler);
  }, []);

  function handleChange(val: string) {
    setContent(val);
    setStatus("saving");
    if (debounceRef.current) clearTimeout(debounceRef.current);
    debounceRef.current = setTimeout(() => save(val), 1000);
  }

  async function save(val: string) {
    // Always persist locally so data is never lost
    try { localStorage.setItem(LS_PREFIX + dateStr, val); } catch {}

    if (user) {
      const { error } = await supabase.from("journal_entries").upsert({
        user_id:    user.id,
        date:       dateStr,
        content:    val,
        updated_at: new Date().toISOString(),
      }, { onConflict: "user_id,date" });
      if (error) console.warn("[Journal] Supabase save failed:", error.message);
    }

    setStatus("saved");
    setTimeout(() => setStatus("idle"), 2000);
  }

  function goDay(delta: number) {
    const d = new Date(currentDate);
    d.setDate(d.getDate() + delta);
    if (d <= new Date()) setCurrentDate(d);
  }

  const dateLabel = currentDate.toLocaleDateString(locale, {
    weekday: "long", month: "long", day: "numeric",
  });

  return (
    <div ref={sectionRef} className="card p-6 flex flex-col gap-4 h-full">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span style={{ color: "var(--c-accent)" }}><BookIcon /></span>
          <h2 className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--c-text2)" }}>
            {t("journal.title")}
          </h2>
        </div>

        {/* Date nav */}
        <div className="flex items-center gap-2">
          <button
            onClick={() => goDay(-1)}
            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer"
            style={{ color: "var(--c-text2)", backgroundColor: "var(--c-item)" }}
          >
            <ChevLeft />
          </button>
          <span className="text-sm font-medium" style={{ color: "var(--c-text1)" }}>
            {isToday ? t("cal.today") : dateLabel}
          </span>
          <button
            onClick={() => goDay(1)}
            disabled={isToday}
            className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer disabled:opacity-30"
            style={{ color: "var(--c-text2)", backgroundColor: "var(--c-item)" }}
          >
            <ChevRight />
          </button>
        </div>

        {/* Save status */}
        <span className="text-xs" style={{ color: "var(--c-text3)", minWidth: 50, textAlign: "right" }}>
          {status === "saving" ? t("journal.saving") : status === "saved" ? t("journal.saved") : ""}
        </span>
      </div>

      {/* Textarea */}
      <textarea
        value={content}
        onChange={e => handleChange(e.target.value)}
        placeholder={t("journal.placeholder")}
        className="th-input resize-none"
        rows={6}
        style={{
          width: "100%",
          fontSize: "0.9375rem",
          lineHeight: "1.7",
          borderRadius: "0.625rem",
          padding: "0.875rem 1rem",
          boxSizing: "border-box",
          fontFamily: "inherit",
        }}
      />
    </div>
  );
}
