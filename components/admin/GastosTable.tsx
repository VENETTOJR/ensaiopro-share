"use client";

/**
 * GastosTable — tabela paginada de gastos por usuário (Story 03 — AC4.3).
 *
 * Click na linha → abre drilldown (GastoDrilldown) inline.
 */

import { useState } from "react";
import { useRouter, usePathname, useSearchParams } from "next/navigation";
import { ChevronRight, ChevronDown, Loader2 } from "lucide-react";
import { formatBRLcents, marginPercent } from "@/lib/admin/cost";
import { GastoDrilldown } from "./GastoDrilldown";

export interface UserRow {
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

export function GastosTable({
  rows,
  page,
  totalPages,
  totalRows,
  pageSize,
}: {
  rows: UserRow[];
  page: number;
  totalPages: number;
  totalRows: number;
  pageSize: number;
}) {
  const [expanded, setExpanded] = useState<string | null>(null);
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();

  function gotoPage(p: number) {
    const next = new URLSearchParams(sp.toString());
    next.set("page", String(p));
    router.push(`${pathname}?${next.toString()}`);
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--background-elev-2)]">
              <th className="px-3 py-3 w-8"></th>
              <th className="text-left px-3 py-3 font-medium text-[var(--muted)]">Usuário</th>
              <th className="text-right px-3 py-3 font-medium text-[var(--muted)]">Ensaios</th>
              <th className="text-right px-3 py-3 font-medium text-[var(--muted)]">Fotos</th>
              <th className="text-right px-3 py-3 font-medium text-[var(--muted)]">Custo</th>
              <th className="text-right px-3 py-3 font-medium text-[var(--muted)] hidden lg:table-cell">Nano</th>
              <th className="text-right px-3 py-3 font-medium text-[var(--muted)] hidden lg:table-cell">Swap</th>
              <th className="text-right px-3 py-3 font-medium text-[var(--muted)] hidden lg:table-cell">Enhance</th>
              <th className="text-right px-3 py-3 font-medium text-[var(--muted)]">Créditos</th>
              <th className="text-right px-3 py-3 font-medium text-[var(--muted)]">Receita</th>
              <th className="text-right px-3 py-3 font-medium text-[var(--muted)]">Margem</th>
            </tr>
          </thead>
          <tbody>
            {rows.length === 0 && (
              <tr>
                <td colSpan={11} className="px-4 py-8 text-center text-[var(--muted)]">
                  Nenhum gasto no período selecionado.
                </td>
              </tr>
            )}
            {rows.map((r) => {
              const margemCents = r.receita_total_cents - r.custo_total_cents;
              const margemPct = marginPercent(r.receita_total_cents, r.custo_total_cents);
              const isOpen = expanded === r.user_id;
              return (
                <>
                  <tr
                    key={r.user_id}
                    className={
                      "border-b border-[var(--border)] cursor-pointer hover:bg-[var(--background-elev-2)]/30 " +
                      (isOpen ? "bg-[var(--background-elev-2)]/40" : "")
                    }
                    onClick={() => setExpanded(isOpen ? null : r.user_id)}
                  >
                    <td className="px-3 py-3">
                      {isOpen ? (
                        <ChevronDown className="w-4 h-4 text-[var(--muted)]" />
                      ) : (
                        <ChevronRight className="w-4 h-4 text-[var(--muted)]" />
                      )}
                    </td>
                    <td className="px-3 py-3">
                      <div className="font-medium truncate max-w-[220px]">
                        {r.name ?? "—"}
                      </div>
                      <div className="text-xs text-[var(--muted)] truncate max-w-[220px]">
                        {r.email ?? "(sem email)"}
                      </div>
                    </td>
                    <td className="px-3 py-3 text-right">{r.total_ensaios}</td>
                    <td className="px-3 py-3 text-right font-medium">{r.fotos_ok}</td>
                    <td className="px-3 py-3 text-right font-bold text-[var(--warning)]">
                      {formatBRLcents(r.custo_total_cents)}
                    </td>
                    <td className="px-3 py-3 text-right hidden lg:table-cell text-[var(--muted-strong)]">
                      {formatBRLcents(r.custo_nano_cents)}
                    </td>
                    <td className="px-3 py-3 text-right hidden lg:table-cell text-[var(--muted-strong)]">
                      {formatBRLcents(r.custo_swap_cents)}
                    </td>
                    <td className="px-3 py-3 text-right hidden lg:table-cell text-[var(--muted-strong)]">
                      {formatBRLcents(r.custo_enhance_cents)}
                    </td>
                    <td className="px-3 py-3 text-right">{r.creditos_comprados}</td>
                    <td className="px-3 py-3 text-right font-bold text-[var(--success)]">
                      {formatBRLcents(r.receita_total_cents)}
                    </td>
                    <td className="px-3 py-3 text-right">
                      {margemPct === null ? (
                        <span className="text-[var(--muted)]">—</span>
                      ) : (
                        <span
                          className={
                            margemCents >= 0
                              ? "text-[var(--success)] font-semibold"
                              : "text-[var(--danger)] font-semibold"
                          }
                        >
                          {formatBRLcents(margemCents)}
                          <span className="block text-xs font-normal opacity-70">
                            {margemPct.toFixed(0)}%
                          </span>
                        </span>
                      )}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr className="border-b border-[var(--border)] bg-[var(--background)]/50">
                      <td colSpan={11} className="p-0">
                        <GastoDrilldown userId={r.user_id} email={r.email} />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div className="flex items-center justify-between px-4 py-3 border-t border-[var(--border)] bg-[var(--background-elev-2)]/50">
          <div className="text-xs text-[var(--muted)]">
            Página {page} de {totalPages} · {totalRows} usuários · {pageSize}/página
          </div>
          <div className="flex gap-1">
            <button
              type="button"
              disabled={page <= 1}
              onClick={() => gotoPage(page - 1)}
              className="btn btn-secondary btn-sm"
            >
              Anterior
            </button>
            <button
              type="button"
              disabled={page >= totalPages}
              onClick={() => gotoPage(page + 1)}
              className="btn btn-secondary btn-sm"
            >
              Próxima
            </button>
          </div>
        </div>
      )}
    </div>
  );
}

// shim para reaproveitar Loader2 sem imports não usados em CI
void Loader2;
