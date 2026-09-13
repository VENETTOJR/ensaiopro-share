/**
 * GET /api/admin/gastos
 *
 * Lista de gastos por usuário (Story 03 — AC4.3, AC4.5, AC4.9).
 *
 * Query string:
 *   period:    7d | 30d | 90d | all                       (default 30d)
 *   from / to: YYYY-MM-DD                                  (sobrescreve period)
 *   ensaio_type_id: uuid                                   (filter)
 *   with_swap: 'true' | 'false' | undefined                (filter)
 *   page:      número (1-based)                            (default 1)
 *   page_size: 50 (default), max 200
 *   sort:      'custo' | 'receita' | 'fotos' | 'margem'    (default custo)
 *
 * Resposta: { rows, page, total_pages, totals }.
 *
 * Autorização: requireAdmin().
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import { resolvePeriod, type Period } from "@/lib/admin/cost";

export const runtime = "nodejs";

interface UserAgg {
  user_id: string;
  email: string | null;
  name: string | null;
  fotos_ok: number;
  custo_total_cents: number;
  custo_nano_cents: number;
  custo_swap_cents: number;
  custo_enhance_cents: number;
  receita_total_cents: number;
  creditos_comprados: number;
  total_ensaios: number;
}

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ?? "30d") as Period;
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const ensaioTypeId = url.searchParams.get("ensaio_type_id");
  const withSwapParam = url.searchParams.get("with_swap");
  const page = Math.max(1, parseInt(url.searchParams.get("page") ?? "1", 10) || 1);
  const pageSize = Math.min(
    200,
    Math.max(1, parseInt(url.searchParams.get("page_size") ?? "50", 10) || 50),
  );
  const sort = (url.searchParams.get("sort") ?? "custo") as
    | "custo"
    | "receita"
    | "fotos"
    | "margem";

  const range = resolvePeriod(period, from, to);
  const admin = await createAdminClient();

  // ---------- 1. Fotos no range ----------
  let fotosQ = admin
    .from("fotos_geradas")
    .select(
      "user_id, ensaio_id, cost_cents, cost_cents_nano, cost_cents_swap, cost_cents_enhance, swap_status",
    )
    .eq("status", "completed");
  if (range.from) fotosQ = fotosQ.gte("created_at", range.from.toISOString());
  if (range.to) fotosQ = fotosQ.lte("created_at", range.to.toISOString());
  if (withSwapParam === "true") fotosQ = fotosQ.neq("swap_status", "skipped");
  if (withSwapParam === "false") fotosQ = fotosQ.eq("swap_status", "skipped");

  const { data: fotosRaw, error: fotosErr } = await fotosQ;
  if (fotosErr) {
    return NextResponse.json({ error: fotosErr.message }, { status: 500 });
  }

  // Filtro por ensaio_type_id (carrega ensaios primeiro)
  let allowedEnsaioIds: Set<string> | null = null;
  if (ensaioTypeId) {
    const { data: ens } = await admin
      .from("ensaios")
      .select("id")
      .eq("ensaio_type_id", ensaioTypeId);
    allowedEnsaioIds = new Set((ens ?? []).map((e) => e.id));
  }

  type FotoRow = {
    user_id: string;
    ensaio_id: string;
    cost_cents: number | null;
    cost_cents_nano: number | null;
    cost_cents_swap: number | null;
    cost_cents_enhance: number | null;
    swap_status: string | null;
  };
  const fotos: FotoRow[] = (fotosRaw ?? []).filter((f) =>
    allowedEnsaioIds ? allowedEnsaioIds.has(f.ensaio_id) : true,
  );

  // ---------- 2. Compras no range ----------
  let comprasQ = admin
    .from("compras")
    .select("user_id, valor_cents, quantidade")
    .eq("status", "paid");
  if (range.from) comprasQ = comprasQ.gte("paid_at", range.from.toISOString());
  if (range.to) comprasQ = comprasQ.lte("paid_at", range.to.toISOString());

  const { data: compras, error: comprasErr } = await comprasQ;
  if (comprasErr) {
    return NextResponse.json({ error: comprasErr.message }, { status: 500 });
  }

  // ---------- 3. Profiles + agg ----------
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, name");

  const byUser = new Map<string, UserAgg>();
  for (const p of profiles ?? []) {
    byUser.set(p.id, {
      user_id: p.id,
      email: p.email,
      name: p.name,
      fotos_ok: 0,
      custo_total_cents: 0,
      custo_nano_cents: 0,
      custo_swap_cents: 0,
      custo_enhance_cents: 0,
      receita_total_cents: 0,
      creditos_comprados: 0,
      total_ensaios: 0,
    });
  }

  const ensaiosByUser = new Map<string, Set<string>>();
  for (const f of fotos) {
    const u = byUser.get(f.user_id);
    if (!u) continue;
    u.fotos_ok += 1;
    u.custo_total_cents += f.cost_cents ?? 0;
    u.custo_nano_cents += f.cost_cents_nano ?? 0;
    u.custo_swap_cents += f.cost_cents_swap ?? 0;
    u.custo_enhance_cents += f.cost_cents_enhance ?? 0;
    let s = ensaiosByUser.get(f.user_id);
    if (!s) {
      s = new Set();
      ensaiosByUser.set(f.user_id, s);
    }
    s.add(f.ensaio_id);
  }
  for (const [uid, set] of ensaiosByUser.entries()) {
    const u = byUser.get(uid);
    if (u) u.total_ensaios = set.size;
  }
  for (const c of compras ?? []) {
    const u = byUser.get(c.user_id);
    if (!u) continue;
    u.receita_total_cents += c.valor_cents ?? 0;
    u.creditos_comprados += c.quantidade ?? 0;
  }

  let rows = Array.from(byUser.values()).filter(
    (u) =>
      u.fotos_ok > 0 || u.custo_total_cents > 0 || u.receita_total_cents > 0,
  );

  rows.sort((a, b) => {
    switch (sort) {
      case "receita":
        return b.receita_total_cents - a.receita_total_cents;
      case "fotos":
        return b.fotos_ok - a.fotos_ok;
      case "margem":
        return (
          b.receita_total_cents - b.custo_total_cents -
          (a.receita_total_cents - a.custo_total_cents)
        );
      case "custo":
      default:
        return b.custo_total_cents - a.custo_total_cents;
    }
  });

  // ---------- 4. Totals + paginação ----------
  const totals = rows.reduce(
    (acc, r) => {
      acc.fotos += r.fotos_ok;
      acc.custo_total_cents += r.custo_total_cents;
      acc.custo_nano_cents += r.custo_nano_cents;
      acc.custo_swap_cents += r.custo_swap_cents;
      acc.custo_enhance_cents += r.custo_enhance_cents;
      acc.receita_total_cents += r.receita_total_cents;
      acc.creditos_comprados += r.creditos_comprados;
      return acc;
    },
    {
      fotos: 0,
      custo_total_cents: 0,
      custo_nano_cents: 0,
      custo_swap_cents: 0,
      custo_enhance_cents: 0,
      receita_total_cents: 0,
      creditos_comprados: 0,
    },
  );

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const start = (page - 1) * pageSize;
  rows = rows.slice(start, start + pageSize);

  return NextResponse.json({
    range: { from: range.from?.toISOString() ?? null, to: range.to?.toISOString() ?? null, label: range.label },
    page,
    page_size: pageSize,
    total_rows: totalRows,
    total_pages: totalPages,
    sort,
    totals,
    rows,
  });
}
