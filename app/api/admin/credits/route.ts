/**
 * POST /api/admin/credits
 * Ações administrativas: editar créditos.
 * NOTA: role não pode ser alterado pela UI (apenas manualmente no SQL)
 * pra garantir que só o admin-mor tenha essa capacidade.
 *
 * Body: { userId, delta?: number, setTo?: number }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();
  if (profile?.role !== "admin") {
    return NextResponse.json({ error: "forbidden" }, { status: 403 });
  }

  const body = await req.json();
  const { userId, delta, setTo } = body;
  if (!userId) return NextResponse.json({ error: "userId required" }, { status: 400 });

  const admin = await createAdminClient();
  const update: Record<string, unknown> = {};

  if (typeof setTo === "number" && Number.isFinite(setTo)) {
    update.photo_credits = Math.max(0, Math.round(setTo));
  } else if (typeof delta === "number" && Number.isFinite(delta)) {
    const { data: p } = await admin
      .from("profiles")
      .select("photo_credits")
      .eq("id", userId)
      .single();
    update.photo_credits = Math.max(0, (p?.photo_credits ?? 0) + Math.round(delta));
  }

  if (Object.keys(update).length === 0) {
    return NextResponse.json({ error: "no changes" }, { status: 400 });
  }

  const { data: updated, error } = await admin
    .from("profiles")
    .update(update)
    .eq("id", userId)
    .select("photo_credits, role")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true, ...updated, credits: updated.photo_credits });
}
