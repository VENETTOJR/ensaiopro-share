"use client";

/**
 * FaceSwapSoloToggle — controla system_settings.face_swap_solo_enabled (Story 07).
 *
 * Habilita aplicação do pipeline face-swap + enhance também em ensaios solo
 * (1 pessoa). Quando ligado, toda foto solo passa pelo swap pra travar o rosto
 * real da cliente por cima do output do modelo base.
 *
 * Requer face_swap_enabled=true pra ter efeito. Se o master switch estiver off,
 * solo também fica off independente deste toggle.
 *
 * Princípio §1.bis: admin-only, termos técnicos permitidos aqui.
 */

import { useState } from "react";
import { Loader2, User, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function FaceSwapSoloToggle({
  initialEnabled,
  fallback,
  masterEnabled,
}: {
  initialEnabled: boolean;
  fallback: boolean;
  masterEnabled: boolean;
}) {
  const [enabled, setEnabled] = useState(initialEnabled);
  const [busy, setBusy] = useState(false);

  async function toggle() {
    const next = !enabled;
    setBusy(true);
    setEnabled(next);
    try {
      const res = await fetch("/api/admin/settings/face-swap-solo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "falha");
      setEnabled(Boolean(data.enabled));
      toast.success(
        data.enabled
          ? "Fidelidade solo ATIVADA — toda foto solo vai passar pelo face-swap."
          : "Fidelidade solo DESATIVADA — solo volta ao pipeline padrão.",
      );
    } catch (err) {
      setEnabled(!next);
      toast.error(err instanceof Error ? err.message : "erro");
    } finally {
      setBusy(false);
    }
  }

  const effectivelyOn = enabled && masterEnabled;

  return (
    <div className="card mb-4 flex flex-wrap items-start gap-3">
      <div className="flex items-start gap-3 flex-1 min-w-0">
        <div
          className="w-9 h-9 rounded-lg flex items-center justify-center shrink-0"
          style={{
            background: effectivelyOn
              ? "color-mix(in srgb, var(--success) 15%, transparent)"
              : "color-mix(in srgb, var(--muted) 12%, transparent)",
          }}
        >
          <User
            className="w-4 h-4"
            style={{ color: effectivelyOn ? "var(--success)" : "var(--muted)" }}
          />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-[var(--muted)] uppercase tracking-wider">
            Fidelidade facial solo (1 pessoa)
          </div>
          <div className="font-semibold">
            {effectivelyOn
              ? "Ativada"
              : enabled && !masterEnabled
              ? "Ligada, mas inativa (master off)"
              : "Desativada"}
          </div>
          <div className="text-xs text-[var(--muted-strong)] mt-1 max-w-md">
            Quando ativa, ensaios solo também passam pelo face-swap + enhance
            (custo extra ~R$0,13/foto). Corrige quando o modelo base inventa
            traços — sem isso, cada foto pode virar uma &quot;versão&quot; da pessoa.
            {fallback && (
              <span className="ml-1 text-[var(--warning)] inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Setting ainda não no DB — usando default true.
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
          background: effectivelyOn ? "var(--success)" : "var(--border-strong)",
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
