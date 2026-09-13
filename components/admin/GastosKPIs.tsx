/**
 * GastosKPIs — cards de KPI do topo do /admin/gastos.
 * Story 03 — AC4.2.
 *
 * IMPORTANTE (PRD §1.bis): este componente vive sob components/admin/* e SÓ
 * pode ser importado por páginas em app/(app)/admin/* — exibe R$ e nomes
 * técnicos (Nano/Swap/Enhance) que são proibidos no resto do app.
 */

import { TrendingUp, DollarSign, Percent, Trophy } from "lucide-react";
import { formatBRLcents, marginPercent } from "@/lib/admin/cost";

interface Props {
  custo_total_cents: number;
  receita_total_cents: number;
  custo_nano_cents: number;
  custo_swap_cents: number;
  custo_enhance_cents: number;
  fotos: number;
  topUserEmail?: string | null;
  topUserCustoCents?: number;
  rangeLabel: string;
}

export function GastosKPIs(props: Props) {
  const margemPct = marginPercent(props.receita_total_cents, props.custo_total_cents);
  const margemCents = props.receita_total_cents - props.custo_total_cents;

  return (
    <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-6">
      <KPICard
        icon={DollarSign}
        label={`Custo · ${props.rangeLabel}`}
        value={formatBRLcents(props.custo_total_cents)}
        sub={`${props.fotos} fotos geradas`}
        color="warning"
      />
      <KPICard
        icon={TrendingUp}
        label={`Receita · ${props.rangeLabel}`}
        value={formatBRLcents(props.receita_total_cents)}
        sub="Compras pagas"
        color="success"
      />
      <KPICard
        icon={Percent}
        label="Margem bruta"
        value={
          margemPct === null ? "—" : `${margemPct.toFixed(1)}%`
        }
        sub={
          margemPct === null
            ? "sem receita no período"
            : `${formatBRLcents(margemCents)} líquido`
        }
        color={margemPct === null ? "muted" : margemPct >= 0 ? "success" : "danger"}
      />
      <KPICard
        icon={Trophy}
        label="Top usuário"
        value={props.topUserEmail ?? "—"}
        sub={
          props.topUserCustoCents != null
            ? `${formatBRLcents(props.topUserCustoCents)} de custo`
            : ""
        }
        color="primary"
        small
      />
    </div>
  );
}

function KPICard({
  icon: Icon,
  label,
  value,
  sub,
  color,
  small,
}: {
  icon: typeof TrendingUp;
  label: string;
  value: string;
  sub?: string;
  color: "primary" | "accent" | "success" | "warning" | "danger" | "muted";
  small?: boolean;
}) {
  const colorVar = {
    primary: "var(--primary)",
    accent: "var(--accent)",
    success: "var(--success)",
    warning: "var(--warning)",
    danger: "var(--danger)",
    muted: "var(--muted)",
  }[color];
  return (
    <div className="card">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
        style={{ background: `color-mix(in srgb, ${colorVar} 15%, transparent)` }}
      >
        <Icon className="w-4 h-4" style={{ color: colorVar }} />
      </div>
      <div className="text-xs text-[var(--muted)] uppercase tracking-wider">
        {label}
      </div>
      <div
        className={
          small
            ? "text-sm md:text-base font-semibold mt-0.5 truncate"
            : "text-xl md:text-2xl font-bold mt-0.5"
        }
        title={value}
      >
        {value}
      </div>
      {sub && <div className="text-xs text-[var(--muted)] mt-0.5 truncate">{sub}</div>}
    </div>
  );
}
