"use client";

/**
 * CostBreakdownChart — barra horizontal mostrando split Nano/Swap/Enhance
 * de uma foto. Story 03 — AC4.4, FR-4.3.
 */

import { formatBRLcents } from "@/lib/admin/cost";

interface Props {
  nanoCents: number;
  swapCents: number;
  enhanceCents: number;
  totalCents: number;
  /** Nome do modelo usado em cada etapa (admin only). Story 03 AC4.4. */
  modelNano?: string;
  modelSwap?: string;
  modelEnhance?: string;
}

export function CostBreakdownChart({
  nanoCents,
  swapCents,
  enhanceCents,
  totalCents,
  modelNano = "Nano Banana",
  modelSwap = "Replicate face-swap",
  modelEnhance = "GFPGAN enhance",
}: Props) {
  const safeTotal = totalCents > 0 ? totalCents : Math.max(1, nanoCents + swapCents + enhanceCents);
  const segments = [
    {
      label: "Nano",
      model: modelNano,
      cents: nanoCents,
      color: "var(--primary)",
    },
    {
      label: "Swap",
      model: modelSwap,
      cents: swapCents,
      color: "var(--accent)",
    },
    {
      label: "Enhance",
      model: modelEnhance,
      cents: enhanceCents,
      color: "var(--warning)",
    },
  ];

  return (
    <div>
      <div className="flex items-baseline justify-between mb-1">
        <span className="text-xs text-[var(--muted)] uppercase tracking-wider">
          Breakdown
        </span>
        <span className="font-bold">{formatBRLcents(totalCents)}</span>
      </div>

      <div className="h-6 rounded-md overflow-hidden flex border border-[var(--border)] bg-[var(--background-elev-2)]">
        {segments.map((s) => {
          const w = (s.cents / safeTotal) * 100;
          if (w <= 0) return null;
          return (
            <div
              key={s.label}
              style={{ width: `${w}%`, background: s.color }}
              title={`${s.label} (${s.model}): ${formatBRLcents(s.cents)}`}
            />
          );
        })}
      </div>

      <div className="grid grid-cols-3 gap-2 mt-2 text-xs">
        {segments.map((s) => (
          <div key={s.label}>
            <div className="flex items-center gap-1.5">
              <span
                className="w-2 h-2 rounded-sm inline-block"
                style={{ background: s.color }}
              />
              <span className="font-semibold">{s.label}</span>
            </div>
            <div className="text-[var(--muted-strong)]">{formatBRLcents(s.cents)}</div>
            <div className="text-[10px] text-[var(--muted)] truncate" title={s.model}>
              {s.model}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
