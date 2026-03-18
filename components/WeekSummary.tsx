"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";

interface Habit { id: string; completedDates: string[]; }
interface SleepEntry { date: string; hours: number; }

function localDS(d: Date) {
  return `${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,"0")}-${String(d.getDate()).padStart(2,"0")}`;
}

function getThisWeekDates(): string[] {
  const today = new Date();
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(today);
    d.setDate(today.getDate() - (6 - i));
    return localDS(d);
  });
}

function getStreak(dates: string[]): number {
  if (!dates.length) return 0;
  const sorted = [...dates].sort().reverse();
  const today = localDS(new Date());
  let streak = 0;
  let cur = new Date(today);
  for (let i = 0; i < 365; i++) {
    if (sorted.includes(localDS(cur))) { streak++; cur.setDate(cur.getDate() - 1); }
    else break;
  }
  return streak;
}

function SparkleIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M12 3l1.88 5.76L19.5 10l-5.62 1.24L12 17l-1.88-5.76L4.5 10l5.62-1.24L12 3z" />
    </svg>
  );
}

export default function WeekSummary() {
  const { t } = useLanguage();
  const { user } = useAuth();
  const [stats, setStats] = useState<{
    habitPct: number | null;
    avgSleep: number | null;
    bestStreak: number;
  } | null>(null);
  const [sentence, setSentence] = useState<string | null>(null);
  const [hasData, setHasData]   = useState(false);

  async function loadStats() {
    const week = getThisWeekDates();
    let habitPct: number | null = null;
    let bestStreak = 0;
    let avgSleep: number | null = null;

    if (user) {
      // Signed in — read directly from Supabase
      try {
        const [{ data: rows }, { data: comps }] = await Promise.all([
          supabase.from("habits").select("id").eq("user_id", user.id),
          supabase.from("habit_completions").select("habit_id, date").eq("user_id", user.id),
        ]);
        const habits: Habit[] = (rows ?? []).map(h => ({
          id: h.id,
          completedDates: (comps ?? []).filter(c => c.habit_id === h.id).map(c => c.date as string),
        }));
        if (habits.length > 0) {
          const totalSlots = week.length * habits.length;
          const doneSlots  = habits.reduce((acc, h) => acc + week.filter(d => h.completedDates.includes(d)).length, 0);
          habitPct = Math.round((doneSlots / totalSlots) * 100);
          bestStreak = Math.max(...habits.map(h => getStreak(h.completedDates)));
        }
      } catch (e) { console.error("[WeekSummary] habits error:", e); }

      try {
        const { data: sleepRows } = await supabase
          .from("sleep_entries")
          .select("date, hours")
          .eq("user_id", user.id)
          .in("date", week);
        if (sleepRows && sleepRows.length > 0) {
          avgSleep = Math.round((sleepRows.reduce((a, e) => a + (e.hours as number), 0) / sleepRows.length) * 10) / 10;
        }
      } catch (e) { console.error("[WeekSummary] sleep error:", e); }
    } else {
      // Guest — read from localStorage
      try {
        const habits: Habit[] = JSON.parse(localStorage.getItem("today-habits-v1") ?? "[]");
        if (habits.length > 0) {
          const totalSlots = week.length * habits.length;
          const doneSlots  = habits.reduce((acc, h) => acc + week.filter(d => h.completedDates.includes(d)).length, 0);
          habitPct = Math.round((doneSlots / totalSlots) * 100);
          bestStreak = Math.max(...habits.map(h => getStreak(h.completedDates)));
        }
      } catch {}
      try {
        const sleepRaw = localStorage.getItem("today-sleep-v1");
        if (sleepRaw) {
          const entries: SleepEntry[] = JSON.parse(sleepRaw);
          const weekEntries = entries.filter(e => week.includes(e.date));
          if (weekEntries.length > 0)
            avgSleep = Math.round((weekEntries.reduce((a, e) => a + e.hours, 0) / weekEntries.length) * 10) / 10;
        }
      } catch {}
    }

    const any = habitPct !== null;
    setHasData(any);
    setStats({ habitPct, avgSleep, bestStreak });

    if (any) {
      fetch("/api/week-summary", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ habitPct, avgSleep, bestStreak }),
      })
        .then(r => r.json())
        .then(d => { if (d.sentence) setSentence(d.sentence); })
        .catch(() => {});
    }
  }

  useEffect(() => {
    setSentence(null);
    loadStats();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  // Also refresh when habits are updated (guest mode or same session changes)
  useEffect(() => {
    window.addEventListener("habits-updated", loadStats);
    return () => window.removeEventListener("habits-updated", loadStats);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  if (!hasData || !stats) return null;

  return (
    <div className="card p-6 flex flex-col gap-3">
      <div className="flex items-center gap-2.5">
        <span style={{ color: "var(--c-accent)" }}><SparkleIcon /></span>
        <h2 className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--c-text2)" }}>
          {t("weekly.title")}
        </h2>
      </div>

      <div className="flex flex-wrap gap-x-6 gap-y-1.5">
        {stats.habitPct !== null && (
          <span className="text-sm" style={{ color: "var(--c-text2)" }}>
            {t("weekly.habits", { pct: stats.habitPct })}
          </span>
        )}
        {stats.avgSleep !== null && (
          <span className="text-sm" style={{ color: "var(--c-text2)" }}>
            {t("weekly.sleep", { h: stats.avgSleep })}
          </span>
        )}
        {stats.bestStreak > 0 && (
          <span className="text-sm" style={{ color: "var(--c-text2)" }}>
            {stats.bestStreak === 1 ? t("weekly.streakDay", { n: 1 }) : t("weekly.streak", { n: stats.bestStreak })}
          </span>
        )}
      </div>

      {sentence && (
        <p className="text-sm italic leading-relaxed" style={{ color: "var(--c-text3)" }}>
          {sentence}
        </p>
      )}
    </div>
  );
}
