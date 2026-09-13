/**
 * Helper de autorização admin (Story 03 — AC4.9).
 *
 * Uso obrigatório em toda rota /api/admin/* — não confiar só em RLS.
 * Retorna `{ ok: true, userId }` se admin, ou um NextResponse 401/403 já pronto.
 */

import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export type AdminAuthOk = { ok: true; userId: string };
export type AdminAuthFail = { ok: false; response: NextResponse };
export type AdminAuthResult = AdminAuthOk | AdminAuthFail;

export async function requireAdmin(): Promise<AdminAuthResult> {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) {
    return {
      ok: false,
      response: NextResponse.json({ error: "unauthorized" }, { status: 401 }),
    };
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") {
    return {
      ok: false,
      response: NextResponse.json({ error: "forbidden" }, { status: 403 }),
    };
  }

  return { ok: true, userId: user.id };
}
