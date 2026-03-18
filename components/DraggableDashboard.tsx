"use client";

import { createContext, useContext, useEffect, useState } from "react";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";

export type SectionId =
  | "news" | "history-fact" | "habits-sleep" | "journal" | "heatmap" | "calendar";

export const DEFAULT_ORDER: SectionId[] = [
  "news", "history-fact", "habits-sleep", "journal", "heatmap", "calendar",
];

const LS_VISIBILITY = "today-sections-visible";

const defaultVisibility = Object.fromEntries(
  DEFAULT_ORDER.map(id => [id, true])
) as Record<SectionId, boolean>;

interface DashboardCtx {
  visibility:    Record<SectionId, boolean>;
  setVisibility: (id: SectionId, v: boolean) => void;
}

const DashCtx = createContext<DashboardCtx>({
  visibility: defaultVisibility,
  setVisibility: () => {},
});

export function useDashboard() { return useContext(DashCtx); }

export function DashboardProvider({ children }: { children: React.ReactNode }) {
  const { user } = useAuth();
  const [visibility, setVisibilityState] = useState<Record<SectionId, boolean>>(defaultVisibility);

  function loadVisibility() {
    try {
      const savedVis = localStorage.getItem(LS_VISIBILITY);
      if (savedVis) setVisibilityState(prev => ({ ...prev, ...JSON.parse(savedVis) }));
    } catch {}
  }

  useEffect(() => {
    loadVisibility();
    window.addEventListener("settings-updated", loadVisibility);
    return () => window.removeEventListener("settings-updated", loadVisibility);
  // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  function setVisibility(id: SectionId, v: boolean) {
    const next = { ...visibility, [id]: v };
    setVisibilityState(next);
    try { localStorage.setItem(LS_VISIBILITY, JSON.stringify(next)); } catch {}
    if (user) {
      supabase.from("profiles").upsert({ id: user.id, section_visibility: JSON.stringify(next) }).then(() => {});
    }
  }

  return (
    <DashCtx.Provider value={{ visibility, setVisibility }}>
      {children}
    </DashCtx.Provider>
  );
}

// Simple wrapper — no drag, just visibility filtering
export default function DraggableDashboard({ children }: { children: React.ReactNode }) {
  const { visibility } = useDashboard();

  type Child = React.ReactElement<Record<string, unknown>>;
  const childArray: Child[] = (Array.isArray(children) ? children : [children]) as Child[];

  return (
    <div className="flex flex-col gap-5">
      {DEFAULT_ORDER.map(id => {
        if (!visibility[id]) return null;
        const child = childArray.find(c => c.props["data-section"] === id);
        if (!child) return null;
        return <div key={id}>{child}</div>;
      })}
    </div>
  );
}
