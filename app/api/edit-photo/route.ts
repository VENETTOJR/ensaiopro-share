/**
 * POST /api/edit-photo  (multipart/form-data)
 *
 * Campos:
 *   foto_id: uuid (obrigatório)
 *   edit_prompt: string (obrigatório, 5-500 chars)
 *   extra_refs: File[] (0 a 3, opcional — imagens adicionais pra compor)
 *
 * Debita 1 crédito do user autenticado. Reembolsa em falha.
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { editSinglePhoto, type ExtraRef } from "@/lib/gemini/edit-photo";

export const runtime = "nodejs";
export const maxDuration = 120;

const MAX_EXTRA_FILE_MB = 10;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "não autenticado" }, { status: 401 });

  const form = await req.formData().catch(() => null);
  if (!form) return NextResponse.json({ error: "form inválido" }, { status: 400 });

  const fotoId = String(form.get("foto_id") ?? "").trim();
  const editPrompt = String(form.get("edit_prompt") ?? "").trim();

  if (!fotoId) return NextResponse.json({ error: "foto_id obrigatório" }, { status: 400 });
  if (editPrompt.length < 5) {
    return NextResponse.json(
      { error: "Descreva o que quer mudar (mínimo 5 letras)." },
      { status: 400 },
    );
  }

  const extraRefs: ExtraRef[] = [];
  const files = form.getAll("extra_refs");
  for (const f of files) {
    if (!(f instanceof File)) continue;
    if (!f.type.startsWith("image/")) continue;
    if (f.size > MAX_EXTRA_FILE_MB * 1024 * 1024) {
      return NextResponse.json(
        { error: `Imagem anexada maior que ${MAX_EXTRA_FILE_MB}MB` },
        { status: 400 },
      );
    }
    extraRefs.push({
      buffer: Buffer.from(await f.arrayBuffer()),
      mimeType: f.type,
    });
  }

  const result = await editSinglePhoto({
    userId: user.id,
    fotoId,
    editPrompt,
    extraRefs,
  });

  if (!result.ok) {
    return NextResponse.json({ error: result.error ?? "falha ao editar" }, { status: 500 });
  }

  return NextResponse.json({
    ok: true,
    foto_id: result.newFotoId,
    storage_path: result.storagePath,
  });
}
