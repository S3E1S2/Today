"use client";

import { useEffect, useRef, useState } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";
import { useLanguage } from "./LanguageProvider";
import {
  Chart,
  BarController,
  BarElement,
  LineController,
  LineElement,
  PointElement,
  Filler,
  CategoryScale,
  LinearScale,
  Tooltip,
  type ChartConfiguration,
  type TooltipItem,
} from "chart.js";

Chart.register(BarController, BarElement, LineController, LineElement, PointElement, Filler, CategoryScale, LinearScale, Tooltip);

/* ── Types & constants ─────────────────────────────────────────────────────── */

interface SleepEntry {
  date: string;      // "YYYY-MM-DD"
  bedtime: string;   // "HH:MM"
  wakeup: string;    // "HH:MM"
  hours: number;
  quality: number;   // 1-5
  score: number;
}

const ENTRIES_KEY = "today-sleep-v1";
const GOAL_KEY    = "today-sleep-goal-v1";
const DEFAULT_GOAL = 8;

const QUALITY_EMOJI: Record<number, string> = {
  1: "😴", 2: "🥱", 3: "😐", 4: "🙂", 5: "😊",
};

function todayStr() {
  return new Date().toLocaleDateString("en-CA");
}

function calcHours(bedtime: string, wakeup: string): number {
  const [bh, bm] = bedtime.split(":").map(Number);
  const [wh, wm] = wakeup.split(":").map(Number);
  let mins = (wh * 60 + wm) - (bh * 60 + bm);
  if (mins <= 0) mins += 24 * 60; // crossed midnight
  return Math.round((mins / 60) * 10) / 10;
}

function calcScore(hours: number, quality: number, goal: number): number {
  const durationScore = Math.min(hours / goal, 1) * 50;
  const qualityScore  = (quality / 5) * 50;
  return Math.round(durationScore + qualityScore);
}

function scoreLabelKey(score: number): string {
  if (score >= 80) return "sleep.scoreGreat";
  if (score >= 60) return "sleep.scoreGood";
  if (score >= 40) return "sleep.scoreFair";
  return "sleep.scorePoor";
}

function scoreLabelColor(score: number): string {
  if (score >= 80) return "var(--c-check)";
  if (score >= 60) return "var(--c-accent)";
  if (score >= 40) return "var(--c-streak)";
  return "#c45050";
}

function loadEntries(): SleepEntry[] {
  try {
    const raw = localStorage.getItem(ENTRIES_KEY);
    return raw ? JSON.parse(raw) : [];
  } catch { return []; }
}

function saveEntries(entries: SleepEntry[]) {
  localStorage.setItem(ENTRIES_KEY, JSON.stringify(entries));
}

function loadGoal(): number {
  try {
    const raw = localStorage.getItem(GOAL_KEY);
    const n = raw ? parseFloat(raw) : NaN;
    return isNaN(n) ? DEFAULT_GOAL : n;
  } catch { return DEFAULT_GOAL; }
}

/* ── Sub-components ────────────────────────────────────────────────────────── */

function MoonIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>
    </svg>
  );
}

function ChevronDown() {
  return (
    <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
      <polyline points="6 9 12 15 18 9"/>
    </svg>
  );
}

/* ── Weekly chart (bar or line) ────────────────────────────────────────────── */

function WeeklyChart({ entries, goal, t, chartType }: {
  entries: SleepEntry[];
  goal: number;
  t: (key: string, vars?: Record<string, string | number>) => string;
  chartType: "bar" | "line";
}) {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const chartRef  = useRef<Chart | null>(null);

  useEffect(() => {
    if (!canvasRef.current) return;
    const style = getComputedStyle(document.documentElement);

    const accentColor = style.getPropertyValue("--c-accent").trim();
    const skelColor   = style.getPropertyValue("--c-skel").trim();
    const text3Color  = style.getPropertyValue("--c-text3").trim();
    const text1Color  = style.getPropertyValue("--c-text1").trim();
    const borderColor = style.getPropertyValue("--c-border").trim();

    // Build last 7 days
    const days: { label: string; date: string }[] = [];
    for (let i = 6; i >= 0; i--) {
      const d = new Date();
      d.setDate(d.getDate() - i);
      days.push({
        date:  d.toLocaleDateString("en-CA"),
        label: d.toLocaleDateString("en-US", { weekday: "short" }),
      });
    }

    const entryMap = new Map(entries.map(e => [e.date, e]));
    const hours  = days.map(d => entryMap.get(d.date)?.hours ?? 0);
    const colors = hours.map(h => h >= goal ? accentColor : (h === 0 ? skelColor : text3Color));
    const lineHours = hours.map(h => h === 0 ? null : h);

    const sharedTooltip = {
      callbacks: {
        label: (item: TooltipItem<"bar" | "line">) => {
          const h = item.raw as number | null;
          return h && h > 0 ? t("sleep.hSlept", { hours: h }) : "–";
        },
      },
      backgroundColor: "rgba(0,0,0,0.75)",
      titleColor: "#fff",
      bodyColor:  "#ccc",
      padding: 8,
      cornerRadius: 8,
    };

    const sharedScales = {
      x: {
        grid:   { display: false },
        border: { display: false },
        ticks:  { color: text3Color, font: { size: 11 } },
      },
      y: {
        min: 0,
        max: Math.max(12, goal + 2),
        grid:   { color: borderColor },
        border: { display: false, dash: [4, 4] },
        ticks: {
          color: text3Color, font: { size: 11 },
          stepSize: 2, callback: (v: number | string) => `${v}h`,
        },
      },
    };

    const goalLinePlugin = {
      id: "goalLine",
      afterDraw(chart: Chart) {
        const { ctx, chartArea: { left, right }, scales: { y } } = chart;
        const yPos = y.getPixelForValue(goal);
        ctx.save();
        ctx.beginPath();
        ctx.setLineDash([5, 5]);
        ctx.moveTo(left, yPos);
        ctx.lineTo(right, yPos);
        ctx.strokeStyle = text1Color;
        ctx.globalAlpha = 0.35;
        ctx.lineWidth = 1.5;
        ctx.stroke();
        ctx.restore();
      },
    };

    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    let config: any;

    if (chartType === "line") {
      config = {
        type: "line",
        data: {
          labels: days.map(d => d.label),
          datasets: [{
            data: lineHours,
            borderColor: accentColor,
            backgroundColor: `${accentColor}28`,
            tension: 0.4,
            pointBackgroundColor: hours.map(h => h >= goal ? accentColor : text3Color),
            pointBorderColor: "transparent",
            pointRadius: hours.map(h => h === 0 ? 0 : 5),
            pointHoverRadius: 7,
            fill: true,
            spanGaps: false,
          }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: { duration: 300 },
          plugins: { legend: { display: false }, tooltip: sharedTooltip },
          scales: sharedScales,
        },
        plugins: [goalLinePlugin],
      };
    } else {
      config = {
        type: "bar",
        data: {
          labels: days.map(d => d.label),
          datasets: [{ data: hours, backgroundColor: colors, borderRadius: 6, borderSkipped: false, maxBarThickness: 32 }],
        },
        options: {
          responsive: true, maintainAspectRatio: false,
          animation: { duration: 300 },
          plugins: { legend: { display: false }, tooltip: sharedTooltip },
          scales: sharedScales,
        },
        plugins: [goalLinePlugin],
      };
    }

    if (chartRef.current) {
      chartRef.current.destroy();
    }
    chartRef.current = new Chart(canvasRef.current, config);

    return () => {
      chartRef.current?.destroy();
      chartRef.current = null;
    };
  }, [entries, goal, t, chartType]);

  return (
    <div style={{ position: "relative", height: 140 }}>
      <canvas ref={canvasRef} />
    </div>
  );
}

/* ── Main component ────────────────────────────────────────────────────────── */

export default function SleepTracker() {
  const { t }    = useLanguage();
  const { user } = useAuth();
  const [entries, setEntries] = useState<SleepEntry[]>([]);
  const [goal,    setGoalState] = useState(DEFAULT_GOAL);
  const [mounted, setMounted]   = useState(false);

  // Form state
  const [bedtime,  setBedtime]  = useState("23:00");
  const [wakeup,   setWakeup]   = useState("07:00");
  const [quality,  setQuality]  = useState(4);
  const [saved,    setSaved]    = useState(false);

  // UI state
  const [showGoal, setShowGoal] = useState(false);
  const [goalDraft, setGoalDraft] = useState("8");
  const [chartType, setChartType] = useState<"bar" | "line">("bar");

  useEffect(() => {
    const g = loadGoal();
    setGoalState(g);
    setGoalDraft(String(g));

    if (!user) {
      const stored = loadEntries();
      setEntries(stored);
      const todayEntry = stored.find(e => e.date === todayStr());
      if (todayEntry) {
        setBedtime(todayEntry.bedtime);
        setWakeup(todayEntry.wakeup);
        setQuality(todayEntry.quality);
        setSaved(true);
      }
      setMounted(true);
      return;
    }

    // Logged in: load from Supabase
    (async () => {
      const { data } = await supabase
        .from("sleep_entries")
        .select("date, bedtime, wakeup, hours, quality, score")
        .eq("user_id", user.id)
        .order("date", { ascending: false })
        .limit(90);

      const stored: SleepEntry[] = (data ?? []).map(e => ({
        date: e.date as string,
        bedtime: e.bedtime as string,
        wakeup: e.wakeup as string,
        hours: e.hours as number,
        quality: e.quality as number,
        score: e.score as number,
      }));
      setEntries(stored);

      const todayEntry = stored.find(e => e.date === todayStr());
      if (todayEntry) {
        setBedtime(todayEntry.bedtime);
        setWakeup(todayEntry.wakeup);
        setQuality(todayEntry.quality);
        setSaved(true);
      }
      setMounted(true);
    })();
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id]);

  const previewHours = calcHours(bedtime, wakeup);
  const previewScore = calcScore(previewHours, quality, goal);

  function handleLog() {
    const hours = calcHours(bedtime, wakeup);
    const score = calcScore(hours, quality, goal);
    const entry: SleepEntry = { date: todayStr(), bedtime, wakeup, hours, quality, score };
    const updated = [
      entry,
      ...entries.filter(e => e.date !== todayStr()),
    ].sort((a, b) => b.date.localeCompare(a.date)).slice(0, 90);
    setEntries(updated);
    setSaved(true);

    if (user) {
      supabase.from("sleep_entries")
        .upsert({ user_id: user.id, ...entry }, { onConflict: "user_id,date" });
    } else {
      saveEntries(updated);
    }
  }

  function handleSaveGoal() {
    const n = parseFloat(goalDraft);
    if (isNaN(n) || n < 1 || n > 24) return;
    const rounded = Math.round(n * 2) / 2; // snap to 0.5hr
    setGoalState(rounded);
    setGoalDraft(String(rounded));
    localStorage.setItem(GOAL_KEY, String(rounded));
    setShowGoal(false);
  }

  const todayEntry = entries.find(e => e.date === todayStr());

  return (
    <div className="card p-6 flex flex-col gap-5">

      {/* ── Header ── */}
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2.5">
          <span style={{ color: "var(--c-accent)" }}><MoonIcon /></span>
          <h2 className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--c-text2)" }}>
            {t("sleep.title")}
          </h2>
        </div>
        <button
          onClick={() => setShowGoal(v => !v)}
          className="flex items-center gap-1 text-xs cursor-pointer transition-colors"
          style={{ color: "var(--c-text3)" }}
          onMouseEnter={e => (e.currentTarget.style.color = "var(--c-accent)")}
          onMouseLeave={e => (e.currentTarget.style.color = "var(--c-text3)")}
        >
          {t("sleep.goalBtn", { goal })} <ChevronDown />
        </button>
      </div>

      {/* ── Goal editor ── */}
      {showGoal && (
        <div
          className="flex items-center gap-3 rounded-xl px-4 py-3"
          style={{ backgroundColor: "var(--c-item)", border: "1px solid var(--c-border)" }}
        >
          <span className="text-sm flex-1" style={{ color: "var(--c-text2)" }}>
            {t("sleep.goalLabel")}
          </span>
          <input
            type="number"
            min="1"
            max="24"
            step="0.5"
            value={goalDraft}
            onChange={e => setGoalDraft(e.target.value)}
            className="th-input w-20 text-sm rounded-lg px-2 py-1.5 text-center"
          />
          <button
            onClick={handleSaveGoal}
            className="th-btn text-sm font-medium px-3 py-1.5 rounded-lg cursor-pointer"
          >
            {t("sleep.save")}
          </button>
        </div>
      )}

      {/* ── Score card (today's entry) ── */}
      {mounted && todayEntry && (
        <div
          className="flex items-center gap-4 rounded-xl px-5 py-4"
          style={{ backgroundColor: "var(--c-done-bg)", border: "1px solid var(--c-border)" }}
        >
          <div className="flex flex-col items-center shrink-0" style={{ minWidth: 56 }}>
            <span
              className="text-3xl font-bold leading-none tabular-nums"
              style={{ color: scoreLabelColor(todayEntry.score) }}
            >
              {todayEntry.score}
            </span>
            <span className="text-[10px] font-semibold uppercase mt-1" style={{ color: "var(--c-text3)" }}>
              {t("sleep.perHundred")}
            </span>
          </div>
          <div
            className="w-px self-stretch"
            style={{ backgroundColor: "var(--c-border)" }}
          />
          <div className="flex flex-col gap-0.5 flex-1 min-w-0">
            <span className="text-base font-semibold" style={{ color: scoreLabelColor(todayEntry.score) }}>
              {t(scoreLabelKey(todayEntry.score))}
            </span>
            <span className="text-xs" style={{ color: "var(--c-text3)" }}>
              {t("sleep.hSlept", { hours: todayEntry.hours })} · {QUALITY_EMOJI[todayEntry.quality]} {t("sleep.qualityRating", { rating: todayEntry.quality })}
            </span>
            <span className="text-xs" style={{ color: "var(--c-text3)" }}>
              {todayEntry.bedtime} → {todayEntry.wakeup}
            </span>
          </div>
        </div>
      )}

      {/* ── Log form ── */}
      <div className="flex flex-col gap-3">
        <p className="text-xs font-medium" style={{ color: "var(--c-text3)" }}>
          {saved ? t("sleep.updateToday") : t("sleep.logTonight")}
        </p>

        <div className="grid grid-cols-2 gap-3">
          <label className="flex flex-col gap-1.5">
            <span className="text-xs" style={{ color: "var(--c-text3)" }}>{t("sleep.bedtime")}</span>
            <input
              type="time"
              value={bedtime}
              onChange={e => { setBedtime(e.target.value); setSaved(false); }}
              className="th-input text-sm rounded-lg px-3 py-2.5"
            />
          </label>
          <label className="flex flex-col gap-1.5">
            <span className="text-xs" style={{ color: "var(--c-text3)" }}>{t("sleep.wakeup")}</span>
            <input
              type="time"
              value={wakeup}
              onChange={e => { setWakeup(e.target.value); setSaved(false); }}
              className="th-input text-sm rounded-lg px-3 py-2.5"
            />
          </label>
        </div>

        {/* Duration preview */}
        <p className="text-xs text-center tabular-nums" style={{ color: "var(--c-text3)" }}>
          {t("sleep.preview", { hours: previewHours, score: previewScore, label: t(scoreLabelKey(previewScore)) })}
        </p>

        {/* Quality rating */}
        <div className="flex flex-col gap-1.5">
          <span className="text-xs" style={{ color: "var(--c-text3)" }}>{t("sleep.quality")}</span>
          <div className="flex gap-2">
            {[1, 2, 3, 4, 5].map(q => (
              <button
                key={q}
                onClick={() => { setQuality(q); setSaved(false); }}
                className="flex-1 py-2 rounded-xl text-xl transition-all cursor-pointer"
                style={{
                  backgroundColor: quality === q ? "var(--c-done-bg)" : "var(--c-item)",
                  border: `2px solid ${quality === q ? "var(--c-accent)" : "transparent"}`,
                }}
                title={`Quality ${q}/5`}
              >
                {QUALITY_EMOJI[q]}
              </button>
            ))}
          </div>
        </div>

        <button
          onClick={handleLog}
          className="th-btn text-sm font-medium px-4 py-2.5 rounded-lg cursor-pointer"
        >
          {saved ? t("sleep.updateLog") : t("sleep.logSleep")}
        </button>
      </div>

      {/* ── Weekly chart ── */}
      {mounted && (
        <div className="flex flex-col gap-2">
          <div className="flex items-center justify-between">
            <span className="text-xs font-medium" style={{ color: "var(--c-text3)" }}>
              {t("sleep.last7days")}
            </span>
            <div className="flex items-center gap-2">
              <span className="text-xs" style={{ color: "var(--c-text3)" }}>
                {t("sleep.chartGoal", { goal })}
              </span>
              <div className="flex rounded-lg overflow-hidden" style={{ border: "1px solid var(--c-border)" }}>
                <button
                  onClick={() => setChartType("bar")}
                  title="Bar chart"
                  style={{
                    padding: "0.2rem 0.45rem", cursor: "pointer", border: "none",
                    backgroundColor: chartType === "bar" ? "var(--c-accent)" : "transparent",
                    color: chartType === "bar" ? "#fff" : "var(--c-text3)",
                    display: "flex", alignItems: "center",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="currentColor">
                    <rect x="2" y="10" width="5" height="12"/><rect x="9.5" y="6" width="5" height="16"/><rect x="17" y="2" width="5" height="20"/>
                  </svg>
                </button>
                <button
                  onClick={() => setChartType("line")}
                  title="Line chart"
                  style={{
                    padding: "0.2rem 0.45rem", cursor: "pointer", border: "none",
                    backgroundColor: chartType === "line" ? "var(--c-accent)" : "transparent",
                    color: chartType === "line" ? "#fff" : "var(--c-text3)",
                    display: "flex", alignItems: "center",
                  }}
                >
                  <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round">
                    <polyline points="3 17 8 10 13 13 21 5"/>
                  </svg>
                </button>
              </div>
            </div>
          </div>
          <WeeklyChart entries={entries} goal={goal} t={t} chartType={chartType} />
        </div>
      )}
    </div>
  );
}
