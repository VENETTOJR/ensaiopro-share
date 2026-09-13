/**
 * GET /api/admin/fotos-aprovar
 *
 * Lista fotos geradas candidatas a virarem exemplo de prompt.
 * Filtros:
 *   categoria:     string (ex: aniversario)
 *   prompt_id:     uuid  (filtra por prompt específico)
 *   only_missing:  'true' — só fotos cujo prompt ainda não tem example_image_url
 *   limit:         número (default 60, max 200)
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const categoria = url.searchParams.get("categoria") ?? "";
  const promptId = url.searchParams.get("prompt_id") ?? "";
  const onlyMissing = url.searchParams.get("only_missing") === "true";
  const limit = Math.min(200, Math.max(1, parseInt(url.searchParams.get("limit") ?? "60", 10) || 60));

  const admin = await createAdminClient();

  // 1. prompts pra lookup
  const { data: prompts } = await admin
    .from("prompts")
    .select("id, numero, categoria, example_image_url")
    .order("categoria")
    .order("numero");
  const promptsById = new Map((prompts ?? []).map((p) => [p.id, p]));

  // 2. fotos geradas completed
  let fotosQ = admin
    .from("fotos_geradas")
    .select("id, user_id, ensaio_id, prompt_id, prompt_categoria, prompt_numero, storage_path, created_at")
    .eq("status", "completed")
    .order("created_at", { ascending: false })
    .limit(limit);
  if (categoria) fotosQ = fotosQ.eq("prompt_categoria", categoria);
  if (promptId) fotosQ = fotosQ.eq("prompt_id", promptId);

  const { data: fotos, error } = await fotosQ;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  // 3. filtra e gera SIGNED URLs (bucket 'generated' é privado)
  const filtered = (fotos ?? []).filter((f) => {
    if (!onlyMissing) return true;
    const p = f.prompt_id ? promptsById.get(f.prompt_id) : null;
    return !p || !p.example_image_url;
  });

  const paths = filtered.map((f) => f.storage_path);
  const signedMap = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await admin.storage
      .from("generated")
      .createSignedUrls(paths, 3600);
    for (const s of signed ?? []) {
      if (s?.path && s?.signedUrl) signedMap.set(s.path, s.signedUrl);
    }
  }

  const rows = filtered.map((f) => {
    const p = f.prompt_id ? promptsById.get(f.prompt_id) : null;
    return {
      id: f.id,
      user_id: f.user_id,
      ensaio_id: f.ensaio_id,
      prompt_id: f.prompt_id,
      prompt_categoria: f.prompt_categoria,
      prompt_numero: f.prompt_numero,
      storage_path: f.storage_path,
      public_url: signedMap.get(f.storage_path) ?? "",
      created_at: f.created_at,
      prompt_has_example: !!p?.example_image_url,
      prompt_current_example: p?.example_image_url ?? null,
    };
  });

  const categorias = Array.from(new Set((prompts ?? []).map((p) => p.categoria))).sort();

  return NextResponse.json({
    rows,
    categorias,
    prompts: prompts ?? [],
  });
}
