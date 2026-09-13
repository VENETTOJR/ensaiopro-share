"use client";

/**
 * components/refs/QualityBadge.tsx
 *
 * Selo verde / amarelo / vermelho de qualidade de uma foto de referência.
 * Story 01 — AC6.2, AC6.3, AC6.7 (vocabulário neutro).
 *
 * Hover/tap mostra tooltip com motivo (sempre via lib/face/messages).
 */

import { useState } from "react";
import { cn } from "@/lib/utils";
import type { QualityLabel, QualityReason } from "@/lib/face/quality";
import {
  QUALITY_LABEL_EMOJI,
  QUALITY_LABEL_TEXT,
  reasonText,
} from "@/lib/face/messages";

interface Props {
  label: QualityLabel | "loading";
  reason?: QualityReason;
  compact?: boolean;
}

const STYLES: Record<QualityLabel | "loading", string> = {
  green: "bg-[var(--success)]/15 text-[var(--success)] border-[var(--success)]/40",
  yellow: "bg-[var(--warning)]/15 text-[var(--warning)] border-[var(--warning)]/40",
  red: "bg-[var(--danger)]/15 text-[var(--danger)] border-[var(--danger)]/40",
  loading: "bg-[var(--background-elev-2)] text-[var(--muted)] border-[var(--border)]",
};

export function QualityBadge({ label, reason, compact = false }: Props) {
  const [open, setOpen] = useState(false);

  if (label === "loading") {
    return (
      <div
        className={cn(
          "inline-flex items-center gap-1 rounded-full border text-[10px] font-medium tracking-wide uppercase",
          compact ? "px-1.5 py-0.5" : "px-2 py-1",
          STYLES.loading
        )}
        aria-label="Analisando foto"
      >
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--muted)] animate-pulse" />
        Analisando
      </div>
    );
  }

  const text = QUALITY_LABEL_TEXT[label];
  const tooltip = reason ? reasonText(reason) : text;

  return (
    <div className="relative inline-block">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
        onMouseEnter={() => setOpen(true)}
        onMouseLeave={() => setOpen(false)}
        onFocus={() => setOpen(true)}
        onBlur={() => setOpen(false)}
        className={cn(
          "inline-flex items-center gap-1 rounded-full border text-[10px] font-semibold tracking-wide uppercase transition",
          compact ? "px-1.5 py-0.5" : "px-2 py-1",
          STYLES[label]
        )}
        aria-label={`Qualidade da foto: ${text}`}
      >
        <span aria-hidden>{QUALITY_LABEL_EMOJI[label]}</span>
        {!compact && <span>{text}</span>}
      </button>

      {open && (
        <div
          role="tooltip"
          className="absolute z-20 bottom-full mb-2 left-1/2 -translate-x-1/2 w-56 rounded-lg bg-[var(--background-elev-2)] border border-[var(--border-strong)] p-2.5 text-xs text-[var(--muted-strong)] shadow-lg"
        >
          <div className="font-semibold text-[var(--foreground)] mb-1 flex items-center gap-1.5">
            <span aria-hidden>{QUALITY_LABEL_EMOJI[label]}</span>
            <span>{text}</span>
          </div>
          <div className="leading-snug">{tooltip}</div>
        </div>
      )}
    </div>
  );
}
