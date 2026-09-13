/**
 * GET / POST /api/admin/settings/face-swap
 *
 * Lê / atualiza `system_settings.face_swap_enabled` (Story 04 continuação).
 * Toggle dinâmico do pipeline face-swap, controlável sem redeploy.
 *
 * GET → { enabled: boolean, updated_at: string | null, fallback: boolean }
 * POST { enabled: boolean } → { ok: true, enabled, updated_at }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin, type AdminAuthOk } from "@/lib/admin/auth";
import { invalidateFaceSwapCache } from "@/lib/admin/face-swap-setting";

export const runtime = "nodejs";

function parseEnabled(value: unknown): boolean {
  if (value === true || value === "true") return true;
  if (value === false || value === "false" || value == null) return false;
  return Boolean(value);
}

export async function GET() {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("system_settings")
    .select("value, updated_at")
    .eq("key", "face_swap_enabled")
    .maybeSingle();

  if (error) {
    return NextResponse.json({
      enabled: false,
      updated_at: null,
      fallback: true,
      error: error.message,
    });
  }

  if (!data) {
    return NextResponse.json({
      enabled: false,
      updated_at: null,
      fallback: true,
    });
  }

  return NextResponse.json({
    enabled: parseEnabled(data.value),
    updated_at: data.updated_at,
    fallback: false,
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;
  const okAuth = auth as AdminAuthOk;

  const body = (await req.json().catch(() => null)) as { enabled?: unknown } | null;
  if (typeof body?.enabled !== "boolean") {
    return NextResponse.json(
      { error: "enabled inválido — esperado boolean" },
      { status: 400 },
    );
  }
  const enabled = body.enabled;

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("system_settings")
    .upsert(
      {
        key: "face_swap_enabled",
        value: enabled,
        updated_by: okAuth.userId,
      },
      { onConflict: "key" },
    )
    .select("value, updated_at")
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  invalidateFaceSwapCache();

  return NextResponse.json({
    ok: true,
    enabled: parseEnabled(data?.value),
    updated_at: data?.updated_at,
  });
}
