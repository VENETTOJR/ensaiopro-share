"use client";

/**
 * FaceSwapToggle — controla system_settings.face_swap_enabled (Story 04 cont).
 *
 * Liga/desliga o pipeline face-swap pra TODOS os ensaios em runtime,
 * sem redeploy. Default = false (conservador). Admin liga só quando
 * validar que o pipeline está bom — pode desligar imediatamente se
 * começar a dar erros pros users.
 *
 * Princípio §1.bis: copy menciona "fidelidade facial multi-pessoa", NUNCA
 * "Replicate", "GFPGAN", "face-swap" pra user. Aqui é admin-only, então ok.
 */

import { useState } from "react";
import { Loader2, Users, AlertTriangle } from "lucide-react";
import { toast } from "sonner";

export function FaceSwapToggle({
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
    setEnabled(next); // optimistic
    try {
      const res = await fetch("/api/admin/settings/face-swap", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: next }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "falha");
      setEnabled(Boolean(data.enabled));
      toast.success(
        data.enabled
          ? "Face-swap ATIVADO — multi-pessoa vai usar fidelidade facial."
          : "Face-swap DESATIVADO — ensaios usam só o modelo base.",
      );
    } catch (err) {
      setEnabled(!next); // rollback
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
              ? "color-mix(in srgb, var(--success) 15%, transparent)"
              : "color-mix(in srgb, var(--muted) 12%, transparent)",
          }}
        >
          <Users
            className="w-4 h-4"
            style={{ color: enabled ? "var(--success)" : "var(--muted)" }}
          />
        </div>
        <div className="min-w-0">
          <div className="text-xs text-[var(--muted)] uppercase tracking-wider">
            Fidelidade facial multi-pessoa
          </div>
          <div className="font-semibold">
            {enabled ? "Ativada" : "Desativada"}
          </div>
          <div className="text-xs text-[var(--muted-strong)] mt-1 max-w-md">
            Quando ativa, ensaios com 2+ pessoas passam por pós-processamento
            que troca cada rosto pelo da referência (custo extra por face).
            Em ensaios solo (1 pessoa) é sempre ignorada.
            {fallback && (
              <span className="ml-1 text-[var(--warning)] inline-flex items-center gap-1">
                <AlertTriangle className="w-3 h-3" />
                Setting ainda não no DB — usando fallback false.
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
          background: enabled ? "var(--success)" : "var(--border-strong)",
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
