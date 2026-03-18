"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";

/* ── Types ─────────────────────────────────────────────────────────────────── */

type DS = string; // "YYYY-MM-DD"
interface Habit      { id: string; name: string; completedDates: DS[]; }
interface MoodEntry  { score: 1|2|3|4|5; note: string; }
interface EventEntry { id: string; title: string; time: string; }

/* ── Storage keys ──────────────────────────────────────────────────────────── */

const HABITS_KEY     = "today-habits-v1";
const MOODS_KEY      = "today-moods-v1";
const EVENTS_KEY     = "today-events-v1";
const WEEK_START_KEY = "today-week-start";
const LANGUAGE_KEY   = "today-language";

/* ── Constants ─────────────────────────────────────────────────────────────── */

const MOOD_EMOJI  = {1:"😞",2:"😕",3:"😐",4:"🙂",5:"😄"} as const;
const MOOD_COLOR  = {1:"#EF4444",2:"#F97316",3:"#EAB308",4:"#84CC16",5:"#22C55E"} as const;
const HABIT_DOTS  = ["#72C464","#5B9BD4","#E8855A","#A855F7","#06B6D4","#F59E0B","#EC4899","#14B8A6"];

type HeatRange = "3m" | "year" | "all";

/* ── Storage helpers ───────────────────────────────────────────────────────── */

function loadJSON<T>(key: string, def: T): T {
  try { const r = localStorage.getItem(key); return r ? JSON.parse(r) : def; } catch { return def; }
}
function saveJSON(key: string, v: unknown) {
  try { localStorage.setItem(key, JSON.stringify(v)); } catch {}
}
function loadWeekStart(): 0 | 1 {
  try { return localStorage.getItem(WEEK_START_KEY) === "1" ? 1 : 0; } catch { return 0; }
}
function loadLocale(): string {
  try { return localStorage.getItem(LANGUAGE_KEY) || "en-US"; } catch { return "en-US"; }
}

/* ── Date helpers ──────────────────────────────────────────────────────────── */

function localDS(d: Date): DS { return d.toLocaleDateString("en-CA"); }

// Known Sunday for Intl reference
const REF_SUNDAY = new Date(2024, 0, 7);

function getDayHeaders(locale: string, weekStart: 0 | 1): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(REF_SUNDAY);
    d.setDate(REF_SUNDAY.getDate() + ((i + weekStart) % 7));
    return new Intl.DateTimeFormat(locale, { weekday: "short" }).format(d).replace(/\.$/, "");
  });
}

function getDayNarrow(locale: string, weekStart: 0 | 1): string[] {
  return Array.from({ length: 7 }, (_, i) => {
    const d = new Date(REF_SUNDAY);
    d.setDate(REF_SUNDAY.getDate() + ((i + weekStart) % 7));
    return new Intl.DateTimeFormat(locale, { weekday: "narrow" }).format(d);
  });
}

function buildMonthGrid(year: number, month: number, weekStart: 0 | 1): (Date | null)[] {
  const firstDow = new Date(year, month, 1).getDay(); // 0=Sun
  const leading  = (firstDow - weekStart + 7) % 7;
  const numDays  = new Date(year, month + 1, 0).getDate();
  const cells: (Date | null)[] = Array(leading).fill(null);
  for (let d = 1; d <= numDays; d++) cells.push(new Date(year, month, d));
  while (cells.length % 7 !== 0) cells.push(null);
  return cells;
}

function buildHeatmapWeeks(
  range: HeatRange,
  habits: Habit[],
  weekStart: 0 | 1,
  accountCreatedAt?: Date | null,
  heatYear?: number,
): Date[][] {
  const today = new Date(); today.setHours(0, 0, 0, 0);

  let startDate: Date;
  let endDate: Date = new Date(today);

  if (range === "3m") {
    // Last 90 days ending today
    startDate = new Date(today);
    startDate.setDate(today.getDate() - 89);
  } else if (range === "year") {
    const yr = heatYear ?? today.getFullYear();
    startDate = new Date(yr, 0, 1);
    endDate   = new Date(yr, 11, 31);
  } else {
    // All time: from account creation (logged in) or earliest habit entry (guest)
    let earliest = new Date(today);
    if (accountCreatedAt) {
      earliest = new Date(accountCreatedAt); earliest.setHours(0, 0, 0, 0);
    } else {
      for (const h of habits) {
        for (const d of h.completedDates) {
          const date = new Date(d + "T00:00:00");
          if (date < earliest) earliest = date;
        }
      }
    }
    startDate = earliest;
  }

  // Align startDate to the beginning of its week
  const startDow  = startDate.getDay();
  const daysBack  = (startDow - weekStart + 7) % 7;
  const alignedStart = new Date(startDate);
  alignedStart.setDate(startDate.getDate() - daysBack);

  // Align endDate to the end of its week
  const endDow      = endDate.getDay();
  const daysForward = ((weekStart + 6) - endDow + 7) % 7;
  const alignedEnd  = new Date(endDate);
  alignedEnd.setDate(endDate.getDate() + daysForward);

  const weeks: Date[][] = [];
  const cur = new Date(alignedStart);
  while (cur <= alignedEnd && weeks.length < 260) {
    const week: Date[] = [];
    for (let i = 0; i < 7; i++) { week.push(new Date(cur)); cur.setDate(cur.getDate() + 1); }
    weeks.push(week);
  }
  return weeks;
}

/* ── Icons ─────────────────────────────────────────────────────────────────── */

function XIcon() {
  return <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>;
}
function ChevLeft() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="15 18 9 12 15 6"/></svg>;
}
function ChevRight() {
  return <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><polyline points="9 18 15 12 9 6"/></svg>;
}
function PlusIcon() {
  return <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round"><line x1="12" y1="5" x2="12" y2="19"/><line x1="5" y1="12" x2="19" y2="12"/></svg>;
}
function TrashIcon() {
  return <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="3 6 5 6 21 6"/><path d="M19 6l-1 14a2 2 0 0 1-2 2H8a2 2 0 0 1-2-2L5 6"/><path d="M10 11v6M14 11v6"/><path d="M9 6V4a1 1 0 0 1 1-1h4a1 1 0 0 1 1 1v2"/></svg>;
}
function CalendarIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><rect x="3" y="4" width="18" height="18" rx="2"/><line x1="16" y1="2" x2="16" y2="6"/><line x1="8" y1="2" x2="8" y2="6"/><line x1="3" y1="10" x2="21" y2="10"/></svg>;
}
function ActivityIcon() {
  return <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>;
}

/* ── DayPopover ────────────────────────────────────────────────────────────── */

interface PopoverProps {
  date: Date;
  locale: string;
  habits: Habit[];
  mood: MoodEntry | null;
  events: EventEntry[];
  onClose: () => void;
  onSaveMood: (entry: MoodEntry) => void;
  onAddEvent: (e: Omit<EventEntry, "id">) => void;
  onDeleteEvent: (id: string) => void;
}

function DayPopover({ date, locale, habits, mood, events, onClose, onSaveMood, onAddEvent, onDeleteEvent }: PopoverProps) {
  const { t } = useLanguage();
  const [score,   setScore]   = useState<0|1|2|3|4|5>((mood?.score ?? 0) as 0|1|2|3|4|5);
  const [note,    setNote]    = useState(mood?.note ?? "");
  const [evTitle, setEvTitle] = useState("");
  const [evTime,  setEvTime]  = useState("");

  const dateStr    = localDS(date);
  const doneHabits = habits.filter(h => h.completedDates.includes(dateStr));
  const dateLabel  = date.toLocaleDateString(locale, { weekday: "long", month: "long", day: "numeric", year: "numeric" });

  useEffect(() => {
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") onClose(); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [onClose]);

  function saveMood() {
    if (!score) return;
    onSaveMood({ score: score as 1|2|3|4|5, note: note.trim() });
    onClose();
  }

  function addEvent() {
    if (!evTitle.trim()) return;
    onAddEvent({ title: evTitle.trim(), time: evTime });
    setEvTitle(""); setEvTime("");
  }

  return (
    <div
      className="fixed inset-0 flex items-center justify-center p-4"
      style={{ backgroundColor: "rgba(0,0,0,0.60)", zIndex: 1000 }}
      onClick={e => { if (e.target === e.currentTarget) onClose(); }}
    >
      <div
        className="w-full max-w-sm rounded-2xl p-6 max-h-[90vh] overflow-y-auto"
        style={{
          backgroundColor: "var(--c-card)",
          border: "1px solid var(--c-border)",
          boxShadow: "0 4px 24px rgba(0,0,0,0.15), 0 16px 48px rgba(0,0,0,0.20)",
          zIndex: 1001,
        }}
      >
        {/* Header */}
        <div className="flex items-start justify-between mb-5">
          <div>
            <h3 className="font-semibold text-sm leading-snug" style={{ color: "var(--c-text1)" }}>{dateLabel}</h3>
            {habits.length > 0 && (
              <p className="text-xs mt-0.5" style={{ color: "var(--c-text3)" }}>
                {t("cal.habitsOf", { done: doneHabits.length, total: habits.length })}
              </p>
            )}
          </div>
          <button
            onClick={onClose}
            className="w-7 h-7 rounded-full flex items-center justify-center shrink-0 cursor-pointer"
            style={{ color: "var(--c-text3)", backgroundColor: "var(--c-item)" }}
          >
            <XIcon />
          </button>
        </div>

        {/* Mood */}
        <section className="mb-5">
          <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: "var(--c-text2)" }}>
            {t("cal.howWasYourDay")}
          </p>
          <div className="flex gap-1.5">
            {([1,2,3,4,5] as const).map(s => (
              <button
                key={s}
                onClick={() => setScore(score === s ? 0 : s)}
                className="flex-1 h-11 rounded-xl text-xl transition-all cursor-pointer"
                style={{
                  backgroundColor: score === s ? `${MOOD_COLOR[s]}22` : "var(--c-item)",
                  border: `2px solid ${score === s ? MOOD_COLOR[s] : "transparent"}`,
                  boxShadow: score === s ? `0 0 0 1px ${MOOD_COLOR[s]}44` : "none",
                }}
              >
                {MOOD_EMOJI[s]}
              </button>
            ))}
          </div>
          <textarea
            value={note}
            onChange={e => setNote(e.target.value)}
            placeholder={t("cal.notePlaceholder")}
            rows={2}
            className="th-input w-full rounded-lg px-3 py-2 text-sm mt-2.5 resize-none block"
          />
          <button
            onClick={saveMood}
            disabled={score === 0}
            className="th-btn w-full rounded-lg py-2 text-sm font-medium mt-2 cursor-pointer"
          >
            {mood ? t("cal.updateMood") : t("cal.saveMood")}
          </button>
        </section>

        {/* Events */}
        <section>
          <p className="text-xs font-semibold uppercase tracking-wide mb-2.5" style={{ color: "var(--c-text2)" }}>
            {t("cal.events")}
          </p>
          {events.length > 0 && (
            <div className="flex flex-col gap-1.5 mb-3">
              {events.map(ev => (
                <div key={ev.id} className="flex items-center gap-2 rounded-lg px-3 py-2" style={{ backgroundColor: "var(--c-item)" }}>
                  {ev.time && (
                    <span className="text-xs font-mono shrink-0" style={{ color: "var(--c-accent)" }}>{ev.time}</span>
                  )}
                  <span className="flex-1 text-sm" style={{ color: "var(--c-text1)" }}>{ev.title}</span>
                  <button onClick={() => onDeleteEvent(ev.id)} className="trash-btn cursor-pointer shrink-0"><TrashIcon /></button>
                </div>
              ))}
            </div>
          )}
          <div className="flex gap-2">
            <input
              type="text"
              value={evTitle}
              onChange={e => setEvTitle(e.target.value)}
              onKeyDown={e => e.key === "Enter" && addEvent()}
              placeholder={t("cal.eventPlaceholder")}
              className="th-input flex-1 rounded-lg px-3 py-2 text-sm"
            />
            <input
              type="time"
              value={evTime}
              onChange={e => setEvTime(e.target.value)}
              className="th-input rounded-lg px-2 py-2 text-sm w-[5.5rem]"
            />
            <button
              onClick={addEvent}
              disabled={!evTitle.trim()}
              className="th-btn rounded-lg px-3 py-2 cursor-pointer"
            >
              <PlusIcon />
            </button>
          </div>
        </section>
      </div>
    </div>
  );
}

/* ── MonthCalendar ─────────────────────────────────────────────────────────── */

interface MonthCalProps {
  habits:    Habit[];
  moods:     Record<DS, MoodEntry>;
  events:    Record<DS, EventEntry[]>;
  weekStart: 0 | 1;
  locale:    string;
  onSaveMood:    (date: DS, entry: MoodEntry) => void;
  onAddEvent:    (date: DS, ev: Omit<EventEntry, "id">) => void;
  onDeleteEvent: (date: DS, id: string) => void;
}

function MonthCalendar({ habits, moods, events, weekStart, locale, onSaveMood, onAddEvent, onDeleteEvent }: MonthCalProps) {
  const { t } = useLanguage();
  const now   = new Date();
  const TODAY = localDS(now);
  const todayMidnight = new Date(now); todayMidnight.setHours(0,0,0,0);

  const [year,     setYear]     = useState(now.getFullYear());
  const [month,    setMonth]    = useState(now.getMonth());
  const [selected, setSelected] = useState<Date | null>(null);

  const grid   = useMemo(() => buildMonthGrid(year, month, weekStart), [year, month, weekStart]);
  const selStr = selected ? localDS(selected) : null;
  const dayHeaders = useMemo(() => getDayHeaders(locale, weekStart), [locale, weekStart]);

  const monthLabel = new Intl.DateTimeFormat(locale, { month: "long" }).format(new Date(year, month, 1));

  function prevMonth() {
    if (month === 0) { setMonth(11); setYear(y => y - 1); }
    else setMonth(m => m - 1);
  }
  function nextMonth() {
    if (month === 11) { setMonth(0); setYear(y => y + 1); }
    else setMonth(m => m + 1);
  }
  function goToday() {
    setYear(now.getFullYear());
    setMonth(now.getMonth());
  }

  return (
    <>
      <div className="card p-5 sm:p-6">
        {/* Card header */}
        <div className="flex items-center gap-2.5 mb-5">
          <span style={{ color: "var(--c-accent)" }}><CalendarIcon /></span>
          <h2 className="text-xs font-semibold tracking-wide uppercase flex-1" style={{ color: "var(--c-text2)" }}>
            {t("cal.title")}
          </h2>
          <div className="flex items-center gap-1.5">
            <button onClick={prevMonth} className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer" style={{ color: "var(--c-text2)", backgroundColor: "var(--c-item)" }}>
              <ChevLeft />
            </button>
            <button onClick={goToday} className="text-xs px-2.5 py-1 rounded-full font-medium cursor-pointer transition-colors" style={{ color: "var(--c-accent)", backgroundColor: "var(--c-item)" }}>
              {t("cal.today")}
            </button>
            <span className="text-sm font-semibold min-w-[9rem] text-center" style={{ color: "var(--c-text1)" }}>
              {monthLabel} {year}
            </span>
            <button onClick={nextMonth} className="w-7 h-7 rounded-full flex items-center justify-center cursor-pointer" style={{ color: "var(--c-text2)", backgroundColor: "var(--c-item)" }}>
              <ChevRight />
            </button>
          </div>
        </div>

        {/* Day-of-week headers */}
        <div className="grid grid-cols-7 mb-1">
          {dayHeaders.map(d => (
            <div key={d} className="text-center text-xs pb-2 font-medium" style={{ color: "var(--c-text3)" }}>{d}</div>
          ))}
        </div>

        {/* Day cells */}
        <div className="grid grid-cols-7 gap-1">
          {grid.map((date, i) => {
            if (!date) return <div key={`pad-${i}`} />;

            const dStr     = localDS(date);
            const isToday  = dStr === TODAY;
            const isSel    = dStr === selStr;
            const isFuture = date > todayMidnight;
            const mood     = moods[dStr];
            const evs      = events[dStr] ?? [];
            const doneHabs = habits.filter(h => h.completedDates.includes(dStr));

            return (
              <button
                key={dStr}
                onClick={() => {
                  if (!isFuture) {
                    setSelected(isSel ? null : date);
                    if (!isSel) window.dispatchEvent(new CustomEvent("journal-date-open", { detail: dStr }));
                  }
                }}
                className="flex flex-col items-center rounded-xl py-1.5 px-0.5 transition-colors"
                style={{
                  minHeight: 58,
                  opacity:   isFuture ? 0.35 : 1,
                  cursor:    isFuture ? "not-allowed" : "pointer",
                  backgroundColor: isSel && !isToday ? "var(--c-done-bg)" : "transparent",
                  outline: isSel ? `2px solid var(--c-accent)` : "none",
                  outlineOffset: "-2px",
                }}
                onMouseEnter={e => {
                  if (isFuture) return;
                  if (!isSel && !isToday) e.currentTarget.style.backgroundColor = "var(--c-item)";
                }}
                onMouseLeave={e => {
                  if (isFuture) return;
                  if (!isSel) e.currentTarget.style.backgroundColor = "transparent";
                  else if (!isToday) e.currentTarget.style.backgroundColor = "var(--c-done-bg)";
                }}
              >
                <span
                  className="w-6 h-6 flex items-center justify-center rounded-full text-xs font-semibold leading-none"
                  style={{
                    backgroundColor: isToday ? "var(--c-accent)" : "transparent",
                    color: isToday ? "var(--c-accent-fg)" : isSel ? "var(--c-accent)" : "var(--c-text1)",
                  }}
                >
                  {date.getDate()}
                </span>

                <div className="flex flex-wrap justify-center gap-[2px] mt-1 max-w-[28px]">
                  {doneHabs.slice(0, 4).map(h => {
                    const ci = habits.findIndex(hab => hab.id === h.id) % HABIT_DOTS.length;
                    return (
                      <span key={h.id} style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: HABIT_DOTS[ci], flexShrink: 0, display: "block" }} />
                    );
                  })}
                  {mood && (
                    <span style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: MOOD_COLOR[mood.score], flexShrink: 0, display: "block" }} />
                  )}
                  {evs.length > 0 && (
                    <span style={{ width: 4, height: 4, borderRadius: "50%", backgroundColor: "var(--c-accent)", opacity: 0.6, flexShrink: 0, display: "block" }} />
                  )}
                </div>
              </button>
            );
          })}
        </div>

        {/* Legend */}
        {(habits.length > 0 || Object.keys(moods).length > 0) && (
          <div className="flex flex-wrap items-center gap-x-4 gap-y-2 mt-4 pt-4" style={{ borderTop: "1px solid var(--c-divider)" }}>
            {habits.slice(0, 6).map((h, i) => (
              <div key={h.id} className="flex items-center gap-1.5">
                <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: HABIT_DOTS[i % HABIT_DOTS.length], display: "inline-block", flexShrink: 0 }} />
                <span className="text-xs" style={{ color: "var(--c-text3)" }}>{h.name}</span>
              </div>
            ))}
            <div className="flex items-center gap-1.5">
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "#EAB308", display: "inline-block", flexShrink: 0 }} />
              <span className="text-xs" style={{ color: "var(--c-text3)" }}>{t("cal.moodLegend")}</span>
            </div>
            <div className="flex items-center gap-1.5">
              <span style={{ width: 8, height: 8, borderRadius: "50%", backgroundColor: "var(--c-accent)", opacity: 0.6, display: "inline-block", flexShrink: 0 }} />
              <span className="text-xs" style={{ color: "var(--c-text3)" }}>{t("cal.eventLegend")}</span>
            </div>
            <span className="text-xs ml-auto" style={{ color: "var(--c-text3)" }}>{t("cal.clickToLog")}</span>
          </div>
        )}
      </div>

      {selected && (
        <DayPopover
          date={selected}
          locale={locale}
          habits={habits}
          mood={moods[selStr!] ?? null}
          events={events[selStr!] ?? []}
          onClose={() => setSelected(null)}
          onSaveMood={entry => onSaveMood(selStr!, entry)}
          onAddEvent={ev => onAddEvent(selStr!, ev)}
          onDeleteEvent={id => onDeleteEvent(selStr!, id)}
        />
      )}
    </>
  );
}

/* ── HabitHeatmap ──────────────────────────────────────────────────────────── */

const HEAT_LEVELS = [
  { label: "0",   color: "var(--c-skel)" },
  { label: "1–2", color: "color-mix(in srgb, var(--c-accent) 28%, var(--c-skel))" },
  { label: "3–4", color: "color-mix(in srgb, var(--c-accent) 54%, var(--c-skel))" },
  { label: "5–6", color: "color-mix(in srgb, var(--c-accent) 75%, var(--c-skel))" },
  { label: "7+",  color: "var(--c-accent)" },
];

function heatColor(count: number): string {
  if (count === 0) return HEAT_LEVELS[0].color;
  if (count <= 2)  return HEAT_LEVELS[1].color;
  if (count <= 4)  return HEAT_LEVELS[2].color;
  if (count <= 6)  return HEAT_LEVELS[3].color;
  return HEAT_LEVELS[4].color;
}

function HabitHeatmap({ habits, weekStart, locale }: { habits: Habit[]; weekStart: 0 | 1; locale: string }) {
  const { t }        = useLanguage();
  const { user }     = useAuth();
  const accountCreatedAt = user?.created_at ? new Date(user.created_at) : null;
  const TODAY_STR    = localDS(new Date());
  const currentYear  = new Date().getFullYear();
  const accountYear  = accountCreatedAt ? accountCreatedAt.getFullYear() : currentYear;
  const [range, setRange]     = useState<HeatRange>("3m");
  const [heatYear, setHeatYear] = useState(currentYear);

  const weeks = useMemo(
    () => buildHeatmapWeeks(range, habits, weekStart, accountCreatedAt, heatYear),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [range, habits, weekStart, user?.created_at, heatYear],
  );
  const dayLabels = useMemo(() => getDayNarrow(locale, weekStart), [locale, weekStart]);

  const monthLabels = useMemo(() => {
    const labels: { weekIdx: number; label: string }[] = [];
    weeks.forEach((week, wi) => {
      const prev = wi > 0 ? weeks[wi - 1][0] : null;
      if (!prev || prev.getMonth() !== week[0].getMonth()) {
        // In year view, skip labels for months outside the target year (alignment padding)
        if (range === "year" && week[0].getFullYear() !== heatYear) return;
        labels.push({
          weekIdx: wi,
          label: new Intl.DateTimeFormat(locale, { month: "short" }).format(week[0]).replace(/\.$/, ""),
        });
      }
    });
    return labels;
  }, [weeks, locale, range, heatYear]);

  function completedCount(d: Date): number {
    const s = localDS(d);
    return habits.filter(h => h.completedDates.includes(s)).length;
  }

  const CELL = 14;
  const GAP  = 3;

  const rangeOptions: { key: HeatRange; label: string }[] = [
    { key: "3m",   label: t("cal.range3m")   },
    { key: "year", label: String(heatYear)   },
    { key: "all",  label: t("cal.rangeAll")  },
  ];

  return (
    <div className="card p-5 sm:p-6">
      {/* Header with time range toggle */}
      <div className="flex items-center gap-2.5 mb-5">
        <span style={{ color: "var(--c-accent)" }}><ActivityIcon /></span>
        <h2 className="text-xs font-semibold tracking-wide uppercase flex-1" style={{ color: "var(--c-text2)" }}>
          {t("cal.activityTitle")}
        </h2>
        <div className="flex gap-1 p-1 rounded-xl" style={{ backgroundColor: "var(--c-item)" }}>
          {rangeOptions.map(r => (
            r.key === "year" ? (
              <div key="year" style={{ display: "flex", alignItems: "center" }}>
                {range === "year" && (
                  <button
                    onClick={() => setHeatYear(y => y - 1)}
                    disabled={heatYear <= accountYear}
                    className="px-1 py-1 rounded-lg text-xs transition-all cursor-pointer disabled:opacity-30"
                    style={{ backgroundColor: "transparent", color: "var(--c-text3)" }}
                  >‹</button>
                )}
                <button
                  onClick={() => setRange("year")}
                  className="px-2 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer"
                  style={{
                    backgroundColor: range === "year" ? "var(--c-card)" : "transparent",
                    color:           range === "year" ? "var(--c-text1)" : "var(--c-text3)",
                    boxShadow:       range === "year" ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                  }}
                >{heatYear}</button>
                {range === "year" && (
                  <button
                    onClick={() => setHeatYear(y => y + 1)}
                    disabled={heatYear >= currentYear}
                    className="px-1 py-1 rounded-lg text-xs transition-all cursor-pointer disabled:opacity-30"
                    style={{ backgroundColor: "transparent", color: "var(--c-text3)" }}
                  >›</button>
                )}
              </div>
            ) : (
              <button
                key={r.key}
                onClick={() => setRange(r.key)}
                className="px-3 py-1 rounded-lg text-xs font-medium transition-all cursor-pointer"
                style={{
                  backgroundColor: range === r.key ? "var(--c-card)" : "transparent",
                  color:           range === r.key ? "var(--c-text1)" : "var(--c-text3)",
                  boxShadow:       range === r.key ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
                }}
              >
                {r.label}
              </button>
            )
          ))}
        </div>
      </div>

      {habits.length === 0 ? (
        <p className="text-sm" style={{ color: "var(--c-text3)" }}>{t("cal.addHabitsHint")}</p>
      ) : (
        <div className="overflow-x-auto pb-1">
          {/* Month label row */}
          <div style={{ display: "flex", gap: GAP, paddingLeft: 26, marginBottom: 4 }}>
            {weeks.map((_, wi) => {
              const lbl = monthLabels.find(m => m.weekIdx === wi);
              return (
                <div key={wi} style={{ width: CELL, flexShrink: 0, fontSize: 10, color: "var(--c-text3)", whiteSpace: "nowrap" }}>
                  {lbl?.label ?? ""}
                </div>
              );
            })}
          </div>

          {/* Grid */}
          <div style={{ display: "flex", gap: GAP }}>
            {/* Day-of-week labels (alternating rows) */}
            <div style={{ display: "flex", flexDirection: "column", gap: GAP, marginRight: 4, flexShrink: 0 }}>
              {dayLabels.map((d, i) => (
                <div key={i} style={{ height: CELL, lineHeight: `${CELL}px`, fontSize: 10, color: "var(--c-text3)", width: 18 }}>
                  {i % 2 === 1 ? d : ""}
                </div>
              ))}
            </div>

            {/* Week columns */}
            {weeks.map((week, wi) => (
              <div key={wi} style={{ display: "flex", flexDirection: "column", gap: GAP, flexShrink: 0 }}>
                {week.map((day) => {
                  const dStr     = localDS(day);
                  const isFuture = dStr > TODAY_STR;
                  const count    = completedCount(day);
                  const total    = habits.length;
                  return (
                    <div
                      key={dStr}
                      title={isFuture ? "" : `${dStr}: ${count}/${total} completed`}
                      style={{
                        width: CELL, height: CELL, borderRadius: 3, flexShrink: 0,
                        backgroundColor: isFuture ? "transparent" : heatColor(count),
                        opacity: isFuture ? 0 : 1,
                      }}
                    />
                  );
                })}
              </div>
            ))}
          </div>

          {/* Legend — 5 colored squares with labels */}
          <div className="mt-4">
            <div className="flex items-end gap-3 justify-end">
              {HEAT_LEVELS.map(level => (
                <div key={level.label} className="flex flex-col items-center gap-1">
                  <div style={{ width: 12, height: 12, borderRadius: 2, backgroundColor: level.color, flexShrink: 0 }} />
                  <span style={{ fontSize: 10, color: "var(--c-text3)", whiteSpace: "nowrap" }}>{level.label}</span>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

/* ── CalendarSection ───────────────────────────────────────────────────────── */

export default function CalendarSection() {
  const { user } = useAuth();
  const [habits,    setHabits]    = useState<Habit[]>([]);
  const [moods,     setMoods]     = useState<Record<DS, MoodEntry>>({});
  const [events,    setEvents]    = useState<Record<DS, EventEntry[]>>({});
  const [weekStart, setWeekStart] = useState<0 | 1>(0);
  const [locale,    setLocale]    = useState("en-US");
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => {
    setMounted(false);
    setHabits(loadJSON(HABITS_KEY, []));
    setWeekStart(loadWeekStart());
    setLocale(loadLocale());

    if (!user) {
      setMoods(loadJSON(MOODS_KEY, {}));
      setEvents(loadJSON(EVENTS_KEY, {}));
      setMounted(true);
      return;
    }

    (async () => {
      const [moodsResult, eventsResult] = await Promise.all([
        supabase.from("mood_logs").select("date, score, note").eq("user_id", user.id),
        supabase.from("events").select("id, date, title, time").eq("user_id", user.id).order("created_at"),
      ]);

      const moodsData: Record<DS, MoodEntry> = {};
      for (const row of moodsResult.data ?? []) {
        moodsData[row.date as DS] = { score: row.score as 1|2|3|4|5, note: row.note ?? "" };
      }

      const eventsData: Record<DS, EventEntry[]> = {};
      for (const row of eventsResult.data ?? []) {
        const d = row.date as DS;
        if (!eventsData[d]) eventsData[d] = [];
        eventsData[d].push({ id: row.id, title: row.title, time: row.time ?? "" });
      }

      setMoods(moodsData);
      setEvents(eventsData);
      // Keep localStorage in sync for any offline/guest fallback
      saveJSON(MOODS_KEY, moodsData);
      saveJSON(EVENTS_KEY, eventsData);
      setMounted(true);
    })();
  }, [user?.id]);

  useEffect(() => {
    const onHabits   = () => setHabits(loadJSON(HABITS_KEY, []));
    const onSettings = () => { setWeekStart(loadWeekStart()); setLocale(loadLocale()); };
    window.addEventListener("habits-updated",   onHabits);
    window.addEventListener("settings-updated", onSettings);
    return () => {
      window.removeEventListener("habits-updated",   onHabits);
      window.removeEventListener("settings-updated", onSettings);
    };
  }, []);

  async function saveMood(date: DS, entry: MoodEntry) {
    const next = { ...moods, [date]: entry };
    setMoods(next);
    saveJSON(MOODS_KEY, next);
    if (user) {
      await supabase.from("mood_logs").upsert(
        { user_id: user.id, date, score: entry.score, note: entry.note },
        { onConflict: "user_id,date" },
      );
    }
  }

  async function addEvent(date: DS, ev: Omit<EventEntry, "id">) {
    if (user) {
      const { data } = await supabase
        .from("events")
        .insert({ user_id: user.id, date, title: ev.title, time: ev.time || null })
        .select("id")
        .single();
      if (data?.id) {
        const list = [...(events[date] ?? []), { ...ev, id: data.id }];
        const next = { ...events, [date]: list };
        setEvents(next);
        saveJSON(EVENTS_KEY, next);
      }
    } else {
      const list = [...(events[date] ?? []), { ...ev, id: crypto.randomUUID() }];
      const next = { ...events, [date]: list };
      setEvents(next);
      saveJSON(EVENTS_KEY, next);
    }
  }

  async function deleteEvent(date: DS, id: string) {
    const list = (events[date] ?? []).filter(e => e.id !== id);
    const next = { ...events, [date]: list };
    setEvents(next);
    saveJSON(EVENTS_KEY, next);
    if (user) {
      await supabase.from("events").delete().eq("id", id);
    }
  }

  if (!mounted) return null;

  return (
    <MonthCalendar
      habits={habits}
      moods={moods}
      events={events}
      weekStart={weekStart}
      locale={locale}
      onSaveMood={saveMood}
      onAddEvent={addEvent}
      onDeleteEvent={deleteEvent}
    />
  );
}

/* ── HabitActivitySection — standalone export ──────────────────────────────── */

export function HabitActivitySection() {
  const [habits,    setHabits]    = useState<Habit[]>([]);
  const [weekStart, setWeekStart] = useState<0 | 1>(0);
  const [locale,    setLocale]    = useState("en-US");
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => {
    setHabits(loadJSON(HABITS_KEY, []));
    setWeekStart(loadWeekStart());
    setLocale(loadLocale());
    setMounted(true);
  }, []);

  useEffect(() => {
    const onHabits   = () => setHabits(loadJSON(HABITS_KEY, []));
    const onSettings = () => { setWeekStart(loadWeekStart()); setLocale(loadLocale()); };
    window.addEventListener("habits-updated",   onHabits);
    window.addEventListener("settings-updated", onSettings);
    return () => {
      window.removeEventListener("habits-updated",   onHabits);
      window.removeEventListener("settings-updated", onSettings);
    };
  }, []);

  if (!mounted) return null;
  return <HabitHeatmap habits={habits} weekStart={weekStart} locale={locale} />;
}
