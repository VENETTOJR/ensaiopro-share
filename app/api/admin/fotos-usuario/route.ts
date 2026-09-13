/**
 * GET /api/admin/fotos-usuario?user_id=xxx
 *
 * Retorna todos os ensaios do usuário com suas fotos geradas (signed URLs).
 * Usado pelo painel /admin/compras pra mostrar as imagens inline.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const userId = new URL(req.url).searchParams.get("user_id");
  if (!userId) {
    return NextResponse.json({ error: "user_id obrigatório" }, { status: 400 });
  }

  const admin = await createAdminClient();

  // Ensaios do usuário ordenados por mais recente
  const { data: ensaios, error: ensErr } = await admin
    .from("ensaios")
    .select("id, name, status, total_generated, total_failed, created_at, ensaio_types(name, slug)")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(50);

  if (ensErr) {
    return NextResponse.json({ error: ensErr.message }, { status: 500 });
  }

  if (!ensaios || ensaios.length === 0) {
    return NextResponse.json({ ensaios: [] });
  }

  // Fotos geradas de todos os ensaios
  const ensaioIds = ensaios.map((e) => e.id);
  const { data: fotos, error: fotErr } = await admin
    .from("fotos_geradas")
    .select("id, ensaio_id, storage_path, prompt_categoria, prompt_numero, status, created_at")
    .in("ensaio_id", ensaioIds)
    .eq("status", "completed")
    .order("created_at", { ascending: true });

  if (fotErr) {
    return NextResponse.json({ error: fotErr.message }, { status: 500 });
  }

  // Gera signed URLs em lote
  const paths = (fotos ?? []).map((f) => f.storage_path);
  const signedMap = new Map<string, string>();
  if (paths.length > 0) {
    const { data: signed } = await admin.storage
      .from("generated")
      .createSignedUrls(paths, 3600);
    for (const s of signed ?? []) {
      if (s?.path && s?.signedUrl) signedMap.set(s.path, s.signedUrl);
    }
  }

  // Agrupa fotos por ensaio_id
  const fotosByEnsaio = new Map<string, typeof fotos>();
  for (const f of fotos ?? []) {
    if (!fotosByEnsaio.has(f.ensaio_id)) fotosByEnsaio.set(f.ensaio_id, []);
    fotosByEnsaio.get(f.ensaio_id)!.push(f);
  }

  const result = ensaios.map((e) => ({
    id: e.id,
    name: e.name,
    status: e.status,
    total_generated: e.total_generated,
    total_failed: e.total_failed,
    created_at: e.created_at,
    ensaio_type: (Array.isArray(e.ensaio_types) ? e.ensaio_types[0] : e.ensaio_types) as { name: string; slug: string } | null,
    fotos: (fotosByEnsaio.get(e.id) ?? []).map((f) => ({
      id: f.id,
      storage_path: f.storage_path,
      signed_url: signedMap.get(f.storage_path) ?? "",
      prompt_categoria: f.prompt_categoria,
      prompt_numero: f.prompt_numero,
    })),
  }));

  return NextResponse.json({ ensaios: result });
}
