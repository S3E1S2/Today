"use client";

import { useEffect, useRef, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";

interface Habit {
  id: string;
  name: string;
  completedDates: string[]; // "YYYY-MM-DD"
}

function todayStr() {
  return new Date().toLocaleDateString("en-CA");
}

function getStreak(completedDates: string[]): number {
  if (completedDates.length === 0) return 0;
  const dateSet = new Set(completedDates);
  const today = todayStr();
  const cursor = new Date();
  if (!dateSet.has(today)) cursor.setDate(cursor.getDate() - 1);
  let streak = 0;
  while (true) {
    const s = cursor.toLocaleDateString("en-CA");
    if (dateSet.has(s)) { streak++; cursor.setDate(cursor.getDate() - 1); }
    else break;
  }
  return streak;
}

function CheckIcon() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="20 6 9 17 4 12" />
    </svg>
  );
}
function PlusIcon() {
  return (
    <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
      <line x1="12" y1="5" x2="12" y2="19" /><line x1="5" y1="12" x2="19" y2="12" />
    </svg>
  );
}
function TrashIcon() {
  return (
    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="3 6 5 6 21 6" />
      <path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6" />
      <path d="M10 11v6M14 11v6" />
      <path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2" />
    </svg>
  );
}
function FlameIcon() {
  return (
    <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor">
      <path d="M12 2C9 7 8 9 10 13c-2-1-3-3-3-3s-1 5 3 7c-1 0-2 0-3-1 1 3 4 5 7 5a7 7 0 0 0 7-7c0-5-3-7-5-7-1 2-2 3-1 5-2-2-2-5-5-8Z" />
    </svg>
  );
}
function TargetIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <circle cx="12" cy="12" r="10" /><circle cx="12" cy="12" r="6" /><circle cx="12" cy="12" r="2" />
    </svg>
  );
}

const STORAGE_KEY = "today-habits-v1";

function loadHabitsFromLS(): Habit[] {
  try { const raw = localStorage.getItem(STORAGE_KEY); return raw ? JSON.parse(raw) : []; }
  catch { return []; }
}

// Write to localStorage + notify CalendarSection
function syncToLS(habits: Habit[]) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(habits)); } catch {}
  window.dispatchEvent(new CustomEvent("habits-updated"));
}

export default function HabitTracker() {
  const { t }    = useLanguage();
  const { user } = useAuth();
  const [habits,  setHabits]  = useState<Habit[]>([]);
  const [newName, setNewName] = useState("");
  const [mounted, setMounted] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  // Load data — switches between Supabase (logged in) and localStorage (guest)
  useEffect(() => {
    setMounted(false);
    if (!user) {
      setHabits(loadHabitsFromLS());
      setMounted(true);
      return;
    }
    (async () => {
      const [{ data: rows }, { data: comps }] = await Promise.all([
        supabase.from("habits").select("id, name").eq("user_id", user.id).order("created_at"),
        supabase.from("habit_completions").select("habit_id, date").eq("user_id", user.id),
      ]);
      const loaded: Habit[] = (rows ?? []).map((h) => ({
        id: h.id,
        name: h.name,
        completedDates: (comps ?? [])
          .filter((c) => c.habit_id === h.id)
          .map((c) => c.date as string),
      }));
      setHabits(loaded);
      syncToLS(loaded); // keep localStorage in sync so CalendarSection heatmap works
      setMounted(true);
    })();
  }, [user?.id]);

  const toggleToday = async (id: string) => {
    const today = todayStr();
    const habit = habits.find((h) => h.id === id);
    if (!habit) return;
    const wasDone = habit.completedDates.includes(today);

    // Optimistic update
    const updated = habits.map((h) =>
      h.id !== id ? h : {
        ...h,
        completedDates: wasDone
          ? h.completedDates.filter((d) => d !== today)
          : [...h.completedDates, today],
      }
    );
    setHabits(updated);
    syncToLS(updated);

    if (user) {
      if (wasDone) {
        await supabase.from("habit_completions").delete()
          .eq("habit_id", id).eq("date", today);
      } else {
        await supabase.from("habit_completions")
          .upsert({ habit_id: id, user_id: user.id, date: today }, { onConflict: "habit_id,date" });
      }
    }
  };

  const addHabit = async () => {
    const name = newName.trim();
    if (!name) return;
    setNewName("");
    inputRef.current?.focus();

    if (user) {
      const { data } = await supabase
        .from("habits")
        .insert({ user_id: user.id, name })
        .select("id")
        .single();
      if (data?.id) {
        const updated = [...habits, { id: data.id, name, completedDates: [] }];
        setHabits(updated);
        syncToLS(updated);
      }
    } else {
      const updated = [...habits, { id: crypto.randomUUID(), name, completedDates: [] }];
      setHabits(updated);
      syncToLS(updated);
    }
  };

  const deleteHabit = async (id: string) => {
    const updated = habits.filter((h) => h.id !== id);
    setHabits(updated);
    syncToLS(updated);
    if (user) {
      await supabase.from("habits").delete().eq("id", id);
    }
  };

  const today     = todayStr();
  const doneCount = habits.filter((h) => h.completedDates.includes(today)).length;

  return (
    <div className="card p-6 flex flex-col gap-5">
      {/* Header */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span style={{ color: "var(--c-accent)" }}><TargetIcon /></span>
          <h2 className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--c-text2)" }}>
            {t("habits.title")}
          </h2>
        </div>
        {mounted && habits.length > 0 && (
          <span className="text-xs" style={{ color: "var(--c-text3)" }}>
            {t("habits.count", { done: doneCount, total: habits.length })}
          </span>
        )}
      </div>

      {/* Empty state */}
      {mounted && habits.length === 0 && (
        <p className="text-sm text-center py-4" style={{ color: "var(--c-text3)" }}>
          {t("habits.empty")}
        </p>
      )}

      {/* Habit list */}
      {mounted && habits.length > 0 && (
        <div className="flex flex-col gap-2">
          {habits.map((h) => {
            const done   = h.completedDates.includes(today);
            const streak = getStreak(h.completedDates);
            return (
              <div
                key={h.id}
                className="flex items-center gap-3 rounded-xl px-4 py-3 transition-colors"
                style={{ backgroundColor: done ? "var(--c-done-bg)" : "var(--c-item)" }}
              >
                {/* Checkbox */}
                <button
                  onClick={() => toggleToday(h.id)}
                  className={`w-6 h-6 rounded-full flex items-center justify-center shrink-0 border-2 transition-all cursor-pointer ${!done ? "check-empty" : ""}`}
                  style={done ? {
                    backgroundColor: "var(--c-check)",
                    borderColor: "var(--c-check)",
                    color: "var(--c-accent-fg)",
                  } : undefined}
                  aria-label={done ? t("habits.markIncomplete") : t("habits.markComplete")}
                >
                  {done && <CheckIcon />}
                </button>

                {/* Name */}
                <span
                  className={`flex-1 text-sm font-medium transition-colors ${done ? "line-through" : ""}`}
                  style={{ color: done ? "var(--c-done-fg)" : "var(--c-text1)" }}
                >
                  {h.name}
                </span>

                {/* Streak */}
                {streak > 0 && (
                  <span className="flex items-center gap-1 text-xs font-semibold" style={{ color: "var(--c-streak)" }}>
                    <FlameIcon />
                    {streak}
                  </span>
                )}

                {/* Delete */}
                <button
                  onClick={() => deleteHabit(h.id)}
                  className="trash-btn ml-1 cursor-pointer"
                  aria-label={t("habits.delete")}
                >
                  <TrashIcon />
                </button>
              </div>
            );
          })}
        </div>
      )}

      {/* Add new habit */}
      <form onSubmit={(e) => { e.preventDefault(); addHabit(); }} className="flex gap-2">
        <input
          ref={inputRef}
          type="text"
          value={newName}
          onChange={(e) => setNewName(e.target.value)}
          placeholder={t("habits.placeholder")}
          className="th-input flex-1 text-sm rounded-lg px-3 py-2.5"
        />
        <button
          type="submit"
          disabled={!newName.trim()}
          className="th-btn flex items-center gap-1.5 text-sm font-medium px-4 py-2.5 rounded-lg cursor-pointer"
        >
          <PlusIcon />
          {t("habits.add")}
        </button>
      </form>
    </div>
  );
}
