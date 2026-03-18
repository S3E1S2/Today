"use client";

import { useEffect, useMemo, useState } from "react";
import { useLanguage } from "./LanguageProvider";

/* ── Types ─────────────────────────────────────────────────────────────────── */

interface Article {
  id:            string;
  title:         string;
  originalTitle?: string; // native-language title when "Translate to EN" is on
  url:           string;
  description:   string;
  publishedAt:   string;
  source:        string;
  category:      "world" | "sports";
}

interface FeedConfig {
  name:     string;
  url:      string;
  category: "world" | "sports";
}

/* ── Feed sets per locale ──────────────────────────────────────────────────── */

const FEEDS_EN: FeedConfig[] = [
  { name: "BBC News",          url: "https://feeds.bbci.co.uk/news/rss.xml",                        category: "world"  },
  { name: "CNN",               url: "https://rss.cnn.com/rss/cnn_topstories.rss",                   category: "world"  },
  { name: "Reuters",           url: "https://feeds.reuters.com/reuters/worldNews",                   category: "world"  },
  { name: "The Guardian",      url: "https://www.theguardian.com/world/rss",                         category: "world"  },
  { name: "Al Jazeera",        url: "https://www.aljazeera.com/xml/rss/all.xml",                     category: "world"  },
  { name: "The New York Times",url: "https://rss.nytimes.com/services/xml/rss/nyt/HomePage.xml",     category: "world"  },
  { name: "Washington Post",   url: "https://feeds.washingtonpost.com/rss/world",                    category: "world"  },
  { name: "Fox News",          url: "https://moxie.foxnews.com/google-publisher/latest.xml",         category: "world"  },
  { name: "ESPN",              url: "https://www.espn.com/espn/rss/news",                            category: "sports" },
];

const FEEDS_ES: FeedConfig[] = [
  { name: "BBC Mundo",  url: "https://feeds.bbci.co.uk/mundo/rss.xml",                                         category: "world" },
  { name: "CNN Español",url: "https://cnnespanol.cnn.com/feed/",                                               category: "world" },
  { name: "El País",    url: "https://feeds.elpais.com/mrss-s/pages/ep/site/elpais.com/portada",               category: "world" },
  { name: "DW Español", url: "https://rss.dw.com/rdf/rss-es-all",                                             category: "world" },
];

const FEEDS_FR: FeedConfig[] = [
  { name: "France 24", url: "https://www.france24.com/fr/rss",                   category: "world" },
  { name: "DW Français",url: "https://rss.dw.com/rdf/rss-fr-all",               category: "world" },
  { name: "Le Monde",  url: "https://www.lemonde.fr/rss/une.xml",                category: "world" },
  { name: "RFI",       url: "https://www.rfi.fr/fr/rss",                         category: "world" },
];

const FEEDS_DE: FeedConfig[] = [
  { name: "Der Spiegel",    url: "https://www.spiegel.de/schlagzeilen/index.rss", category: "world" },
  { name: "Deutsche Welle", url: "https://rss.dw.com/rdf/rss-de-all",            category: "world" },
  { name: "Die Zeit",       url: "https://newsfeed.zeit.de/index",               category: "world" },
];

const FEEDS_ID: FeedConfig[] = [
  { name: "BBC Indonesia", url: "https://feeds.bbci.co.uk/indonesian/rss.xml",   category: "world" },
  { name: "DW Indonesia",  url: "https://rss.dw.com/rdf/rss-id-all",            category: "world" },
  { name: "Kompas",        url: "https://rss.kompas.com/money/xml/rssatm.xml",   category: "world" },
  { name: "CNN Indonesia", url: "https://www.cnnindonesia.com/rss",              category: "world" },
];

const FEEDS_BY_LOCALE: Record<string, FeedConfig[]> = {
  "en-US": FEEDS_EN,
  "es-ES": FEEDS_ES,
  "fr-FR": FEEDS_FR,
  "de-DE": FEEDS_DE,
  "id-ID": FEEDS_ID,
};

/* ── Proxy helpers ─────────────────────────────────────────────────────────── */

async function fetchViaProxy(feedUrl: string): Promise<string> {
  const res = await fetch(`/api/news?url=${encodeURIComponent(feedUrl)}`);
  if (!res.ok) throw new Error(`HTTP ${res.status}`);
  return res.text();
}

/* ── XML / RSS helpers ─────────────────────────────────────────────────────── */

function safeText(el: Element | null | undefined): string {
  return el?.textContent?.trim() ?? "";
}

function getItemLink(item: Element): string {
  const links = item.getElementsByTagName("link");
  for (let i = 0; i < links.length; i++) {
    const href = links[i].getAttribute("href");
    if (href?.startsWith("http")) return href;
    const txt = links[i].textContent?.trim();
    if (txt?.startsWith("http")) return txt;
  }
  const guidText = safeText(item.getElementsByTagName("guid")[0]);
  if (guidText.startsWith("http")) return guidText;
  const idText = safeText(item.getElementsByTagName("id")[0]);
  if (idText.startsWith("http")) return idText;
  return "";
}

function getItemDate(item: Element): string {
  const raw =
    safeText(item.getElementsByTagName("pubDate")[0]) ||
    safeText(item.getElementsByTagName("updated")[0]) ||
    safeText(item.getElementsByTagName("date")[0]);
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
      safeText(item.getElementsByTagName("summary")[0]) ||
      safeText(item.getElementsByTagName("content")[0])
    ).slice(0, 300);
    results.push({ id: url, title, url, description: desc, publishedAt: getItemDate(item), source, category: category as "world" | "sports" });
  }
  return results;
}

async function fetchFeed(feed: FeedConfig): Promise<Article[]> {
  console.log(`[News] Fetching: ${feed.name} → ${feed.url}`);
  try {
    const xml      = await fetchViaProxy(feed.url);
    const articles = parseXML(xml, feed.name, feed.category);
    console.log(`[News] ✓ ${feed.name}: ${articles.length} articles`);
    return articles;
  } catch (err) {
    console.error(`[News] ✗ ${feed.name} failed:`, err);
    throw err;
  }
}

/* ── Topic config ──────────────────────────────────────────────────────────── */

const TOPIC_PRIORITY = [
  "Fashion", "Entertainment", "Health", "Science", "Environment",
  "War & Conflict", "Business", "Sports", "Technology", "Politics",
];

const TOPIC_KEYWORDS: Record<string, string[]> = {
  "Fashion":        ["fashion", "designer", "runway", "vogue", "couture", "streetwear", "fashion week"],
  "Entertainment":  ["oscar", "grammy", "emmy", "bafta", "celebrity", "box office", "hollywood", "netflix", "streaming", "blockbuster", "box-office"],
  "Health":         ["health", "disease", "vaccine", "hospital", "medical", "virus", "cancer", "treatment", "pandemic", "fda", "WHO", "outbreak"],
  "Science":        ["space", "discovery", "nasa", "biology", "physics", "asteroid", "planet", "gene", "quantum", "scientists found", "new species"],
  "Environment":    ["climate change", "carbon emissions", "pollution", "renewable energy", "wildfire", "deforestation", "global warming", "sea level"],
  "War & Conflict": ["war", "troops", "military strike", "missile", "bombing", "ceasefire", "invasion", "airstrike", "hostage", "armed forces", "combat", "warzone", "war zone", "war crimes", "rebel forces", "insurgent", "siege"],
  "Business":       ["stock market", "economy", "gdp", "inflation", "trade war", "earnings", "merger", "acquisition", "central bank", "interest rate", "recession"],
  "Sports":         ["sport", "tournament", "championship", "league", "nfl", "nba", "fifa", "olympic", "world cup", "grand prix", "transfer", "match result"],
  "Technology":     ["artificial intelligence", "software", "apple", "google", "meta", "startup", "cybersecurity", "robot", "semiconductor", "tech giant", "elon musk"],
  "Politics":       ["election", "president", "government", "parliament", "minister", "senate", "congress", "white house", "diplomatic", "sanctions", "summit"],
};

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

const ENTERTAINMENT_SIGNALS = ["oscar", "award", "film", "movie", "actor", "actress", "celebrity", "grammy", "emmy", "bafta", "hollywood"];

/* ── Source accent colors ──────────────────────────────────────────────────── */

const SOURCE_DOT: Record<string, string> = {
  // English
  "BBC News":           "#b5121b",
  "CNN":                "#cc0000",
  "Reuters":            "#f06000",
  "The Guardian":       "#005689",
  "Al Jazeera":         "#7ab648",
  "The New York Times": "#1a1a1a",
  "Washington Post":    "#231f20",
  "Fox News":           "#003f8a",
  "ESPN":               "#d00",
  // Spanish
  "El País":            "#004f9f",
  "El Mundo":           "#d4000e",
  "BBC Mundo":          "#b5121b",
  "CNN Español":        "#cc0000",
  // French
  "Le Monde":           "#00a1e4",
  "Le Figaro":          "#003189",
  "France 24":          "#f00020",
  // German
  "Der Spiegel":        "#e2001a",
  "Deutsche Welle":     "#009ee0",
  "Die Zeit":           "#1a1a1a",
  // Indonesian
  "Kompas":             "#e21b23",
  "Detik":              "#e31e24",
  "BBC Indonesia":      "#b5121b",
  "CNN Indonesia":      "#cc0000",
};

const FILTER_KEY = "today-news-filters-v1";

/* ── Helpers ───────────────────────────────────────────────────────────────── */

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
  const { t, locale } = useLanguage();

  const activeFeeds = FEEDS_BY_LOCALE[locale] ?? FEEDS_EN;

  const [allArticles,   setAllArticles]   = useState<Article[]>([]);
  const [displayArticles, setDisplayArticles] = useState<Article[]>([]);
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
        const p = JSON.parse(raw);
        if (p.category) setCategory(p.category);
        if (typeof p.topic === "string") setActiveTopic(p.topic);
      }
    } catch {}
    setFiltersReady(true);
  }, []);

  useEffect(() => {
    if (!filtersReady) return;
    try { localStorage.setItem(FILTER_KEY, JSON.stringify({ category, topic: activeTopic })); } catch {}
  }, [category, activeTopic, filtersReady]);

  // ── Fetch feeds (re-runs when locale or refreshKey changes) ────────────────
  useEffect(() => {
    let alive = true;
    setLoading(true);
    setAllArticles([]);
    setDisplayArticles([]);
    setFailedSources([]);
    setLoadedCount(0);

    const feeds = FEEDS_BY_LOCALE[locale] ?? FEEDS_EN;
    console.log(`[News] Fetching ${feeds.length} feeds for locale: ${locale}`);

    (async () => {
      const results = await Promise.allSettled(
        feeds.map(async feed => {
          try {
            const arts = await fetchFeed(feed);
            if (!alive) return;
            if (arts.length > 0) {
              setAllArticles(prev => {
                const merged = [...prev, ...arts];
                merged.sort((a, b) => new Date(b.publishedAt).getTime() - new Date(a.publishedAt).getTime());
                const seen = new Set<string>();
                return merged.filter(a => { if (seen.has(a.url)) return false; seen.add(a.url); return true; });
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
      console.log(`[News] Done — ${succeeded}/${feeds.length} feeds succeeded`);
      if (alive) setLoading(false);
    })();

    return () => { alive = false; };
  }, [refreshKey, locale]);

  // Sync displayArticles with allArticles
  useEffect(() => {
    setDisplayArticles(allArticles);
  }, [allArticles]);

  // Apply filters
  const filtered = useMemo(() => {
    let result = displayArticles;
    if (category !== "all") result = result.filter(a => a.category === category);
    if (activeTopic !== null) {
      result = result.filter(a => {
        const text = `${a.title} ${a.description}`.toLowerCase();
        return TOPIC_KEYWORDS[activeTopic!]?.some(kw =>
          kw.includes(" ") ? text.includes(kw) : new RegExp(`\\b${kw}\\b`).test(text)
        ) ?? false;
      });
    }
    return result.slice(0, 10);
  }, [displayArticles, category, activeTopic]);

  const anyFilterActive = category !== "all" || activeTopic !== null;

  return (
    <div className="card p-5 sm:p-6 flex flex-col gap-4">

      {/* ── Card header ── */}
      <div className="flex items-center gap-2.5">
        <span style={{ color: "var(--c-accent)" }}><NewspaperIcon /></span>
        <h2 className="text-xs font-semibold tracking-wide uppercase flex-1" style={{ color: "var(--c-text2)" }}>
          {t("news.title")}
        </h2>

        {/* Feed status */}
        <span className="text-xs tabular-nums" style={{ color: "var(--c-text3)" }}>
          {loading
            ? t("news.loading", { loaded: loadedCount, total: activeFeeds.length })
            : failedSources.length > 0
            ? t("news.sourcesFailed", { ok: activeFeeds.length - failedSources.length, total: activeFeeds.length })
            : t("news.sources", { total: activeFeeds.length })}
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
            width: `${Math.round((loadedCount / activeFeeds.length) * 100)}%`,
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
          {TOPIC_PRIORITY.map(topic => {
            const on = activeTopic === topic;
            return (
              <button
                key={topic}
                onClick={() => setActiveTopic(prev => prev === topic ? null : topic)}
                className="text-xs px-3 py-1.5 rounded-full font-medium transition-all cursor-pointer whitespace-nowrap"
                style={{
                  backgroundColor: on ? "var(--c-accent)" : "transparent",
                  border: `1.5px solid ${on ? "var(--c-accent)" : "var(--c-border)"}`,
                  color: on ? "var(--c-accent-fg)" : "var(--c-text2)",
                }}
              >
                {t(TOPIC_I18N_KEYS[topic] ?? topic)}
              </button>
            );
          })}
        </div>
      </div>

      {/* ── Loading skeleton ── */}
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
          {filtered.map((a, i) => {
            const isTranslated = !!a.originalTitle;
            const pt = detectPrimaryTopic(a.title, a.description);
            return (
              <a
                key={a.id}
                href={a.url}
                target="_blank"
                rel="noopener noreferrer"
                className="news-link py-3 first:pt-1 last:pb-0 block"
                style={{ borderBottom: i < filtered.length - 1 ? `1px solid var(--c-divider)` : "none" }}
              >
                {/* Title row */}
                <p className="news-title text-sm font-medium leading-snug">{a.title}</p>

                {/* Original-language title shown below when translated */}
                {isTranslated && (
                  <p className="text-xs leading-snug mt-0.5" style={{ color: "var(--c-text3)" }}>
                    {a.originalTitle}
                  </p>
                )}

                {/* Meta row */}
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
                  {isTranslated && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                      backgroundColor: "color-mix(in srgb, var(--c-accent) 12%, var(--c-item))",
                      border: "1px solid color-mix(in srgb, var(--c-accent) 30%, var(--c-border))",
                      color: "var(--c-accent)",
                    }}>
                      {t("news.translated")}
                    </span>
                  )}
                  {pt && (
                    <span className="text-[10px] px-1.5 py-0.5 rounded-full" style={{
                      backgroundColor: "var(--c-item)",
                      border: "1px solid var(--c-border)",
                      color: "var(--c-text3)",
                    }}>
                      {t(TOPIC_I18N_KEYS[pt] ?? pt)}
                    </span>
                  )}
                </div>
              </a>
            );
          })}
        </div>
      )}

      {/* ── Empty: filters active but no results ── */}
      {!loading && filtered.length === 0 && displayArticles.length > 0 && (
        <div className="text-center py-8">
          <p className="text-sm" style={{ color: "var(--c-text2)" }}>{t("news.noMatch")}</p>
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
      {!loading && displayArticles.length === 0 && (
        <div className="text-center py-8">
          <p className="text-sm font-medium mb-1" style={{ color: "var(--c-text2)" }}>{t("news.failedTitle")}</p>
          <p className="text-xs mb-3" style={{ color: "var(--c-text3)" }}>
            {t("news.failedDetail", { sources: failedSources.join(", ") || "all" })}
          </p>
          <button onClick={() => setRefreshKey(k => k + 1)} className="text-xs cursor-pointer" style={{ color: "var(--c-accent)" }}>
            {t("news.tryAgain")}
          </button>
        </div>
      )}

      {/* ── Partial failure note ── */}
      {!loading && failedSources.length > 0 && displayArticles.length > 0 && (
        <p className="text-xs pt-1" style={{ color: "var(--c-text3)", borderTop: `1px solid var(--c-divider)` }}>
          {t(failedSources.length !== 1 ? "news.unreachableN" : "news.unreachable", { count: failedSources.length, sources: failedSources.join(", ") })}
        </p>
      )}
    </div>
  );
}
