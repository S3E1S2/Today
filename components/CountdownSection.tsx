"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";

const LS_KEY = "today-countdowns";

interface Countdown {
  id: string;
  name: string;
  date: string; // YYYY-MM-DD
}

function localToday() {
  const now = new Date();
  const y   = now.getFullYear();
  const m   = String(now.getMonth() + 1).padStart(2, "0");
  const d   = String(now.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function diffDays(dateStr: string): number {
  const today = new Date(localToday() + "T00:00:00");
  const target = new Date(dateStr + "T00:00:00");
  return Math.round((target.getTime() - today.getTime()) / 86400000);
}

function TimerIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="9" />
      <polyline points="12 6 12 12 16 14" />
    </svg>
  );
}

function TrashIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14H6L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4h6v2" />
    </svg>
  );
}

export default function CountdownSection() {
  const { t }    = useLanguage();
  const { user } = useAuth();

  const [items,   setItems]   = useState<Countdown[]>([]);
  const [name,    setName]    = useState("");
  const [date,    setDate]    = useState("");
  const [mounted, setMounted] = useState(false);

  const today = localToday();

  useEffect(() => {
    setMounted(true);
    load();
  }, [user?.id]);

  async function load() {
    if (user) {
      const { data } = await supabase
        .from("countdowns")
        .select("id, name, date")
        .eq("user_id", user.id)
        .order("date");
      if (data) setItems(data.map(r => ({ ...r, date: String(r.date) })));
    } else {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) setItems(JSON.parse(raw));
      } catch {}
    }
  }

  function syncLS(next: Countdown[]) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
  }

  async function addItem() {
    if (!name.trim() || !date) return;
    const item: Countdown = { id: crypto.randomUUID(), name: name.trim(), date };
    if (user) {
      const { data } = await supabase
        .from("countdowns")
        .insert({ user_id: user.id, name: item.name, date: item.date })
        .select("id")
        .single();
      if (data?.id) item.id = data.id;
    }
    const next = [...items, item].sort((a, b) => a.date.localeCompare(b.date));
    setItems(next);
    if (!user) syncLS(next);
    setName(""); setDate("");
  }

  async function deleteItem(id: string) {
    if (user) {
      await supabase.from("countdowns").delete().eq("id", id);
    }
    const next = items.filter(i => i.id !== id);
    setItems(next);
    if (!user) syncLS(next);
  }

  // Filter out past events (more than 0 days away, i.e. keep today and future)
  const visible = items.filter(i => diffDays(i.date) >= 0);

  return (
    <div className="card p-6 flex flex-col gap-4 h-full">
      <div className="flex items-center gap-2.5">
        <span style={{ color: "var(--c-accent)" }}><TimerIcon /></span>
        <h2 className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--c-text2)" }}>
          {t("countdown.title")}
        </h2>
      </div>

      {/* List */}
      {mounted && visible.length === 0 && (
        <p className="text-sm" style={{ color: "var(--c-text3)" }}>{t("countdown.empty")}</p>
      )}
      {mounted && visible.length > 0 && (
        <div className="flex flex-col gap-2">
          {visible.map(item => {
            const days = diffDays(item.date);
            return (
              <div
                key={item.id}
                className="flex items-center justify-between gap-3 px-3 py-2 rounded-xl"
                style={{ backgroundColor: "var(--c-item)" }}
              >
                <span className="text-sm flex-1 min-w-0 truncate" style={{ color: "var(--c-text1)" }}>
                  {item.name}
                </span>
                <span
                  className="text-sm font-semibold shrink-0"
                  style={{ color: days === 0 ? "var(--c-check)" : "var(--c-accent)" }}
                >
                  {days === 0 ? t("countdown.today") : t("countdown.days", { n: days })}
                </span>
                <button
                  onClick={() => deleteItem(item.id)}
                  className="trash-btn cursor-pointer shrink-0"
                  aria-label={t("countdown.delete")}
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add form */}
      <form
        onSubmit={e => { e.preventDefault(); addItem(); }}
        className="flex gap-2 flex-wrap"
      >
        <input
          type="text"
          value={name}
          onChange={e => setName(e.target.value)}
          placeholder={t("countdown.placeholder")}
          className="th-input flex-1 text-sm rounded-lg px-3 py-2"
          style={{ minWidth: 120 }}
        />
        <input
          type="date"
          value={date}
          min={today}
          onChange={e => setDate(e.target.value)}
          className="th-input text-sm rounded-lg px-3 py-2"
          style={{ minWidth: 130 }}
        />
        <button
          type="submit"
          disabled={!name.trim() || !date}
          className="th-btn text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer disabled:opacity-40"
        >
          {t("countdown.add")}
        </button>
      </form>
    </div>
  );
}
