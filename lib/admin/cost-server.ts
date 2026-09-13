/**
 * Helpers de custo que dependem de createAdminClient (server-only).
 * Separado de cost.ts pra permitir que componentes client usem formatBRLcents
 * sem puxar `next/headers`.
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/server";
import { FALLBACK_USD_BRL_RATE } from "./cost";

/**
 * Lê system_settings.usd_brl_rate. Fallback 5.10 se a tabela não existir
 * (caso a migration 0008 ainda não tenha sido aplicada).
 */
export async function getUsdBrlRate(): Promise<number> {
  try {
    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("system_settings")
      .select("value")
      .eq("key", "usd_brl_rate")
      .maybeSingle();

    if (error || !data) return FALLBACK_USD_BRL_RATE;
    const v = data.value;
    const n = typeof v === "number" ? v : Number(v);
    return Number.isFinite(n) && n > 0 ? n : FALLBACK_USD_BRL_RATE;
  } catch {
    return FALLBACK_USD_BRL_RATE;
  }
}
