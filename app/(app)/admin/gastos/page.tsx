/**
 * /admin/gastos — Dashboard admin de custos reais (Story 03).
 *
 * AC4.1 (rota protegida via app/(app)/admin/layout.tsx),
 * AC4.2 (KPIs), AC4.3 (tabela paginada), AC4.5 (filtros), AC4.6 (export CSV
 * via componente client), AC4.10 (apenas tela admin expõe R$/USD).
 *
 * Server component: busca tudo via service-role e passa props pra client
 * components (drill-down lazy via fetch).
 */

import type { Metadata } from "next";
import { createAdminClient } from "@/lib/supabase/server";
import { resolvePeriod, type Period, FALLBACK_USD_BRL_RATE } from "@/lib/admin/cost";
import { getUsdBrlRate } from "@/lib/admin/cost-server";
import {
  isFaceSwapEnabled,
  isFaceSwapSoloEnabled,
} from "@/lib/admin/face-swap-setting";
import { GastosKPIs } from "@/components/admin/GastosKPIs";
import { GastosFilters } from "@/components/admin/GastosFilters";
import { GastosTable, type UserRow } from "@/components/admin/GastosTable";
import { UsdBrlEditor } from "@/components/admin/UsdBrlEditor";
import { FaceSwapToggle } from "@/components/admin/FaceSwapToggle";
import { FaceSwapSoloToggle } from "@/components/admin/FaceSwapSoloToggle";
import { FluxPulidToggle } from "@/components/admin/FluxPulidToggle";
import { isFluxPulidEnabled } from "@/lib/admin/flux-pulid-setting";
import { RunwareToggle } from "@/components/admin/RunwareToggle";
import { isRunwareEnabled } from "@/lib/admin/runware-setting";
import { RefsQualityHistogram } from "@/components/admin/RefsQualityHistogram";

export const metadata: Metadata = {
  title: "Gastos · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

interface SearchParams {
  period?: string;
  from?: string;
  to?: string;
  ensaio_type_id?: string;
  with_swap?: string;
  page?: string;
  page_size?: string;
  sort?: string;
  tab?: string;
}

const PAGE_SIZE_DEFAULT = 50;

export default async function AdminGastosPage({
  searchParams,
}: {
  searchParams: Promise<SearchParams>;
}) {
  const sp = await searchParams;
  const period = (sp.period ?? "30d") as Period;
  const range = resolvePeriod(period, sp.from, sp.to);
  const page = Math.max(1, parseInt(sp.page ?? "1", 10) || 1);
  const pageSize = Math.min(
    200,
    Math.max(1, parseInt(sp.page_size ?? String(PAGE_SIZE_DEFAULT), 10) || PAGE_SIZE_DEFAULT),
  );
  const tab = sp.tab === "refs" ? "refs" : "gastos";

  const admin = await createAdminClient();
  const rate = await getUsdBrlRate();
  const fallbackRate = rate === FALLBACK_USD_BRL_RATE;
  const faceSwapEnabled = await isFaceSwapEnabled();
  const faceSwapSoloEnabled = await isFaceSwapSoloEnabled();
  const fluxPulidEnabled = await isFluxPulidEnabled();
  const runwareEnabled = await isRunwareEnabled();

  // Tipos de ensaio pra dropdown de filtro
  const { data: ensaioTypes } = await admin
    .from("ensaio_types")
    .select("id, name")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  // ---------- Carrega gastos no range (server-side; mesma lógica do API) ----
  let fotosQ = admin
    .from("fotos_geradas")
    .select(
      "user_id, ensaio_id, cost_cents, cost_cents_nano, cost_cents_swap, cost_cents_enhance, swap_status",
    )
    .eq("status", "completed");
  if (range.from) fotosQ = fotosQ.gte("created_at", range.from.toISOString());
  if (range.to) fotosQ = fotosQ.lte("created_at", range.to.toISOString());
  if (sp.with_swap === "true") fotosQ = fotosQ.neq("swap_status", "skipped");
  if (sp.with_swap === "false") fotosQ = fotosQ.eq("swap_status", "skipped");

  const { data: fotosRaw, error: fotosErr } = await fotosQ;

  // Migration 0008 ainda não aplicada → fallback pra cost_cents global
  let fotos: Array<{
    user_id: string;
    ensaio_id: string;
    cost_cents: number | null;
    cost_cents_nano: number | null;
    cost_cents_swap: number | null;
    cost_cents_enhance: number | null;
    swap_status: string | null;
  }> = [];
  let migrationPending = false;

  if (fotosErr && /cost_cents_(nano|swap|enhance)/.test(fotosErr.message)) {
    migrationPending = true;
    let legacyQ = admin
      .from("fotos_geradas")
      .select("user_id, ensaio_id, cost_cents")
      .eq("status", "completed");
    if (range.from) legacyQ = legacyQ.gte("created_at", range.from.toISOString());
    if (range.to) legacyQ = legacyQ.lte("created_at", range.to.toISOString());
    const legacy = await legacyQ;
    fotos = (legacy.data ?? []).map((f) => ({
      user_id: f.user_id,
      ensaio_id: f.ensaio_id,
      cost_cents: f.cost_cents ?? 0,
      cost_cents_nano: f.cost_cents ?? 0,
      cost_cents_swap: 0,
      cost_cents_enhance: 0,
      swap_status: null,
    }));
  } else if (!fotosErr) {
    fotos = fotosRaw ?? [];
  }

  // Filtro por tipo
  if (sp.ensaio_type_id) {
    const { data: ens } = await admin
      .from("ensaios")
      .select("id")
      .eq("ensaio_type_id", sp.ensaio_type_id);
    const allowed = new Set((ens ?? []).map((e) => e.id));
    fotos = fotos.filter((f) => allowed.has(f.ensaio_id));
  }

  // Compras pagas no período
  let comprasQ = admin
    .from("compras")
    .select("user_id, valor_cents, quantidade")
    .eq("status", "paid");
  if (range.from) comprasQ = comprasQ.gte("paid_at", range.from.toISOString());
  if (range.to) comprasQ = comprasQ.lte("paid_at", range.to.toISOString());
  const { data: compras } = await comprasQ;

  // Profiles
  const { data: profiles } = await admin
    .from("profiles")
    .select("id, email, name");

  // Aggregação
  const byUser = new Map<string, UserRow>();
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
  for (const [uid, s] of ensaiosByUser.entries()) {
    const u = byUser.get(uid);
    if (u) u.total_ensaios = s.size;
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
  rows.sort((a, b) => b.custo_total_cents - a.custo_total_cents);

  const totals = rows.reduce(
    (acc, r) => {
      acc.custo += r.custo_total_cents;
      acc.nano += r.custo_nano_cents;
      acc.swap += r.custo_swap_cents;
      acc.enhance += r.custo_enhance_cents;
      acc.receita += r.receita_total_cents;
      acc.fotos += r.fotos_ok;
      return acc;
    },
    { custo: 0, nano: 0, swap: 0, enhance: 0, receita: 0, fotos: 0 },
  );

  const totalRows = rows.length;
  const totalPages = Math.max(1, Math.ceil(totalRows / pageSize));
  const start = (page - 1) * pageSize;
  rows = rows.slice(start, start + pageSize);
  const top = totalRows > 0 ? Array.from(byUser.values()).sort((a, b) => b.custo_total_cents - a.custo_total_cents)[0] : null;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 fade-in">
      <h1 className="text-3xl font-bold mb-1">Gastos</h1>
      <p className="text-[var(--muted)] mb-6">
        Visibilidade de custo real (R$) por usuário, ensaio e foto.
        {migrationPending && (
          <span className="ml-2 text-[var(--warning)]">
            ⚠ Migration <code>0008_cost_breakdown</code> ainda não aplicada — exibindo custos no formato legacy.
          </span>
        )}
      </p>

      <UsdBrlEditor initialRate={rate} fallback={fallbackRate} />
      <FaceSwapToggle initialEnabled={faceSwapEnabled} fallback={false} />
      <FaceSwapSoloToggle
        initialEnabled={faceSwapSoloEnabled}
        fallback={false}
        masterEnabled={faceSwapEnabled}
      />
      <FluxPulidToggle initialEnabled={fluxPulidEnabled} fallback={false} />
      <RunwareToggle initialEnabled={runwareEnabled} fallback={false} />

      <Tabs current={tab} />

      {tab === "gastos" && (
        <>
          <GastosFilters
            ensaioTypes={ensaioTypes ?? []}
            rate={rate}
          />

          <GastosKPIs
            custo_total_cents={totals.custo}
            receita_total_cents={totals.receita}
            custo_nano_cents={totals.nano}
            custo_swap_cents={totals.swap}
            custo_enhance_cents={totals.enhance}
            fotos={totals.fotos}
            topUserEmail={top?.email ?? null}
            topUserCustoCents={top?.custo_total_cents}
            rangeLabel={range.label}
          />

          <GastosTable
            rows={rows}
            page={page}
            totalPages={totalPages}
            totalRows={totalRows}
            pageSize={pageSize}
          />
        </>
      )}

      {tab === "refs" && <RefsQualityHistogram />}
    </div>
  );
}

function Tabs({ current }: { current: "gastos" | "refs" }) {
  return (
    <div className="border-b border-[var(--border)] mb-4 flex gap-1">
      <TabLink href="?tab=gastos" active={current === "gastos"} label="Gastos" />
      <TabLink href="?tab=refs" active={current === "refs"} label="Qualidade de refs" />
    </div>
  );
}

function TabLink({
  href,
  active,
  label,
}: {
  href: string;
  active: boolean;
  label: string;
}) {
  return (
    <a
      href={href}
      className={
        "px-3 py-2 text-sm font-medium border-b-2 -mb-[1px] transition " +
        (active
          ? "border-[var(--primary)] text-[var(--foreground)]"
          : "border-transparent text-[var(--muted)] hover:text-[var(--foreground)]")
      }
    >
      {label}
    </a>
  );
}
