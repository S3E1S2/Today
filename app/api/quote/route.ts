export async function GET() {
  try {
    const res = await fetch("https://zenquotes.io/api/today", {
      next: { revalidate: 86400 },
    });
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    return Response.json(data[0] ?? null);
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
