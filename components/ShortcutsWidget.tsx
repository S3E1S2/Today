"use client";

import { useEffect, useState } from "react";
import { useLanguage } from "./LanguageProvider";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";

const LS_KEY = "today-shortcuts";

interface Shortcut {
  id: string;
  label: string;
  url: string;
}

function LinkIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M10 13a5 5 0 0 0 7.54.54l3-3a5 5 0 0 0-7.07-7.07l-1.72 1.71" />
      <path d="M14 11a5 5 0 0 0-7.54-.54l-3 3a5 5 0 0 0 7.07 7.07l1.71-1.71" />
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

function normalizeUrl(url: string): string {
  if (!url.startsWith("http://") && !url.startsWith("https://")) return "https://" + url;
  return url;
}

function getFavicon(url: string): string {
  try {
    const host = new URL(normalizeUrl(url)).hostname;
    return `https://www.google.com/s2/favicons?domain=${host}&sz=32`;
  } catch { return ""; }
}

export default function ShortcutsWidget() {
  const { t }    = useLanguage();
  const { user } = useAuth();

  const [shortcuts, setShortcuts] = useState<Shortcut[]>([]);
  const [label,     setLabel]     = useState("");
  const [url,       setUrl]       = useState("");
  const [mounted,   setMounted]   = useState(false);

  useEffect(() => { setMounted(true); load(); }, [user?.id]);

  async function load() {
    if (user) {
      const { data } = await supabase
        .from("shortcuts")
        .select("id, label, url")
        .eq("user_id", user.id)
        .order("created_at");
      if (data) setShortcuts(data as Shortcut[]);
    } else {
      try {
        const raw = localStorage.getItem(LS_KEY);
        if (raw) setShortcuts(JSON.parse(raw));
      } catch {}
    }
  }

  function syncLS(next: Shortcut[]) {
    try { localStorage.setItem(LS_KEY, JSON.stringify(next)); } catch {}
  }

  async function addShortcut() {
    if (!label.trim() || !url.trim()) return;
    const s: Shortcut = { id: crypto.randomUUID(), label: label.trim(), url: normalizeUrl(url.trim()) };
    if (user) {
      const { data } = await supabase
        .from("shortcuts")
        .insert({ user_id: user.id, label: s.label, url: s.url })
        .select("id")
        .single();
      if (data?.id) s.id = data.id;
    }
    const next = [...shortcuts, s];
    setShortcuts(next);
    if (!user) syncLS(next);
    setLabel(""); setUrl("");
  }

  async function deleteShortcut(id: string) {
    if (user) await supabase.from("shortcuts").delete().eq("id", id);
    const next = shortcuts.filter(s => s.id !== id);
    setShortcuts(next);
    if (!user) syncLS(next);
  }

  return (
    <div className="card p-6 flex flex-col gap-4">
      {/* Header */}
      <div className="flex items-center gap-2.5">
        <span style={{ color: "var(--c-accent)" }}><LinkIcon /></span>
        <h2 className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--c-text2)" }}>
          {t("shortcuts.title")}
        </h2>
      </div>

      {/* Shortcut chips */}
      {mounted && shortcuts.length === 0 && (
        <p className="text-sm" style={{ color: "var(--c-text3)" }}>{t("shortcuts.empty")}</p>
      )}
      {mounted && shortcuts.length > 0 && (
        <div className="flex flex-wrap gap-2">
          {shortcuts.map(s => (
            <div
              key={s.id}
              className="flex items-center gap-2 rounded-xl px-3 py-2"
              style={{ backgroundColor: "var(--c-item)", border: "1px solid var(--c-border)" }}
            >
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={getFavicon(s.url)}
                alt=""
                width={16}
                height={16}
                className="rounded-sm flex-shrink-0"
                onError={e => (e.currentTarget.style.display = "none")}
              />
              <a
                href={normalizeUrl(s.url)}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm font-medium transition-colors"
                style={{ color: "var(--c-text1)" }}
                onMouseEnter={e => (e.currentTarget.style.color = "var(--c-accent)")}
                onMouseLeave={e => (e.currentTarget.style.color = "var(--c-text1)")}
              >
                {s.label}
              </a>
              <button
                onClick={() => deleteShortcut(s.id)}
                className="trash-btn cursor-pointer shrink-0"
                aria-label={t("shortcuts.delete")}
              >
                <TrashIcon />
              </button>
            </div>
          ))}
        </div>
      )}

      {/* Add form */}
      <form onSubmit={e => { e.preventDefault(); addShortcut(); }} className="flex gap-2 flex-wrap">
        <input
          type="text"
          value={label}
          onChange={e => setLabel(e.target.value)}
          placeholder={t("shortcuts.labelPlaceholder")}
          className="th-input text-sm rounded-lg px-3 py-2"
          style={{ flex: "1 1 80px", minWidth: 80 }}
        />
        <input
          type="text"
          value={url}
          onChange={e => setUrl(e.target.value)}
          placeholder={t("shortcuts.urlPlaceholder")}
          className="th-input text-sm rounded-lg px-3 py-2"
          style={{ flex: "2 1 130px", minWidth: 130 }}
        />
        <button
          type="submit"
          disabled={!label.trim() || !url.trim()}
          className="th-btn text-sm font-semibold px-4 py-2 rounded-lg cursor-pointer disabled:opacity-40"
        >
          {t("shortcuts.add")}
        </button>
      </form>
    </div>
  );
}
