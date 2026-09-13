/**
 * POST /api/admin/prompts/upload-example
 *
 * Upload de imagem pra virar example_image_url de um prompt.
 * - Recebe FormData com 'file' (imagem) e 'prompt_id' (uuid).
 * - Faz upload pro bucket 'public-assets' em 'prompt-examples/<prompt_id>.<ext>'.
 * - Atualiza prompts.example_image_url com a URL pública.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

const MAX_BYTES = 15 * 1024 * 1024;

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "invalid form" }, { status: 400 });

  const file = form.get("file");
  const promptId = String(form.get("prompt_id") ?? "").trim();

  if (!promptId) return NextResponse.json({ error: "prompt_id obrigatório" }, { status: 400 });
  if (!(file instanceof File)) return NextResponse.json({ error: "file obrigatório" }, { status: 400 });
  if (file.size > MAX_BYTES) return NextResponse.json({ error: "arquivo > 15MB" }, { status: 400 });

  const mime = file.type || "image/jpeg";
  if (!mime.startsWith("image/")) {
    return NextResponse.json({ error: "deve ser imagem" }, { status: 400 });
  }

  const ext = mime.includes("png") ? "png" : mime.includes("webp") ? "webp" : "jpg";
  const path = `prompt-examples/${promptId}.${ext}`;
  const buf = Buffer.from(await file.arrayBuffer());

  const admin = await createAdminClient();
  const { error: upErr } = await admin.storage
    .from("public-assets")
    .upload(path, buf, { contentType: mime, upsert: true });
  if (upErr) return NextResponse.json({ error: upErr.message }, { status: 500 });

  const SUPA = process.env.NEXT_PUBLIC_SUPABASE_URL!;
  const publicUrl = `${SUPA}/storage/v1/object/public/public-assets/${path}?t=${Date.now()}`;

  const { data: updated, error: dbErr } = await admin
    .from("prompts")
    .update({ example_image_url: publicUrl, updated_at: new Date().toISOString() })
    .eq("id", promptId)
    .select("id, numero, categoria, example_image_url")
    .single();
  if (dbErr) return NextResponse.json({ error: dbErr.message }, { status: 500 });

  return NextResponse.json({ prompt: updated, public_url: publicUrl });
}
