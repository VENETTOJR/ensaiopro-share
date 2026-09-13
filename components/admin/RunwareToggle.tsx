"use client";

/**
 * RunwareToggle — system_settings.use_runware (Story 07).
 *
 * Mesmo provider que o sistema irmão usa. PuLID Flux nativo.
 */

import { useState } from "react";
import { Loader2, Zap, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function RunwareToggle({
  initialEnabled,
  fallback,
}: {
  initialEnabled: boolean;
  fallback: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !enabled;
    setBusy(true);
    setEnabled(next);
    try {
      const res = await fetch("/api/admin/settings/runware", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "falha");
      setEnabled(Boolean(data.enabled));
      toast.success(
        data.enabled
          ? "Runware ATIVADO — usando provider do sistema irmão."
          : "Runware DESATIVADO.",
      );
    } catch (err) {
      setEnabled(!next);
      toast.error(err instanceof Error ? err.message : "erro");
    } finally {
      setBusy(false);
    }
  }

  return (
    <div className="card mb-4 flex flex-wrap items-start gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: enabled
              ? "color-mix(in srgb, var(--accent) 25%, transparent)"
              : "color-mix(in srgb, var(--muted) 12%, transparent)",
          }}
        >
          <Zap
            className="w-4 h-4"
            style={{ color: enabled ? "var(--accent)" : "var(--muted)" }}
          />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-[var(--muted)] uppercase tracking-wider">
            Provider Runware (Flux + PuLID)
          </div>
          <div className="font-semibold">
            {enabled ? "Ativado (Runware override)" : "Desativado"}
          </div>
          <div className="text-xs text-[var(--muted-strong)] mt-1 max-w-md">
            Usa API Runware com modelo PuLID Flux (mesmo do sistema irmão).
            Override de prioridade máxima — vence Flux/Replicate e Nano.
            Custo ~R$0,25/foto. Requer RUNWARE_API_KEY no .env.local.
            {fallback && (
              <span className="ml-1 text-[var(--warning)] inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Setting ainda não no DB — usando default false.
              </span>
            )}
          </div>
        </div>
      </div>

      <button
        type="button"
        onClick={toggle}
        disabled={busy}
        aria-pressed={enabled}
        className="relative inline-flex h-7 w-12 items-center rounded-full transition-colors shrink-0 mt-1"
        style={{
          background: enabled ? "var(--accent)" : "var(--border-strong)",
          opacity: busy ? 0.6 : 1,
        }}
      >
        <span
          className="inline-block h-5 w-5 rounded-full bg-white shadow transition-transform"
          style={{
            transform: enabled ? "translateX(22px)" : "translateX(4px)",
          }}
        />
        {busy && (
          <Loader2 className="absolute -right-6 w-4 h-4 animate-spin text-[var(--muted)]" />
        )}
      </button>
    </div>
  );
}
