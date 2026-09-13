/**
 * Helpers de cálculo e formatação de custo/margem para o dashboard admin.
 *
 * IMPORTANTE (PRD §1.bis):
 *   - Estes helpers só podem ser importados em código sob `app/(app)/admin/**`,
 *     `app/api/admin/**`, `components/admin/**` ou `scripts/admin/**`.
 *   - NUNCA importar em rotas user-facing.
 *
 * Este módulo é PURO (sem deps de server). `getUsdBrlRate()` (que precisa do
 * service-role) vive em `lib/admin/cost-server.ts`.
 */

export const FALLBACK_USD_BRL_RATE = 5.10; // PRD §2.3 + Story 03 dev notes

export function formatBRLcents(cents: number): string {
  return new Intl.NumberFormat("pt-BR", {
    style: "currency",
    currency: "BRL",
  }).format(cents / 100);
}
export function formatUSDcents(cents: number): string {
  return new Intl.NumberFormat("en-US", {
    style: "currency",
    currency: "USD",
  }).format(cents / 100);
}

/**
 * Margem percentual com guarda contra divisão por zero.
 * Retorna `null` se receita = 0 (UI mostra "—").
 */
export function marginPercent(receitaCents: number, custoCents: number): number | null {
  if (receitaCents <= 0) return null;
  return ((receitaCents - custoCents) / receitaCents) * 100;
}

export function marginCents(receitaCents: number, custoCents: number): number {
  return receitaCents - custoCents;
}

export type Period = "7d" | "30d" | "90d" | "custom" | "all";

export interface PeriodRange {
  from: Date | null;
  to: Date | null;
  label: string;
}

export function resolvePeriod(
  period: Period,
  customFrom?: string,
  customTo?: string,
): PeriodRange {
  const now = new Date();
  switch (period) {
    case "7d":
      return {
        from: new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000),
        to: now,
        label: "Últimos 7 dias",
      };
    case "30d":
      return {
        from: new Date(now.getTime() - 30 * 24 * 60 * 60 * 1000),
        to: now,
        label: "Últimos 30 dias",
      };
    case "90d":
      return {
        from: new Date(now.getTime() - 90 * 24 * 60 * 60 * 1000),
        to: now,
        label: "Últimos 90 dias",
      };
    case "custom":
      return {
        from: customFrom ? new Date(customFrom) : null,
        to: customTo ? new Date(customTo) : null,
        label: "Personalizado",
      };
    case "all":
    default:
      return { from: null, to: null, label: "Todo período" };
  }
}
