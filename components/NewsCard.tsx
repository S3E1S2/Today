"use client";

import { useEffect, useState } from "react";

interface Article {
  title: string;
  description: string;
  url: string;
  publishedAt: string;
  source: { name: string };
}

function NewspaperIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2" />
      <path d="M18 14h-8" /><path d="M15 18h-5" /><path d="M10 6h8v4h-8V6Z" />
    </svg>
  );
}

function timeSince(iso: string) {
  const diff = Date.now() - new Date(iso).getTime();
  const h = Math.floor(diff / 3600000);
  if (h < 1) return "just now";
  if (h < 24) return `${h}h ago`;
  return `${Math.floor(h / 24)}d ago`;
}

export default function NewsCard() {
  const [articles, setArticles] = useState<Article[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    fetch("/api/news")
      .then((r) => r.json())
      .then((data) => {
        if (data.error) setError(data.error);
        else setArticles(data.articles ?? []);
      })
      .catch((e) => setError(String(e)))
      .finally(() => setLoading(false));
  }, []);

  return (
    <div className="card p-6 flex flex-col gap-4">
      <div className="flex items-center gap-2.5">
        <span style={{ color: "var(--c-accent)" }}><NewspaperIcon /></span>
        <h2 className="text-xs font-semibold tracking-wide uppercase" style={{ color: "var(--c-text2)" }}>
          Top Headlines
        </h2>
      </div>

      {loading && (
        <div className="flex flex-col gap-3">
          {[...Array(5)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 rounded w-full mb-1.5" style={{ backgroundColor: "var(--c-skel)" }} />
              <div className="h-2.5 rounded w-2/3" style={{ backgroundColor: "var(--c-skel)" }} />
            </div>
          ))}
        </div>
      )}

      {error && !loading && (
        <p className="text-sm" style={{ color: "var(--c-text3)" }}>
          Could not load headlines. Check your connection.
        </p>
      )}

      {!loading && !error && articles.length === 0 && (
        <p className="text-sm" style={{ color: "var(--c-text3)" }}>No articles found.</p>
      )}

      {!loading && articles.length > 0 && (
        <div className="flex flex-col">
          {articles.map((a, i) => (
            <a
              key={i}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="news-link py-3 first:pt-0 last:pb-0"
              style={{ borderBottom: i < articles.length - 1 ? "1px solid var(--c-divider)" : "none" }}
            >
              <p className="news-title text-sm font-medium leading-snug line-clamp-2">
                {a.title}
              </p>
              <div className="flex items-center gap-2 mt-1">
                <span className="text-xs" style={{ color: "var(--c-text3)" }}>{a.source.name}</span>
                <span className="text-xs" style={{ color: "var(--c-text3)" }}>·</span>
                <span className="text-xs" style={{ color: "var(--c-text3)" }}>{timeSince(a.publishedAt)}</span>
              </div>
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
