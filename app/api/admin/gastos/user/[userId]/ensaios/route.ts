/**
 * GET /api/admin/gastos/user/:userId/ensaios
 *
 * Drill-down nível 2: lista ensaios de um user com custo agregado por ensaio.
 * Story 03 — AC4.4, AC4.9.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import { resolvePeriod, type Period } from "@/lib/admin/cost";

export const runtime = "nodejs";

export async function GET(
  req: NextRequest,
  ctx: { params: Promise<{ userId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { userId } = await ctx.params;
  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ?? "30d") as Period;
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const range = resolvePeriod(period, from, to);

  const admin = await createAdminClient();

  // Lista ensaios do user
  const { data: ensaios, error: ensErr } = await admin
    .from("ensaios")
    .select(
      "id, name, status, total_prompts, total_generated, total_failed, created_at, completed_at, ensaio_types(name, slug)",
    )
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(500);

  if (ensErr) return NextResponse.json({ error: ensErr.message }, { status: 500 });

  const ensaioIds = (ensaios ?? []).map((e) => e.id);
  if (ensaioIds.length === 0) {
    return NextResponse.json({ user_id: userId, ensaios: [] });
  }

  // Agrega custo por ensaio
  let fotosQ = admin
    .from("fotos_geradas")
    .select(
      "ensaio_id, status, cost_cents, cost_cents_nano, cost_cents_swap, cost_cents_enhance, swap_status",
    )
    .in("ensaio_id", ensaioIds);
  if (range.from) fotosQ = fotosQ.gte("created_at", range.from.toISOString());
  if (range.to) fotosQ = fotosQ.lte("created_at", range.to.toISOString());

  const { data: fotos } = await fotosQ;

  type Agg = {
    fotos_ok: number;
    fotos_failed: number;
    custo_total_cents: number;
    custo_nano_cents: number;
    custo_swap_cents: number;
    custo_enhance_cents: number;
    has_swap: boolean;
  };
  const aggBy = new Map<string, Agg>();
  for (const f of fotos ?? []) {
    let a = aggBy.get(f.ensaio_id);
    if (!a) {
      a = {
        fotos_ok: 0,
        fotos_failed: 0,
        custo_total_cents: 0,
        custo_nano_cents: 0,
        custo_swap_cents: 0,
        custo_enhance_cents: 0,
        has_swap: false,
      };
      aggBy.set(f.ensaio_id, a);
    }
    if (f.status === "completed") {
      a.fotos_ok += 1;
      a.custo_total_cents += f.cost_cents ?? 0;
      a.custo_nano_cents += f.cost_cents_nano ?? 0;
      a.custo_swap_cents += f.cost_cents_swap ?? 0;
      a.custo_enhance_cents += f.cost_cents_enhance ?? 0;
    } else if (f.status === "failed") {
      a.fotos_failed += 1;
    }
    if (f.swap_status && !["skipped", "legacy"].includes(f.swap_status)) {
      a.has_swap = true;
    }
  }

  const out = (ensaios ?? []).map((e) => {
    const a = aggBy.get(e.id);
    const tipo = e.ensaio_types as { name?: string; slug?: string } | null;
    return {
      id: e.id,
      name: e.name,
      status: e.status,
      total_prompts: e.total_prompts,
      total_generated: e.total_generated,
      total_failed: e.total_failed,
      created_at: e.created_at,
      completed_at: e.completed_at,
      ensaio_type: tipo?.name ?? null,
      ensaio_type_slug: tipo?.slug ?? null,
      fotos_ok: a?.fotos_ok ?? 0,
      fotos_failed: a?.fotos_failed ?? 0,
      custo_total_cents: a?.custo_total_cents ?? 0,
      custo_nano_cents: a?.custo_nano_cents ?? 0,
      custo_swap_cents: a?.custo_swap_cents ?? 0,
      custo_enhance_cents: a?.custo_enhance_cents ?? 0,
      has_swap: a?.has_swap ?? false,
    };
  });

  return NextResponse.json({ user_id: userId, ensaios: out });
}
