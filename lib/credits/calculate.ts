/**
 * Cálculo de créditos a debitar para um ensaio (Story 05).
 *
 * Regra de cobrança definida pelo produto:
 *   - Cada prompt tem `creditos_por_foto` (override) OU usa
 *     `ensaio_types.creditos_por_foto_base` como fallback.
 *   - Backfill default na migration:
 *       familia=3, mae=2, casal=2, casamento=2, demais=1
 *
 * Princípio §1.bis: NENHUM valor R$/USD em mensagens user-facing — só "X créditos".
 */

import { createClient as createAdmin } from "@supabase/supabase-js";

export interface CreditCalculation {
  /** Total de créditos a debitar pelo ensaio inteiro */
  total: number;
  /** Quanto cada prompt vai custar (id → créditos) */
  breakdown: Map<string, number>;
  /** Quanto custa em média por foto (pra preview) */
  avgPerPhoto: number;
}

/**
 * Calcula quantos créditos debitar pelo ensaio.
 *
 * @param promptIds IDs dos prompts selecionados
 * @param ensaioTypeId ID do tipo de ensaio (pra fallback creditos_por_foto_base)
 */
export async function calcCreditsToDebit(
  promptIds: string[],
  ensaioTypeId: string
): Promise<CreditCalculation> {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createAdmin(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // Fallback do tipo
  const { data: tipo } = await admin
    .from("ensaio_types")
    .select("creditos_por_foto_base")
    .eq("id", ensaioTypeId)
    .maybeSingle();
  const baseCost = tipo?.creditos_por_foto_base ?? 1;

  // Override por prompt
  const { data: prompts } = await admin
    .from("prompts")
    .select("id, creditos_por_foto")
    .in("id", promptIds);

  const breakdown = new Map<string, number>();
  let total = 0;
  for (const id of promptIds) {
    const p = prompts?.find((x) => x.id === id);
    const cost = p?.creditos_por_foto ?? baseCost;
    breakdown.set(id, cost);
    total += cost;
  }

  return {
    total,
    breakdown,
    avgPerPhoto: promptIds.length > 0 ? Math.round(total / promptIds.length) : baseCost,
  };
}

/**
 * Pra UI: dado um ensaio_type_id, retorna o custo médio em créditos por foto
 * (pra preview "esse ensaio custa em média X créditos por foto").
 */
export async function getAverageCostForType(ensaioTypeId: string): Promise<number> {
  const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
  const admin = createAdmin(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
  const { data: tipo } = await admin
    .from("ensaio_types")
    .select("creditos_por_foto_base")
    .eq("id", ensaioTypeId)
    .maybeSingle();
  return tipo?.creditos_por_foto_base ?? 1;
}
