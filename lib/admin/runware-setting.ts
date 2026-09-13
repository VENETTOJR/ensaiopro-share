/**
 * Toggle do provider Runware (Story 07).
 *
 * Usa API Runware (mesma plataforma do sistema irmão rcjfotos).
 * Modelo padrão runware:60@1 (PuLID Flux).
 * RUNWARE_API_KEY no .env.local.
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

export async function isRunwareEnabled(): Promise<boolean> {
  const now = Date.now();
  if (_cache && now - _cache.fetchedAt < CACHE_TTL_MS) {
    return _cache.value;
  }

  try {
    const admin = await createAdminClient();
    const { data, error } = await admin
      .from("system_settings")
      .select("value")
      .eq("key", "use_runware")
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

export function invalidateRunwareCache(): void {
  _cache = null;
}
