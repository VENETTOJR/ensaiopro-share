/**
 * GET / POST /api/admin/settings/usd-brl
 *
 * Lê / atualiza `system_settings.usd_brl_rate` (Story 03 — dev notes,
 * PRD §2.3). Default 5.10.
 *
 * GET → { rate: number, updated_at: string | null, fallback: boolean }
 * POST { rate: number } → { ok: true, rate, updated_at }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin, type AdminAuthOk } from "@/lib/admin/auth";
import { FALLBACK_USD_BRL_RATE } from "@/lib/admin/cost";

export const runtime = "nodejs";

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("system_settings")
    .select("value, updated_at")
    .eq("key", "usd_brl_rate")
    .maybeSingle();

  if (error) {
    // tabela ainda não existe (migration não aplicada)
    return NextResponse.json({
      rate: FALLBACK_USD_BRL_RATE,
      updated_at: null,
      fallback: true,
      error: error.message,
    });
  }

  if (!data) {
    return NextResponse.json({
      rate: FALLBACK_USD_BRL_RATE,
      updated_at: null,
      fallback: true,
    });
  }

  const v = data.value;
  const n = typeof v === "number" ? v : Number(v);
  return NextResponse.json({
    rate: Number.isFinite(n) && n > 0 ? n : FALLBACK_USD_BRL_RATE,
    updated_at: data.updated_at,
    fallback: false,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const okAuth = auth as AdminAuthOk;

  const body = await req.json().catch(() => null) as { rate?: unknown } | null;
  const rate = Number(body?.rate);
  if (!Number.isFinite(rate) || rate <= 0 || rate > 100) {
    return NextResponse.json(
      { error: "rate inválido — esperado número > 0 e ≤ 100" },
      { status: 400 },
    );
  }

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("system_settings")
    .upsert(
      {
        key: "usd_brl_rate",
        value: rate,
        updated_by: okAuth.userId,
      },
      { onConflict: "key" },
    )
    .select("value, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const v = data?.value;
  const n = typeof v === "number" ? v : Number(v);
  return NextResponse.json({
    ok: true,
    rate: Number.isFinite(n) ? n : rate,
    updated_at: data?.updated_at,
  });
}
