"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import { useAuth } from "./AuthProvider";
import { supabase } from "@/lib/supabase";

const AVATAR_COLORS = [
  "#D4673A", "#5B9BD4", "#72C464", "#C45070",
  "#A855F7", "#F59E0B", "#06B6D4", "#EF4444",
];

const EMOJI_OPTIONS = [
  "☀️","🌙","⭐","🌟","✨","🌈","🌸","🌺","🌻","🍀",
  "🔥","❄️","⚡","💎","🎯","🎉","🏆","🎵","🦋","🌊",
  "❤️","💛","💚","💙","💜","😊","🥰","🤩","👑","🎨",
];

function getInitials(email: string, displayName: string | null): string {
  if (displayName?.trim()) {
    const parts = displayName.trim().split(/\s+/);
    if (parts.length >= 2) return (parts[0][0] + parts[1][0]).toUpperCase();
    return parts[0].slice(0, 2).toUpperCase();
  }
  return (email ?? "??").split("@")[0].slice(0, 2).toUpperCase();
}

async function resizeToBase64(file: File, maxPx = 200): Promise<string> {
  return new Promise((resolve, reject) => {
    const img = new Image();
    const url = URL.createObjectURL(file);
    img.onload = () => {
      const scale = Math.min(maxPx / img.width, maxPx / img.height, 1);
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement("canvas");
      canvas.width = w; canvas.height = h;
      canvas.getContext("2d")!.drawImage(img, 0, 0, w, h);
      URL.revokeObjectURL(url);
      resolve(canvas.toDataURL("image/jpeg", 0.82));
    };
    img.onerror = reject;
    img.src = url;
  });
}

function AvatarCircle({ avatarUrl, initials, color, size = 36 }: {
  avatarUrl: string | null; initials: string; color: string; size?: number;
}) {
  if (avatarUrl) {
    return (
      <img src={avatarUrl} alt="avatar" style={{
        width: size, height: size, borderRadius: "9999px",
        objectFit: "cover", display: "block", flexShrink: 0,
      }} />
    );
  }
  return (
    <div style={{
      width: size, height: size, borderRadius: "9999px",
      backgroundColor: color, color: "#fff",
      fontSize: size <= 36 ? "0.6875rem" : "1.125rem",
      fontWeight: 700, letterSpacing: "0.05em",
      display: "flex", alignItems: "center", justifyContent: "center",
      flexShrink: 0,
    }}>
      {initials}
    </div>
  );
}

export default function AccountButton() {
  const { user, setDisplayName, setEmoji, refreshProfile } = useAuth();
  const router   = useRouter();
  const wrapRef  = useRef<HTMLDivElement>(null);
  const fileRef  = useRef<HTMLInputElement>(null);

  const [open,   setOpen]   = useState(false);
  const [saving, setSaving] = useState(false);

  // Profile state — loaded from Supabase on panel open
  const [displayName,  setEditName]  = useState("");
  const [avatarColor,  setAvatarColor]  = useState(AVATAR_COLORS[0]);
  const [avatarUrl,    setAvatarUrl]    = useState<string | null>(null);
  // Shown on the button (persisted after save)
  const [savedName,    setSavedName]    = useState<string | null>(null);
  const [savedColor,   setSavedColor]   = useState(AVATAR_COLORS[0]);
  const [savedAvatar,  setSavedAvatar]  = useState<string | null>(null);

  // Emoji
  const [editEmoji,  setEditEmoji]  = useState<string | null>(null);
  const [savedEmoji, setSavedEmoji] = useState<string | null>(null);

  // Load profile from Supabase when user logs in
  useEffect(() => {
    if (!user) return;
    supabase
      .from("profiles")
      .select("display_name, avatar_color, avatar_url, emoji")
      .eq("id", user.id)
      .single()
      .then(({ data }) => {
        if (data) {
          setSavedName(data.display_name ?? null);
          setSavedColor(data.avatar_color ?? AVATAR_COLORS[0]);
          setSavedAvatar(data.avatar_url ?? null);
          setSavedEmoji(data.emoji ?? null);
        }
      });
  }, [user?.id]);

  // Sync edit fields when panel opens
  useEffect(() => {
    if (open) {
      setEditName(savedName ?? "");
      setAvatarColor(savedColor);
      setAvatarUrl(savedAvatar);
      setEditEmoji(savedEmoji);
    }
  }, [open, savedName, savedColor, savedAvatar, savedEmoji]);

  // Close on outside click
  useEffect(() => {
    if (!open) return;
    const fn = (e: MouseEvent) => {
      if (wrapRef.current && !wrapRef.current.contains(e.target as Node)) setOpen(false);
    };
    document.addEventListener("mousedown", fn);
    return () => document.removeEventListener("mousedown", fn);
  }, [open]);

  // Close on Escape
  useEffect(() => {
    if (!open) return;
    const fn = (e: KeyboardEvent) => { if (e.key === "Escape") setOpen(false); };
    window.addEventListener("keydown", fn);
    return () => window.removeEventListener("keydown", fn);
  }, [open]);

  async function handlePhotoUpload(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    try { setAvatarUrl(await resizeToBase64(file)); } catch {}
    e.target.value = "";
  }

  async function handleSave() {
    if (!user) return;
    setSaving(true);
    const name      = displayName.trim() || null;
    const color     = avatarColor;
    const photo     = avatarUrl;
    const emojiVal  = editEmoji || null;
    const { error } = await supabase.from("profiles").upsert({
      id: user.id,
      display_name: name,
      avatar_color: color,
      avatar_url:   photo,
      emoji:        emojiVal,
    });
    if (error) { console.error("[Profile] upsert failed:", error); setSaving(false); return; }
    setSavedName(name);
    setSavedColor(color);
    setSavedAvatar(photo);
    setSavedEmoji(emojiVal);
    setDisplayName(name);
    setEmoji(emojiVal);
    refreshProfile();
    setSaving(false);
    setOpen(false);
  }

  if (!user) {
    return (
      <button
        onClick={() => router.push("/auth")}
        style={{
          position: "fixed", top: "1rem", right: "3.75rem", zIndex: 40,
          height: "2.25rem", padding: "0 0.875rem", borderRadius: "9999px",
          fontSize: "0.8125rem", fontWeight: 500, cursor: "pointer",
          backgroundColor: "var(--c-card)", color: "var(--c-text3)",
          border: "1px solid var(--c-border)", boxShadow: "var(--c-shadow)",
          whiteSpace: "nowrap",
        }}
        onMouseEnter={(e) => (e.currentTarget.style.color = "var(--c-accent)")}
        onMouseLeave={(e) => (e.currentTarget.style.color = "var(--c-text3)")}
      >
        Sign in
      </button>
    );
  }

  const initials = getInitials(user.email ?? "", savedName);

  return (
    <div ref={wrapRef} style={{ position: "fixed", top: "1rem", right: "3.75rem", zIndex: 40 }}>
      {/* Avatar button */}
      <button
        onClick={() => setOpen(v => !v)}
        title={savedName ?? user.email ?? "Account"}
        style={{
          width: "2.25rem", height: "2.25rem", borderRadius: "9999px",
          border: "none", cursor: "pointer", padding: 0,
          boxShadow: "var(--c-shadow)", overflow: "hidden",
          display: "flex", alignItems: "center", justifyContent: "center",
        }}
      >
        <AvatarCircle avatarUrl={savedAvatar} initials={initials} color={savedColor} size={36} />
      </button>

      {/* Profile panel */}
      {open && (
        <div style={{
          position: "absolute", right: 0, top: "calc(100% + 0.5rem)",
          backgroundColor: "var(--c-card)",
          border: "1px solid var(--c-border)",
          borderRadius: "1rem",
          boxShadow: "0 4px 24px rgba(0,0,0,0.14), 0 1px 4px rgba(0,0,0,0.08)",
          padding: "1.25rem",
          width: 280,
          maxHeight: "calc(100vh - 5rem)",
          overflowY: "auto",
        }}>
          {/* Avatar + email */}
          <div style={{ display: "flex", flexDirection: "column", alignItems: "center", gap: "0.5rem", marginBottom: "1.25rem" }}>
            <AvatarCircle
              avatarUrl={avatarUrl}
              initials={getInitials(user.email ?? "", displayName.trim() || null)}
              color={avatarColor}
              size={64}
            />
            <p style={{ fontSize: "0.75rem", color: "var(--c-text3)", margin: 0, maxWidth: "100%", overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
              {user.email}
            </p>
          </div>

          {/* Display name */}
          <div style={{ marginBottom: "0.875rem" }}>
            <label style={{ display: "block", fontSize: "0.6875rem", fontWeight: 600, color: "var(--c-text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.375rem" }}>
              Display name
            </label>
            <input
              type="text"
              value={displayName}
              onChange={e => setEditName(e.target.value)}
              placeholder="Your name"
              className="th-input"
              style={{ width: "100%", fontSize: "0.875rem", borderRadius: "0.5rem", padding: "0.5rem 0.625rem", boxSizing: "border-box" }}
            />
          </div>

          {/* Avatar color */}
          <div style={{ marginBottom: "0.875rem" }}>
            <label style={{ display: "block", fontSize: "0.6875rem", fontWeight: 600, color: "var(--c-text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.5rem" }}>
              Avatar color
            </label>
            <div style={{ display: "flex", gap: "0.5rem", flexWrap: "wrap" }}>
              {AVATAR_COLORS.map(c => (
                <button
                  key={c}
                  type="button"
                  onClick={() => setAvatarColor(c)}
                  style={{
                    width: 24, height: 24, borderRadius: "9999px",
                    backgroundColor: c, border: "none", cursor: "pointer", padding: 0,
                    outline: avatarColor === c ? `3px solid ${c}` : "none",
                    outlineOffset: 2,
                    boxShadow: avatarColor === c ? "0 0 0 1px var(--c-card)" : "none",
                  }}
                />
              ))}
            </div>
          </div>

          {/* Profile photo */}
          <div style={{ marginBottom: "1.125rem" }}>
            <label style={{ display: "block", fontSize: "0.6875rem", fontWeight: 600, color: "var(--c-text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.375rem" }}>
              Profile photo
            </label>
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center" }}>
              <button type="button" onClick={() => fileRef.current?.click()} className="th-btn"
                style={{ fontSize: "0.8125rem", padding: "0.4rem 0.75rem", borderRadius: "0.5rem", cursor: "pointer" }}>
                {avatarUrl ? "Change photo" : "Upload photo"}
              </button>
              {avatarUrl && (
                <button type="button" onClick={() => setAvatarUrl(null)}
                  style={{ fontSize: "0.8125rem", cursor: "pointer", color: "var(--c-text3)", background: "none", border: "none", padding: "0.4rem 0" }}>
                  Remove
                </button>
              )}
            </div>
            <input ref={fileRef} type="file" accept="image/*" onChange={handlePhotoUpload} style={{ display: "none" }} />
          </div>

          {/* Greeting emoji */}
          <div style={{ marginBottom: "0.875rem" }}>
            <label style={{ display: "block", fontSize: "0.6875rem", fontWeight: 600, color: "var(--c-text3)", textTransform: "uppercase", letterSpacing: "0.06em", marginBottom: "0.375rem" }}>
              Greeting emoji
            </label>
            {/* Type input + None button */}
            <div style={{ display: "flex", gap: "0.5rem", alignItems: "center", marginBottom: "0.5rem" }}>
              <input
                type="text"
                value={editEmoji ?? ""}
                onChange={e => setEditEmoji(e.target.value || null)}
                placeholder="Type emoji"
                maxLength={8}
                className="th-input"
                style={{ width: 72, textAlign: "center", fontSize: "1.25rem", borderRadius: "0.5rem", padding: "0.3rem 0.5rem", boxSizing: "border-box" }}
              />
              <button
                type="button"
                onClick={() => setEditEmoji(null)}
                style={{
                  fontSize: "0.75rem", cursor: "pointer", padding: "0.3rem 0.625rem",
                  borderRadius: "0.5rem", border: `1.5px solid ${editEmoji === null ? "var(--c-accent)" : "var(--c-border)"}`,
                  backgroundColor: editEmoji === null ? "var(--c-done-bg)" : "transparent",
                  color: editEmoji === null ? "var(--c-accent)" : "var(--c-text3)",
                  fontWeight: editEmoji === null ? 600 : 400,
                }}
              >
                No emoji
              </button>
            </div>
            {/* Quick-pick grid */}
            <div style={{ display: "flex", flexWrap: "wrap", gap: "0.25rem" }}>
              {EMOJI_OPTIONS.map(e => (
                <button
                  key={e}
                  type="button"
                  onClick={() => setEditEmoji(e)}
                  style={{
                    width: 30, height: 30, fontSize: "1rem", lineHeight: 1,
                    borderRadius: "0.375rem", border: `2px solid ${editEmoji === e ? "var(--c-accent)" : "transparent"}`,
                    backgroundColor: editEmoji === e ? "var(--c-done-bg)" : "var(--c-item)",
                    cursor: "pointer", padding: 0,
                  }}
                >
                  {e}
                </button>
              ))}
            </div>
          </div>

          {/* Save */}
          <button type="button" onClick={handleSave} disabled={saving} className="th-btn"
            style={{
              width: "100%", padding: "0.5rem", borderRadius: "0.625rem",
              fontSize: "0.875rem", fontWeight: 600, cursor: saving ? "default" : "pointer",
              opacity: saving ? 0.6 : 1, marginBottom: "0.75rem",
            }}>
            {saving ? "Saving…" : "Save changes"}
          </button>

          <div style={{ height: 1, backgroundColor: "var(--c-divider)", margin: "0 0 0.5rem" }} />

          {/* Sign out */}
          <button type="button"
            onClick={async () => { setOpen(false); await supabase.auth.signOut(); window.location.href = "/auth"; }}
            style={{
              width: "100%", textAlign: "left",
              padding: "0.5rem 0.25rem", borderRadius: "0.5rem",
              fontSize: "0.875rem", cursor: "pointer",
              color: "#c45050", backgroundColor: "transparent", border: "none",
            }}
            onMouseEnter={e => (e.currentTarget.style.backgroundColor = "var(--c-item)")}
            onMouseLeave={e => (e.currentTarget.style.backgroundColor = "transparent")}
          >
            Sign out
          </button>
        </div>
      )}
    </div>
  );
}
