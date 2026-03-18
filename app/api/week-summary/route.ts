import Anthropic from "@anthropic-ai/sdk";

interface StatsPayload {
  habitPct: number;
  avgSleep: number | null;
  bestStreak: number;
  moodAvg: number | null;
}

export async function POST(req: Request) {
  if (!process.env.ANTHROPIC_API_KEY) {
    return Response.json({ sentence: null }, { status: 200 });
  }
  try {
    const stats: StatsPayload = await req.json();
    const parts: string[] = [];
    if (stats.habitPct !== null) parts.push(`habit completion: ${stats.habitPct}%`);
    if (stats.avgSleep !== null) parts.push(`average sleep: ${stats.avgSleep}h`);
    if (stats.bestStreak > 0)   parts.push(`best streak: ${stats.bestStreak} days`);
    if (stats.moodAvg !== null) parts.push(`mood average: ${stats.moodAvg.toFixed(1)}/5`);

    const client = new Anthropic();
    const msg = await client.messages.create({
      model: "claude-haiku-4-5-20251001",
      max_tokens: 80,
      messages: [{
        role: "user",
        content: `Write one warm, encouraging sentence (max 20 words) summarizing this person's week. Be specific, not generic. Stats: ${parts.join(", ")}.`,
      }],
    });
    const text = (msg.content[0] as { type: string; text: string }).text ?? null;
    return Response.json({ sentence: text });
  } catch (err) {
    return Response.json({ error: String(err) }, { status: 500 });
  }
}
