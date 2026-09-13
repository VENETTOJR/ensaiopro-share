/**
 * Toggle dinâmico do provider Flux+PuLID (Story 07).
 *
 * Quando ligado, geração principal usa zsxkib/flux-pulid via Replicate
 * (em vez de Nano Banana). Custo +R$0,05/img mas fidelidade muito superior
 * porque PuLID é adapter de identidade nativo.
 *
 * Default = false (conservador — admin liga quando validar).
 *
 * Princípio §1.bis: termos técnicos só admin-side. User vê só "modo
 * fidelidade alta" se for exposto.
 */

import "server-only";
import { createAdminClient } from "@/lib/supabase/server";

const CACHE_TTL_MS = 60_000;
let _cache: { value: boolean; fetchedAt: number } | null = null;

function parseBool(v: unknown): boolean {
  return (
    v === true ||
    v === "true" ||
    (typeof v === "object" && v !== null && JSON.stringify(v) === "true")
  );
}

export async function isFluxPulidEnabled(): Promise<boolean> {
  const now = Date.now();
  if (_cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.value;
  }

  try {
    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("system_settings")
      .select("value")
      .eq("key", "use_flux_pulid")
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

export function invalidateFluxPulidCache(): void {
  _cache = null;
}
