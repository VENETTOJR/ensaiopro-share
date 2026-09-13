/**
 * GET /api/admin/gastos/export
 *
 * Export CSV streaming dos gastos por usuário (Story 03 — AC4.6, AC4.9).
 * Usa Web Streams API pra evitar OOM em base grande.
 */

import { type NextRequest, NextResponse } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import { resolvePeriod, type Period } from "@/lib/admin/cost";

export const runtime = "nodejs";

function csvField(v: unknown): string {
  const s = v == null ? "" : String(v);
  if (s.includes(",") || s.includes('"') || s.includes("\n") || s.includes("\r")) {
    return `"${s.replace(/"/g, '""')}"`;
  }
  return s;
}

const HEADER = [
  "user_id",
  "email",
  "name",
  "fotos_ok",
  "custo_total_cents",
  "custo_nano_cents",
  "custo_swap_cents",
  "custo_enhance_cents",
  "receita_total_cents",
  "creditos_comprados",
  "margem_cents",
  "margem_pct",
];

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const period = (url.searchParams.get("period") ?? "30d") as Period;
  const from = url.searchParams.get("from") ?? undefined;
  const to = url.searchParams.get("to") ?? undefined;
  const ensaioTypeId = url.searchParams.get("ensaio_type_id");
  const withSwapParam = url.searchParams.get("with_swap");
  const range = resolvePeriod(period, from, to);

  const admin = await createAdminClient();

  // Mesma lógica do GET /admin/gastos (sem paginação).
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

  let allowedEnsaioIds: Set<string> | null = null;
  if (ensaioTypeId) {
    const { data: ens } = await admin
      .from("ensaios")
      .select("id")
      .eq("ensaio_type_id", ensaioTypeId);
    allowedEnsaioIds = new Set((ens ?? []).map((e) => e.id));
  }

  const fotos = (fotosRaw ?? []).filter((f) =>
    allowedEnsaioIds ? allowedEnsaioIds.has(f.ensaio_id) : true,
  );

  let comprasQ = admin
    .from("compras")
    .select("user_id, valor_cents, quantidade")
    .eq("status", "paid");
  if (range.from) comprasQ = comprasQ.gte("paid_at", range.from.toISOString());
  if (range.to) comprasQ = comprasQ.lte("paid_at", range.to.toISOString());

  const { data: compras } = await comprasQ;

  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, name");

  type Agg = {
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
  };
  const byUser = new Map<string, Agg>();
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
    });
  }
  for (const f of fotos) {
    const u = byUser.get(f.user_id);
    if (!u) continue;
    u.fotos_ok += 1;
    u.custo_total_cents += f.cost_cents ?? 0;
    u.custo_nano_cents += f.cost_cents_nano ?? 0;
    u.custo_swap_cents += f.cost_cents_swap ?? 0;
    u.custo_enhance_cents += f.cost_cents_enhance ?? 0;
  }
  for (const c of compras ?? []) {
    const u = byUser.get(c.user_id);
    if (!u) continue;
    u.receita_total_cents += c.valor_cents ?? 0;
    u.creditos_comprados += c.quantidade ?? 0;
  }

  const rows = Array.from(byUser.values())
    .filter((u) => u.fotos_ok > 0 || u.receita_total_cents > 0)
    .sort((a, b) => b.custo_total_cents - a.custo_total_cents);

  // Streaming response (Web Streams)
  const encoder = new TextEncoder();
  const stream = new ReadableStream<Uint8Array>({
    start(controller) {
      controller.enqueue(encoder.encode(HEADER.join(",") + "\n"));
      for (const r of rows) {
        const margemCents = r.receita_total_cents - r.custo_total_cents;
        const margemPct =
          r.receita_total_cents > 0
            ? ((margemCents / r.receita_total_cents) * 100).toFixed(2)
            : "";
        const line = [
          r.user_id,
          r.email ?? "",
          r.name ?? "",
          r.fotos_ok,
          r.custo_total_cents,
          r.custo_nano_cents,
          r.custo_swap_cents,
          r.custo_enhance_cents,
          r.receita_total_cents,
          r.creditos_comprados,
          margemCents,
          margemPct,
        ]
          .map(csvField)
          .join(",");
        controller.enqueue(encoder.encode(line + "\n"));
      }
      controller.close();
    },
  });

  const today = new Date().toISOString().slice(0, 10);
  const filename = `gastos-${period}-${today}.csv`;

  return new Response(stream, {
    status: 200,
    headers: {
      "Content-Type": "text/csv; charset=utf-8",
      "Content-Disposition": `attachment; filename="${filename}"`,
      "Cache-Control": "no-store",
    },
  });
}
