import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { userId, email, hint } = await req.json();
    if (!userId || !email) {
      return Response.json({ ok: false }, { status: 400 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return Response.json({ ok: false }, { status: 500 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    );

    const row: Record<string, string> = { id: userId, email: email.trim().toLowerCase() };
    if (hint?.trim()) row.password_hint = hint.trim();

    const { error } = await admin.from("profiles").upsert(row);
    if (error) {
      console.error("[save-profile]", error);
      return Response.json({ ok: false }, { status: 500 });
    }

    return Response.json({ ok: true });
  } catch (err) {
    console.error("[save-profile] unexpected:", err);
    return Response.json({ ok: false }, { status: 500 });
  }
}
