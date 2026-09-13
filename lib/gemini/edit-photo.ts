/**
 * Edita uma foto JÁ GERADA com prompt curto do user.
 * Suporta imagens de referência ADICIONAIS (ex: arte de frase, logo) que o
 * user quer compor na foto existente ("coloca essa frase no canto").
 *
 * Custo: 1 crédito (igual regeneração). Reembolsa em falha.
 */

import { createClient as createAdmin } from "@supabase/supabase-js";
import sharp from "sharp";
import { GoogleGenAI, Modality } from "@google/genai";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;
const EDIT_COST = 1;
const MAX_DIMENSION = 1024;
const MAX_EXTRA_REFS = 3;

export interface ExtraRef {
  buffer: Buffer;
  mimeType: string;
}

export interface EditInput {
  userId: string;
  fotoId: string;
  editPrompt: string;
  /** Imagens adicionais que o user anexou (ex: arte de frase, logo, ref de pose). */
  extraRefs?: ExtraRef[];
}

export interface EditResult {
  ok: boolean;
  error?: string;
  newFotoId?: string;
  storagePath?: string;
}

const EDIT_GUARD_BASE = `Keep the person's facial features, hair, skin tone, and body EXACTLY identical to the first reference image (the original photo). Do not change the person's identity. Preserve lighting and composition of the first image unless explicitly asked to modify them.`;

const EDIT_GUARD_WITH_EXTRA = `Keep the person's facial features, hair, skin tone, and body EXACTLY identical to the first reference image (the original photo). Do not change the person's identity. The additional reference images attached are visual elements the user wants to compose into the photo (e.g., text art, logos, stickers) — integrate them as requested in the prompt. Preserve everything else in the first image unchanged.`;

async function processImage(buf: Buffer): Promise<{ b64: string; mime: string }> {
  const out = await sharp(buf)
    .rotate()
    .resize(MAX_DIMENSION, MAX_DIMENSION, { fit: "inside", withoutEnlargement: true })
    .jpeg({ quality: 92, mozjpeg: true })
    .toBuffer();
  return { b64: out.toString("base64"), mime: "image/jpeg" };
}

export async function editSinglePhoto(input: EditInput): Promise<EditResult> {
  const admin = createAdmin(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  const text = (input.editPrompt ?? "").trim();
  if (text.length < 5) return { ok: false, error: "edit prompt muito curto" };
  if (text.length > 500) return { ok: false, error: "edit prompt muito longo" };

  const extras = (input.extraRefs ?? []).slice(0, MAX_EXTRA_REFS);

  // 1. debita crédito antecipadamente
  const { data: debitOk } = await admin.rpc("debit_credits", {
    p_user_id: input.userId,
    p_amount: EDIT_COST,
  });
  if (!debitOk) return { ok: false, error: "créditos insuficientes" };

  try {
    // 2. pega foto original
    const { data: foto, error: fotoErr } = await admin
      .from("fotos_geradas")
      .select("id, ensaio_id, user_id, storage_path, prompt_id, prompt_numero, prompt_categoria")
      .eq("id", input.fotoId)
      .single();
    if (fotoErr || !foto) throw new Error("foto não encontrada");
    if (foto.user_id !== input.userId) throw new Error("foto não pertence ao user");

    // 3. download original + processa
    const { data: blob, error: dlErr } = await admin.storage
      .from("generated")
      .download(foto.storage_path);
    if (dlErr || !blob) throw new Error("download original falhou");
    const origBuf = Buffer.from(await blob.arrayBuffer());
    const orig = await processImage(origBuf);

    // 4. processa refs extras
    const extraProcessed: Array<{ b64: string; mime: string }> = [];
    for (const ref of extras) {
      try {
        const p = await processImage(ref.buffer);
        extraProcessed.push(p);
      } catch (e) {
        console.warn("[edit-photo] skip extra ref por erro sharp:", e);
      }
    }

    // 5. chama Gemini image-edit
    const apiKey = process.env.GEMINI_API_KEY;
    if (!apiKey) throw new Error("GEMINI_API_KEY missing");
    const gemini = new GoogleGenAI({ apiKey });

    const guard = extraProcessed.length > 0 ? EDIT_GUARD_WITH_EXTRA : EDIT_GUARD_BASE;

    const parts: Array<
      | { text: string }
      | { inlineData: { data: string; mimeType: string } }
    > = [
      { text: "Reference image 1 (original photo to edit):" },
      { inlineData: { data: orig.b64, mimeType: orig.mime } },
    ];
    extraProcessed.forEach((r, i) => {
      parts.push({ text: `Reference image ${i + 2} (additional visual element to compose):` });
      parts.push({ inlineData: { data: r.b64, mimeType: r.mime } });
    });
    parts.push({ text: `${guard}\n\nUser edit request:\n${text}` });

    const response = await gemini.models.generateContent({
      model: "gemini-2.5-flash-image",
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: [Modality.IMAGE],
        imageConfig: { aspectRatio: "1:1" },
        temperature: 0.6,
      },
    });

    const cand = response.candidates?.[0];
    let imageB64: string | null = null;
    let mimeType = "image/png";
    for (const part of cand?.content?.parts ?? []) {
      if ("inlineData" in part && part.inlineData?.data) {
        imageB64 = part.inlineData.data;
        mimeType = part.inlineData.mimeType ?? "image/png";
        break;
      }
    }
    if (!imageB64) throw new Error("modelo não retornou imagem");

    const imgBuf = Buffer.from(imageB64, "base64");
    if (imgBuf.length < 1000) throw new Error("imagem gerada vazia/corrompida");

    // 6. upload como NOVA foto
    const outExt = mimeType.includes("png") ? "png" : "jpg";
    const newPath = `${input.userId}/${foto.ensaio_id}/${foto.id}-edit-${Date.now()}.${outExt}`;
    const { error: upErr } = await admin.storage
      .from("generated")
      .upload(newPath, imgBuf, { contentType: mimeType, upsert: false });
    if (upErr) throw new Error("upload falhou: " + upErr.message);

    // 7. registra nova foto_gerada
    const { data: inserted, error: insErr } = await admin
      .from("fotos_geradas")
      .insert({
        ensaio_id: foto.ensaio_id,
        user_id: input.userId,
        prompt_id: foto.prompt_id,
        prompt_numero: foto.prompt_numero,
        prompt_categoria: foto.prompt_categoria,
        storage_path: newPath,
        status: "completed",
        cost_cents_nano: 20,
        cost_cents_swap: 0,
        cost_cents_enhance: 0,
        provider_used: "google",
      })
      .select("id")
      .single();
    if (insErr) throw new Error("insert falhou: " + insErr.message);

    return { ok: true, newFotoId: inserted.id, storagePath: newPath };
  } catch (err) {
    await admin.rpc("add_credits", { p_user_id: input.userId, p_amount: EDIT_COST });
    return { ok: false, error: err instanceof Error ? err.message : String(err) };
  }
}
