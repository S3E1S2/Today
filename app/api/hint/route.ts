import { createClient } from "@supabase/supabase-js";
import { NextRequest } from "next/server";

export async function POST(req: NextRequest) {
  try {
    const { email } = await req.json();
    if (!email || typeof email !== "string") {
      return Response.json({ hint: null }, { status: 200 });
    }

    const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;
    if (!serviceKey) {
      return Response.json({ hint: null }, { status: 200 });
    }

    const admin = createClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      serviceKey
    );

    const normalizedEmail = email.trim().toLowerCase();

    // Fast path: query profiles by email column (set during signup)
    const { data: byEmail } = await admin
      .from("profiles")
      .select("password_hint")
      .eq("email", normalizedEmail)
      .maybeSingle();

    if (byEmail !== null) {
      return Response.json({ hint: byEmail?.password_hint ?? null }, { status: 200 });
    }

    // Fallback: look up user id via auth admin, then query profiles by id
    const { data: { users } } = await admin.auth.admin.listUsers({ perPage: 1000 });
    const match = users.find(u => u.email?.toLowerCase() === normalizedEmail);
    if (!match) return Response.json({ hint: null }, { status: 200 });

    const { data } = await admin
      .from("profiles")
      .select("password_hint")
      .eq("id", match.id)
      .maybeSingle();

    return Response.json({ hint: data?.password_hint ?? null }, { status: 200 });
  } catch {
    return Response.json({ hint: null }, { status: 200 });
  }
}
