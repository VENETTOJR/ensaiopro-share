"use client";

/**
 * GastosFilters — barra de filtros do dashboard /admin/gastos.
 * Story 03 — AC4.5.
 */

import { useRouter, useSearchParams, usePathname } from "next/navigation";
import { useTransition } from "react";
import { Loader2, Download } from "lucide-react";

interface EnsaioType {
  id: string;
  name: string;
}

export function GastosFilters({
  ensaioTypes,
  rate,
}: {
  ensaioTypes: EnsaioType[];
  rate: number;
}) {
  const router = useRouter();
  const pathname = usePathname();
  const sp = useSearchParams();
  const [pending, start] = useTransition();

  const period = sp.get("period") ?? "30d";
  const ensaioTypeId = sp.get("ensaio_type_id") ?? "";
  const withSwap = sp.get("with_swap") ?? "";

  function update(key: string, value: string) {
    start(() => {
      const next = new URLSearchParams(sp.toString());
      if (value) next.set(key, value);
      else next.delete(key);
      // Reset paginação ao mudar filtro
      next.delete("page");
      router.push(`${pathname}?${next.toString()}`);
    });
  }

  function exportUrl() {
    const next = new URLSearchParams(sp.toString());
    next.delete("page");
    return `/api/admin/gastos/export?${next.toString()}`;
  }

  return (
    <div className="card mb-4 flex flex-wrap items-center gap-3">
      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--muted)] uppercase tracking-wider">
          Período
        </span>
        <select
          value={period}
          onChange={(e) => update("period", e.target.value)}
          disabled={pending}
          className="input"
          style={{ width: 160 }}
        >
          <option value="7d">Últimos 7 dias</option>
          <option value="30d">Últimos 30 dias</option>
          <option value="90d">Últimos 90 dias</option>
          <option value="all">Todo período</option>
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--muted)] uppercase tracking-wider">
          Tipo
        </span>
        <select
          value={ensaioTypeId}
          onChange={(e) => update("ensaio_type_id", e.target.value)}
          disabled={pending}
          className="input"
          style={{ width: 200 }}
        >
          <option value="">Todos os tipos</option>
          {ensaioTypes.map((t) => (
            <option key={t.id} value={t.id}>
              {t.name}
            </option>
          ))}
        </select>
      </div>

      <div className="flex items-center gap-2">
        <span className="text-xs text-[var(--muted)] uppercase tracking-wider">
          Face-swap
        </span>
        <select
          value={withSwap}
          onChange={(e) => update("with_swap", e.target.value)}
          disabled={pending}
          className="input"
          style={{ width: 160 }}
        >
          <option value="">Indiferente</option>
          <option value="true">Apenas com swap</option>
          <option value="false">Apenas sem swap</option>
        </select>
      </div>

      <div className="flex items-center gap-2 ml-auto">
        <span className="text-xs text-[var(--muted)] hidden md:inline">
          USD/BRL: <strong className="text-[var(--foreground)]">{rate.toFixed(2)}</strong>
        </span>
        <a href={exportUrl()} className="btn btn-secondary btn-sm" download>
          <Download className="w-3.5 h-3.5" /> Exportar CSV
        </a>
        {pending && <Loader2 className="w-4 h-4 animate-spin text-[var(--muted)]" />}
      </div>
    </div>
  );
}
