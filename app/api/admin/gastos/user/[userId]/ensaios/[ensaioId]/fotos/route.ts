/**
 * GET /api/admin/gastos/user/:userId/ensaios/:ensaioId/fotos
 *
 * Drill-down nível 3: lista fotos de um ensaio específico com breakdown
 * granular (Nano / Swap / Enhance), faces detectadas/trocadas, swap_status.
 * Story 03 — AC4.4, AC4.9.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function GET(
  _req: NextRequest,
  ctx: { params: Promise<{ userId: string; ensaioId: string }> },
) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { userId, ensaioId } = await ctx.params;
  const admin = await createAdminClient();

  const { data: fotos, error } = await admin
    .from("fotos_geradas")
    .select(
      "id, prompt_id, prompt_numero, prompt_categoria, storage_path, status, error_message, cost_cents, cost_cents_nano, cost_cents_swap, cost_cents_enhance, swap_status, faces_detected, faces_swapped, created_at",
    )
    .eq("user_id", userId)
    .eq("ensaio_id", ensaioId)
    .order("prompt_numero", { ascending: true });

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // Gera signed URLs apenas para fotos completadas
  const completedPaths = (fotos ?? [])
    .filter((f) => f.status === "completed" && f.storage_path)
    .map((f) => f.storage_path);

  const signedMap = new Map<string, string>();
  if (completedPaths.length > 0) {
    const { data: signed } = await admin.storage
      .from("generated")
      .createSignedUrls(completedPaths, 3600);
    for (const s of signed ?? []) {
      if (s?.path && s?.signedUrl) signedMap.set(s.path, s.signedUrl);
    }
  }

  return NextResponse.json({
    user_id: userId,
    ensaio_id: ensaioId,
    fotos: (fotos ?? []).map((f) => ({
      ...f,
      signed_url: signedMap.get(f.storage_path) ?? null,
    })),
  });
}
