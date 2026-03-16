import { NextResponse } from "next/server";

const BBC_RSS = "https://feeds.bbci.co.uk/news/rss.xml";

function text(xml: string, tag: string): string {
  // Matches both CDATA and plain text content for a given tag
  const m = xml.match(
    new RegExp(`<${tag}[^>]*><!\\[CDATA\\[([\\s\\S]*?)\\]\\]><\\/${tag}>|<${tag}[^>]*>([\\s\\S]*?)<\\/${tag}>`)
  );
  return (m ? (m[1] ?? m[2] ?? "") : "").trim();
}

function parseRSS(xml: string) {
  const items = [...xml.matchAll(/<item>([\s\S]*?)<\/item>/g)];
  return items.slice(0, 5).map(([, content]) => {
    // <link> in RSS sits between tags without wrapping — grab the raw text node
    const linkMatch =
      content.match(/<link>([^<]+)<\/link>/) ??
      content.match(/<link[^>]*\/>[\s\S]*?<link>([^<]+)<\/link>/);

    return {
      title: text(content, "title"),
      description: text(content, "description"),
      url: linkMatch?.[1]?.trim() ?? "",
      publishedAt: text(content, "pubDate"),
      source: { name: "BBC News" },
    };
  });
}

export async function GET() {
  try {
    const res = await fetch(BBC_RSS, {
      next: { revalidate: 1800 }, // cache 30 min
      headers: { "User-Agent": "today-dashboard/1.0" },
    });

    if (!res.ok) throw new Error(`BBC RSS returned ${res.status}`);

    const xml = await res.text();
    const articles = parseRSS(xml);

    return NextResponse.json({ articles });
  } catch (err) {
    return NextResponse.json({ error: String(err) }, { status: 500 });
  }
}
