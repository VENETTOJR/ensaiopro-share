/**
 * Toggle dinâmico do pipeline face-swap (Story 04 continuação).
 *
 * Substitui process.env.FACE_SWAP_ENABLED por leitura de system_settings,
 * editável via /admin/gastos. Cache em memória de 60s pra não bater no DB
 * em cada foto gerada.
 *
 * Default = false (conservador — admin liga manualmente quando validar).
 *
 * Princípio §1.bis: nada user-facing. Toggle é admin-only, mensagens são
 * neutras pro user mesmo se swap falhar.
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

const CACHE_TTL_MS = 60_000;
let _cache: { value: boolean; fetchedAt: number } | null = null;
let _soloCache: { value: boolean; fetchedAt: number } | null = null;

function parseBool(v: unknown): boolean {
  return (
    v === true ||
    v === "true" ||
    (typeof v === "object" && v !== null && JSON.stringify(v) === "true")
  );
}

/**
 * Lê system_settings.face_swap_enabled. Cache 60s em memória.
 * Fallback false se a tabela/row não existirem.
 */
export async function isFaceSwapEnabled(): Promise<boolean> {
  const now = Date.now();
  if (_cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.value;
  }

  try {
    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("system_settings")
      .select("value")
      .eq("key", "face_swap_enabled")
      .maybeSingle();

    if (error || !data) {
      _cache = { value: false, fetchedAt: now };
      return false;
    }

    const enabled = parseBool(data.value);
    _cache = { value: enabled, fetchedAt: now };
    return enabled;
  } catch {
    _cache = { value: false, fetchedAt: now };
    return false;
  }
}

/**
 * Story 07 — lê system_settings.face_swap_solo_enabled (default true quando
 * face_swap_enabled=true). Controla se o face-swap é aplicado também em
 * ensaios solo (1 pessoa), o que aumenta fidelidade quando o Nano Banana
 * "inventa" feições no output. Cache 60s em memória.
 *
 * Custo: +R$0,13 por foto solo (swap R$0,08 + enhance R$0,05). Margem segue
 * alta a 1 crédito por foto. Desligar em /admin/gastos se precisar cortar custo.
 */
export async function isFaceSwapSoloEnabled(): Promise<boolean> {
  const now = Date.now();
  if (_soloCache && now - _soloCache.fetchedAt < CACHE_TTL_MS) {
    return _soloCache.value;
  }

  try {
    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("system_settings")
      .select("value")
      .eq("key", "face_swap_solo_enabled")
      .maybeSingle();

    if (error || !data) {
      // Default: true (só vale se face_swap_enabled também = true; o caller
      // verifica ambos). Assim uma instalação nova já vem com solo ligado.
      _soloCache = { value: true, fetchedAt: now };
      return true;
    }

    const enabled = parseBool(data.value);
    _soloCache = { value: enabled, fetchedAt: now };
    return enabled;
  } catch {
    _soloCache = { value: true, fetchedAt: now };
    return true;
  }
}

/** Invalida o cache — chamar após salvar via /api/admin/settings/face-swap. */
export function invalidateFaceSwapCache(): void {
  _cache = null;
  _soloCache = null;
}
