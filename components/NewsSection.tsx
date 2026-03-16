"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "./LanguageProvider";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface Article {
  id: string;
  title: string;
  url: string;
  description: string;
  publishedAt: string;
  source: string;
  category: "world" | "sports";
}

/* ── Feed sources ──────────────────────────────────────────────────────────── */

const FEEDS = [
  { name: "BBC News",        url: "https://feeds.bbci.co.uk/news/rss.xml",                    category: "world"  },
  { name: "Reuters",         url: "https://feeds.reuters.com/reuters/topNews",                 category: "world"  },
  { name: "The Guardian",    url: "https://www.theguardian.com/world/rss",                    category: "world"  },
  { name: "Al Jazeera",      url: "https://www.aljazeera.com/xml/rss/all.xml",               category: "world"  },
  { name: "NPR News",        url: "https://feeds.npr.org/1001/rss.xml",                       category: "world"  },
  { name: "ABC News",        url: "https://abcnews.go.com/abcnews/topstories",               category: "world"  },
  { name: "CBS News",        url: "https://www.cbsnews.com/latest/rss/main",                  category: "world"  },
  { name: "ESPN",            url: "https://www.espn.com/espn/rss/news",                       category: "sports" },
  { name: "Sky Sports",      url: "https://www.skysports.com/rss/12040",                      category: "sports" },
  { name: "Science Daily",   url: "https://www.sciencedaily.com/rss/top/science.xml",         category: "world"  },
] as const;

/* ── Proxy helpers ─────────────────────────────────────────────────────────── */

const PROXIES = [
  (url: string) => `https://corsproxy.io/?${encodeURIComponent(url)}`,
  (url: string) => `https://api.allorigins.win/get?url=${encodeURIComponent(url)}`,
];

async function fetchViaProxy(feedUrl: string, signal: AbortSignal): Promise<string> {
  let lastError: unknown;
  for (const makeProxy of PROXIES) {
    const proxyUrl = makeProxy(feedUrl);
    try {
      const res = await fetch(proxyUrl, { signal });
      if (!res.ok) throw new Error(`HTTP ${res.status}`);

      // allorigins returns JSON { contents: "..." }
      // corsproxy.io returns raw text
      const text = await res.text();
      try {
        const json = JSON.parse(text) as { contents?: string };
        if (json.contents) return json.contents;
      } catch {
        // not JSON — it's already raw XML
      }
      return text;
    } catch (err) {
      if ((err as Error).name === "AbortError") throw err;
      lastError = err;
      console.warn(`[News] Proxy ${proxyUrl} failed for ${feedUrl}:`, err);
    }
  }
  throw lastError;
}

/* ── XML / RSS helpers ─────────────────────────────────────────────────────── */

function safeText(el: Element | null | undefined): string {
  return el?.textContent?.trim() ?? "";
}

function getItemLink(item: Element): string {
  // Walk all <link> children — handles text-node links and href attributes (Atom)
  const links = item.getElementsByTagName("link");
  for (let i = 0; i < links.length; i++) {
    const href = links[i].getAttribute("href");
    if (href?.startsWith("http")) return href;
    const txt = links[i].textContent?.trim();
    if (txt?.startsWith("http")) return txt;
  }
  // Fallback: guid that looks like a URL
  const guidText = safeText(item.getElementsByTagName("guid")[0]);
  if (guidText.startsWith("http")) return guidText;
  // Atom: <id> that looks like a URL
  const idText = safeText(item.getElementsByTagName("id")[0]);
  if (idText.startsWith("http")) return idText;
  return "";
}

function getItemDate(item: Element): string {
  const raw =
    safeText(item.getElementsByTagName("pubDate")[0]) ||
    safeText(item.getElementsByTagName("updated")[0]) ||   // Atom
    safeText(item.getElementsByTagName("date")[0]);         // dc:date
  if (!raw) return new Date().toISOString();
  const d = new Date(raw);
  return isNaN(d.getTime()) ? new Date().toISOString() : d.toISOString();
}

function stripTags(html: string): string {
  return html.replace(/<[^>]+>/g, " ").replace(/\s{2,}/g, " ").trim();
}

function parseXML(xml: string, source: string, category: string): Article[] {
  const doc = new DOMParser().parseFromString(xml, "text/xml");
  if (doc.querySelector("parsererror")) {
    console.warn(`[News] ${source}: XML parse error`);
    return [];
  }

  // Support both RSS <item> and Atom <entry>
  const items = [
    ...Array.from(doc.getElementsByTagName("item")),
    ...Array.from(doc.getElementsByTagName("entry")),
  ].slice(0, 15);

  if (items.length === 0) {
    console.warn(`[News] ${source}: no <item> or <entry> elements found`);
    return [];
  }

  const results: Article[] = [];
  for (const item of items) {
    const title = stripTags(safeText(item.getElementsByTagName("title")[0]));
    const url   = getItemLink(item);
    if (!title || !url) continue;
    const desc = stripTags(
      safeText(item.getElementsByTagName("description")[0]) ||
      safeText(item.getElementsByTagName("summary")[0]) ||    // Atom
      safeText(item.getElementsByTagName("content")[0])       // Atom content
    ).slice(0, 300);
    results.push({
      id:          url,
      title,
      url,
      description: desc,
      publishedAt: getItemDate(item),
      source,
      category: category as "world" | "sports",
    });
  }
  return results;
}

async function fetchFeed(feed: (typeof FEEDS)[number]): Promise<Article[]> {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 15000);
  console.log(`[News] Fetching: ${feed.name} → ${feed.url}`);
  try {
    const xml = await fetchViaProxy(feed.url, controller.signal);
    const articles = parseXML(xml, feed.name, feed.category);
    console.log(`[News] ✓ ${feed.name}: ${articles.length} articles`);
    return articles;
  } catch (err) {
    console.error(`[News] ✗ ${feed.name} failed:`, err);
    throw err;
  } finally {
    clearTimeout(timer);
  }
}

/* ── Topic config ──────────────────────────────────────────────────────────── */

// Priority order: most specific first — each article gets ONE primary topic
const TOPIC_PRIORITY = [
  "Fashion",
  "Entertainment",
  "Health",
  "Science",
  "Environment",
  "War & Conflict",
  "Business",
  "Sports",
  "Technology",
  "Politics",
];

const TOPIC_KEYWORDS: Record<string, string[]> = {
  "Fashion":        ["fashion", "designer", "runway", "vogue", "couture", "clothing", "outfit", "collection", "streetwear"],
  "Entertainment":  ["oscar", "grammy", "emmy", "bafta", "award", "celebrity", "movie", "film", "actor", "actress", "concert", "album", "box office", "hollywood", "netflix", "streaming"],
  "Health":         ["health", "disease", "vaccine", "hospital", "medical", "virus", "cancer", "treatment", "pandemic", "drug", "fda"],
  "Science":        ["research", "study", "space", "discovery", "scientist", "nasa", "biology", "physics", "asteroid", "planet", "gene"],
  "Environment":    ["climate change", "environment", "carbon", "pollution", "renewable", "emissions", "wildfire", "deforestation"],
  "War & Conflict": ["war", "conflict", "battle", "troops", "military", "missile", "bombing", "ceasefire", "invasion", "combat", "soldiers", "airstrike", "hostage"],
  "Business":       ["market", "economy", "stock", "trade", "company", "finance", "gdp", "inflation", "bank", "investment", "earnings", "merger"],
  "Sports":         ["sport", "game", "match", "team", "player", "tournament", "championship", "league", "nfl", "nba", "fifa", "olympic"],
  "Technology":     ["tech", "artificial intelligence", "software", "apple", "google", "meta", "startup", "cybersecurity", "robot", "chip"],
  "Politics":       ["election", "president", "government", "parliament", "minister", "vote", "senate", "congress", "policy", "diplomat", "white house"],
};

const ALL_TOPICS = TOPIC_PRIORITY;

const TOPIC_I18N_KEYS: Record<string, string> = {
  "Fashion":        "news.topic.fashion",
  "Entertainment":  "news.topic.entertainment",
  "Health":         "news.topic.health",
  "Science":        "news.topic.science",
  "Environment":    "news.topic.environment",
  "War & Conflict": "news.topic.warConflict",
  "Business":       "news.topic.business",
  "Sports":         "news.topic.sports",
  "Technology":     "news.topic.technology",
  "Politics":       "news.topic.politics",
};

// Stories matching these keywords are Entertainment, not War & Conflict
const ENTERTAINMENT_SIGNALS = ["oscar", "award", "film", "movie", "actor", "actress", "celebrity", "grammy", "emmy", "bafta", "hollywood"];

/* ── Source accent colors ──────────────────────────────────────────────────── */

const SOURCE_DOT: Record<string, string> = {
  "BBC News":      "#b5121b",
  "Reuters":       "#f06000",
  "The Guardian":  "#005689",
  "Al Jazeera":    "#7ab648",
  "NPR News":      "#3f9ed4",
  "ABC News":      "#00008b",
  "CBS News":      "#004f9f",
  "ESPN":          "#d00",
  "Sky Sports":    "#0057b8",
  "Science Daily": "#2a7ae4",
};

const FILTER_KEY = "today-news-filters-v1";

/* ── Filtering helpers ─────────────────────────────────────────────────────── */

function detectPrimaryTopic(title: string, desc: string): string | null {
  const text = `${title} ${desc}`.toLowerCase();
  for (const topic of TOPIC_PRIORITY) {
    if (!TOPIC_KEYWORDS[topic].some(kw => text.includes(kw))) continue;
    if (topic === "War & Conflict" && ENTERTAINMENT_SIGNALS.some(kw => text.includes(kw))) continue;
    return topic;
  }
  return null;
}

function timeSince(iso: string, t: (key: string, vars?: Record<string, string | number>) => string): string {
  const diff = Date.now() - new Date(iso).getTime();
  const m = Math.floor(diff / 60000);
  if (m < 1)  return t("news.justNow");
  if (m < 60) return t("news.minutesAgo", { n: m });
  const h = Math.floor(m / 60);
  if (h < 24) return t("news.hoursAgo", { n: h });
  return t("news.daysAgo", { n: Math.floor(h / 24) });
}

/* ── Icons ─────────────────────────────────────────────────────────────────── */

function NewspaperIcon() {
  return (
    <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
      <path d="M4 22h16a2 2 0 0 0 2-2V4a2 2 0 0 0-2-2H8a2 2 0 0 0-2 2v16a2 2 0 0 1-2 2Zm0 0a2 2 0 0 1-2-2v-9c0-1.1.9-2 2-2h2"/>
      <path d="M18 14h-8"/><path d="M15 18h-5"/><path d="M10 6h8v4h-8V6Z"/>
    </svg>
  );
}

function RefreshIcon({ spinning }: { spinning?: boolean }) {
  return (
    <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" className={spinning ? "animate-spin" : ""}>
      <polyline points="23 4 23 10 17 10"/>
      <polyline points="1 20 1 14 7 14"/>
      <path d="M3.51 9a9 9 0 0 1 14.85-3.36L23 10M1 14l4.64 4.36A9 9 0 0 0 20.49 15"/>
    </svg>
  );
}

/* ── NewsSection ───────────────────────────────────────────────────────────── */

export default function NewsSection() {
  const { t } = useLanguage();
  const [allArticles,   setAllArticles]   = useState<Article[]>([]);
  const [loading,       setLoading]       = useState(true);
  const [loadedCount,   setLoadedCount]   = useState(0);
  const [failedSources, setFailedSources] = useState<string[]>([]);
  const [refreshKey,    setRefreshKey]    = useState(0);

  // Filters
  const [category,     setCategory]     = useState<"all" | "world" | "sports">("all");
  const [activeTopic,  setActiveTopic]  = useState<string | null>(null);
  const [filtersReady, setFiltersReady] = useState(false);

  // Load persisted filters
  useEffect(() => {
    try {
      const raw = localStorage.getItem(FILTER_KEY);
      if (raw) {
        const parsed = JSON.parse(raw);
        if (parsed.category) setCategory(parsed.category);
        // Support both old multi-select format and new single-select
        if (typeof parsed.topic === "string") setActiveTopic(parsed.topic);
      }
    } catch {}
    setFiltersReady(true);
  }, []);

  // Persist filters whenever they change
  useEffect(() => {
    if (!filtersReady) return;
    try { localStorage.setItem(FILTER_KEY, JSON.stringify({ category, topic: activeTopic })); }
    catch {}
  }, [category, activeTopic, filtersReady]);

  // Fetch all feeds — articles stream in as each feed resolves
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setAllArticles([]);
    setFailedSources([]);
    setLoadedCount(0);

    console.log("[News] Starting fetch for", FEEDS.length, "feeds");

    (async () => {
      const results = await Promise.allSettled(
        FEEDS.map(async feed => {
          try {
            const arts = await fetchFeed(feed);
            if (!alive) return;
            if (arts.length > 0) {
              setAllArticles(prev => {
                const merged = [...prev, ...arts];
                merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
                const seen = new Set<string>();
                return merged.filter(a => {
                  if (seen.has(a.url)) return false;
                  seen.add(a.url);
                  return true;
                });
              });
            }
          } catch {
            if (alive) setFailedSources(f => [...f, feed.name]);
          } finally {
            if (alive) setLoadedCount(c => c + 1);
          }
        })
      );

      const succeeded = results.filter(r => r.status === "fulfilled").length;
      console.log(`[News] Done — ${succeeded}/${FEEDS.length} feeds succeeded`);

      if (alive) setLoading(false);
    })();

    return () => { alive = false; };
  }, [refreshKey]);

  // Apply filters
  const filtered = useMemo(() => {
    let result = allArticles;
    if (category !== "all") result = result.filter(a => a.category === category);
    if (activeTopic !== null) {
      result = result.filter(a => detectPrimaryTopic(a.title, a.description) === activeTopic);
    }
    return result.slice(0, 10);
  }, [allArticles, category, activeTopic]);

  function handleTopicClick(t: string) {
    setActiveTopic(prev => prev === t ? null : t);
  }

  const anyFilterActive = category !== "all" || activeTopic !== null;

  return (
    <div className="card p-5 sm:p-6 flex flex-col gap-4">

      {/* ── Card header ── */}
      <div className="flex items-center gap-2.5">
        <span style={{ color: "var(--c-accent)" }}><NewspaperIcon /></span>
        <h2 className="text-xs font-semibold tracking-wide uppercase flex-1" style={{ color: "var(--c-text2)" }}>
          {t("news.title")}
        </h2>

        {/* Feed progress */}
        <span className="text-xs tabular-nums" style={{ color: "var(--c-text3)" }}>
          {loading
            ? t("news.loading", { loaded: loadedCount, total: FEEDS.length })
            : failedSources.length > 0
            ? t("news.sourcesFailed", { ok: FEEDS.length - failedSources.length, total: FEEDS.length })
            : t("news.sources", { total: FEEDS.length })}
        </span>

        <button
          onClick={() => setRefreshKey(k => k + 1)}
          disabled={loading}
          className="refresh-btn flex items-center gap-1 text-xs disabled:opacity-40 cursor-pointer ml-1"
          title={t("news.refreshTitle")}
        >
          <RefreshIcon spinning={loading} />
        </button>
      </div>

      {/* ── Loading progress bar ── */}
      {loading && (
        <div style={{ height: 2, borderRadius: 1, backgroundColor: "var(--c-skel)", overflow: "hidden" }}>
          <div style={{
            height: "100%",
            width: `${Math.round((loadedCount / FEEDS.length) * 100)}%`,
            backgroundColor: "var(--c-accent)",
            transition: "width 0.3s ease",
          }} />
        </div>
      )}

      {/* ── Category filter ── */}
      <div className="flex gap-1 p-1 rounded-xl self-start" style={{ backgroundColor: "var(--c-item)" }}>
        {(["all", "world", "sports"] as const).map(cat => (
          <button
            key={cat}
            onClick={() => setCategory(cat)}
            className="px-4 py-1.5 rounded-lg text-sm font-medium capitalize transition-all cursor-pointer"
            style={{
              backgroundColor: category === cat ? "var(--c-card)" : "transparent",
              color:           category === cat ? "var(--c-text1)" : "var(--c-text3)",
              boxShadow:       category === cat ? "0 1px 4px rgba(0,0,0,0.10)" : "none",
            }}
          >
            {cat === "all" ? t("news.cat.all") : cat === "world" ? t("news.cat.world") : t("news.cat.sports")}
          </button>
        ))}
      </div>

      {/* ── Topic pills ── */}
      <div className="-mx-5 sm:-mx-6 px-5 sm:px-6 overflow-x-auto">
        <div className="flex gap-2 pb-0.5" style={{ width: "max-content" }}>
          {/* "All Topics" = clear filter */}
          <button
            onClick={() => setActiveTopic(null)}
            className="text-xs px-3 py-1.5 rounded-full font-medium transition-all cursor-pointer whitespace-nowrap"
            style={{
              backgroundColor: activeTopic === null ? "var(--c-accent)" : "transparent",
              border: `1.5px solid ${activeTopic === null ? "var(--c-accent)" : "var(--c-border)"}`,
              color: activeTopic === null ? "var(--c-accent-fg)" : "var(--c-text2)",
            }}
          >
            {t("news.topic.all")}
          </button>

          {/* Individual topic pills — single-select */}
          {ALL_TOPICS.map(topic => {
            const on = activeTopic === topic;
            return (
              <button
                key={topic}
                onClick={() => handleTopicClick(topic)}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-all cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: on ? "var(--c-accent)" : "transparent",
                  border: `1.5px solid ${on ? "var(--c-accent)" : "var(--c-border)"}`,
                  color: on ? "var(--c-accent-fg)" : "var(--c-text2)",
                }}
              >
                {t(TOPIC_I18N_KEYS[topic] ?? `news.topic.${topic}`)}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Loading skeleton (before any articles stream in) ── */}
      {loading && allArticles.length === 0 && (
        <div className="flex flex-col gap-4 mt-1">
          {[...Array(6)].map((_, i) => (
            <div key={i} className="animate-pulse">
              <div className="h-3 rounded mb-1.5" style={{ width: `${75 + (i % 3) * 8}%`, backgroundColor: "var(--c-skel)" }} />
              <div className="h-3 rounded mb-1.5" style={{ width: `${55 + (i % 4) * 7}%`, backgroundColor: "var(--c-skel)" }} />
              <div className="h-2.5 rounded w-36" style={{ backgroundColor: "var(--c-skel)" }} />
            </div>
          ))}
        </div>
      )}

      {/* ── Article list ── */}
      {filtered.length > 0 && (
        <div className="flex flex-col">
          {filtered.map((a, i) => (
            <a
              key={a.id}
              href={a.url}
              target="_blank"
              rel="noopener noreferrer"
              className="news-link py-3 first:pt-1 last:pb-0 block"
              style={{ borderBottom: i < filtered.length - 1 ? `1px solid var(--c-divider)` : "none" }}
            >
              <p className="news-title text-sm font-medium leading-snug">{a.title}</p>
              <div className="flex items-center gap-2 mt-1.5 flex-wrap">
                <span className="flex items-center gap-1.5">
                  <span style={{
                    width: 6, height: 6, borderRadius: "50%",
                    backgroundColor: SOURCE_DOT[a.source] ?? "var(--c-accent)",
                    display: "inline-block", flexShrink: 0,
                  }} />
                  <span className="text-xs font-medium" style={{ color: "var(--c-text3)" }}>{a.source}</span>
                </span>
                <span className="text-xs" style={{ color: "var(--c-text3)" }}>·</span>
                <span className="text-xs" style={{ color: "var(--c-text3)" }}>{timeSince(a.publishedAt, t)}</span>
                {(() => {
                  const pt = detectPrimaryTopic(a.title, a.description);
                  return pt ? (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                      backgroundColor: "var(--c-item)",
                      border: "1px solid var(--c-border)",
                      color: "var(--c-text3)",
                    }}>
                      {t(TOPIC_I18N_KEYS[pt] ?? pt)}
                    </span>
                  ) : null;
                })()}
              </div>
            </a>
          ))}
        </div>
      )}

      {/* ── Empty: filters active but no results ── */}
      {!loading && filtered.length === 0 && allArticles.length > 0 && (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: "var(--c-text2)" }}>
            {t("news.noMatch")}
          </p>
          {anyFilterActive && (
            <button
              onClick={() => { setCategory("all"); setActiveTopic(null); }}
              className="text-xs mt-2 cursor-pointer"
              style={{ color: "var(--c-accent)" }}
            >
              {t("news.clearFilters")}
            </button>
          )}
        </div>
      )}

      {/* ── Total failure ── */}
      {!loading && allArticles.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm font-medium mb-1" style={{ color: "var(--c-text2)" }}>
            {t("news.failedTitle")}
          </p>
          <p className="text-xs mb-3" style={{ color: "var(--c-text3)" }}>
            {t("news.failedDetail", { sources: failedSources.join(", ") || "all" })}
          </p>
          <button
            onClick={() => setRefreshKey(k => k + 1)}
            className="text-xs cursor-pointer"
            style={{ color: "var(--c-accent)" }}
          >
            {t("news.tryAgain")}
          </button>
        </div>
      )}

      {/* ── Partial failure note ── */}
      {!loading && failedSources.length > 0 && allArticles.length > 0 && (
        <p className="text-xs pt-1" style={{ color: "var(--c-text3)", borderTop: `1px solid var(--c-divider)` }}>
          {t(failedSources.length !== 1 ? "news.unreachableN" : "news.unreachable", { count: failedSources.length, sources: failedSources.join(", ") })}
        </p>
      )}
    </div>
  );
}
