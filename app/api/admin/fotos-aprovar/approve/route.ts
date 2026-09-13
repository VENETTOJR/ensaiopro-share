/**
 * POST /api/admin/fotos-aprovar/approve
 *
 * Aprova uma foto gerada como example_image_url de um prompt.
 * Body: { foto_id: uuid, prompt_id: uuid (opcional — default o prompt da própria foto) }
 *
 * Efeito:
 *   - pega storage_path da foto gerada
 *   - gera URL pública (bucket 'generated' já é public)
 *   - atualiza prompts.example_image_url
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const foto_id = String(body.foto_id ?? "").trim();
  if (!foto_id) return NextResponse.json({ error: "foto_id obrigatório" }, { status: 400 });

  const admin = await createAdminClient();

  const { data: foto, error: fotoErr } = await admin
    .from("fotos_geradas")
    .select("id, prompt_id, storage_path, status")
    .eq("id", foto_id)
    .single();
  if (fotoErr || !foto) return NextResponse.json({ error: "foto não encontrada" }, { status: 404 });
  if (foto.status !== "completed") {
    return NextResponse.json({ error: "só fotos completed podem virar exemplo" }, { status: 400 });
  }
  if (!foto.storage_path) {
    return NextResponse.json({ error: "foto sem storage_path" }, { status: 400 });
  }

  const promptId = String(body.prompt_id ?? foto.prompt_id ?? "").trim();
  if (!promptId) {
    return NextResponse.json({ error: "prompt_id não encontrado (foto freestyle?)" }, { status: 400 });
  }

  // Bucket 'generated' é privado. Pra example_image_url (que é visto por CLIENTES
  // no seletor de prompts) precisa de URL pública permanente. Copia a foto pro
  // bucket 'public-assets' em 'prompt-examples/<prompt_id>.<ext>'.
  const ext = foto.storage_path.split(".").pop() || "jpg";
  const publicPath = `prompt-examples/${promptId}.${ext}`;
  const { data: fileData, error: dlErr } = await admin.storage
    .from("generated")
    .download(foto.storage_path);
  if (dlErr || !fileData) {
    return NextResponse.json({ error: "não consegui baixar a foto" }, { status: 500 });
  }
  const buf = Buffer.from(await fileData.arrayBuffer());
  const contentType = ext === "png" ? "image/png" : ext === "webp" ? "image/webp" : "image/jpeg";
  const { error: upStErr } = await admin.storage
    .from("public-assets")
    .upload(publicPath, buf, { contentType, upsert: true });
  if (upStErr) {
    return NextResponse.json({ error: "falha ao publicar: " + upStErr.message }, { status: 500 });
  }
  const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  // Cache-bust ?t= força preview novo quando aprovar outra foto no mesmo prompt.
  const publicUrl = `${SUPA}/storage/v1/object/public/public-assets/${publicPath}?t=${Date.now()}`;

  const { data: updated, error: upErr } = await admin
    .from("prompts")
    .update({ example_image_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", promptId)
    .select("id, numero, categoria, example_image_url")
    .single();

  if (upErr || !updated) {
    return NextResponse.json({ error: upErr?.message ?? "falhou update" }, { status: 500 });
  }

  return NextResponse.json({ prompt: updated });
}
