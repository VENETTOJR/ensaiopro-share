"use client";

/**
 * UsdBrlEditor — pequeno widget pro admin editar a cotação USD/BRL global
 * (Story 03 — dev notes, PRD §2.3). Default 5.10.
 */

import { useState } from "react";
import { Loader2, Check } from "lucide-react";
import { toast } from "sonner";

export function UsdBrlEditor({
  initialRate,
  fallback,
}: {
  initialRate: number;
  fallback: boolean;
}) {
  const [rate, setRate] = useState(String(initialRate.toFixed(2)));
  const [busy, setBusy] = useState(false);
  const [savedAt, setSavedAt] = useState<number | null>(null);

  async function save(e: React.FormEvent) {
    e.preventDefault();
    setBusy(true);
    try {
      const res = await fetch("/api/admin/settings/usd-brl", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ rate: Number(rate) }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "falha");
      setRate(String(Number(data.rate).toFixed(2)));
      setSavedAt(Date.now());
      toast.success(`Cotação atualizada: USD 1 = R$ ${Number(data.rate).toFixed(2)}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <form onSubmit={save} className="card mb-4 flex flex-wrap items-center gap-3">
      <div>
        <div className="text-xs text-[var(--muted)] uppercase tracking-wider">
          Cotação USD/BRL
        </div>
        <div className="text-xs text-[var(--muted-strong)]">
          Usada pra converter custos cobrados em dólares (Replicate, GFPGAN).
          {fallback && (
            <span className="ml-2 text-[var(--warning)]">
              · ⚠ tabela `system_settings` ainda não existe — usando fallback hardcoded
            </span>
          )}
        </div>
      </div>
      <div className="flex items-center gap-2 ml-auto">
        <span className="text-sm text-[var(--muted)]">USD 1 =</span>
        <span className="text-sm">R$</span>
        <input
          type="number"
          step="0.01"
          min={0.01}
          max={100}
          value={rate}
          onChange={(e) => setRate(e.target.value)}
          disabled={busy}
          className="input"
          style={{ width: 110 }}
        />
        <button type="submit" disabled={busy} className="btn btn-primary btn-sm">
          {busy ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : savedAt ? (
            <>
              <Check className="w-3.5 h-3.5" /> Salvo
            </>
          ) : (
            "Salvar"
          )}
        </button>
      </div>
    </form>
  );
}
