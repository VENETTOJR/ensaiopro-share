/**
 * Provider OpenAI GPT Image 1 — tier "Detalhado" do freestyle (Story 06 ext).
 *
 * Endpoint: POST https://api.openai.com/v1/images/edits
 * Modelo: gpt-image-1, quality=high, size=1024x1024, output=jpeg.
 *
 * Custo (jan 2026): ~$0.167/imagem em high → ~R$ 0,87 (a R$ 5,20/USD).
 * Sistema cobra 4 créditos/foto neste tier (vs 1 crédito do Gemini).
 *
 * Limite: até 16 imagens de referência por request, cada ≤ 25MB.
 *
 * Princípio §1.bis: NUNCA mencionar "OpenAI" / "GPT" em mensagens user-facing.
 */

import { Buffer } from "node:buffer";

const ENDPOINT = "https://api.openai.com/v1/images/edits";
const MODEL = "gpt-image-1";
const TIMEOUT_MS = 120_000; // GPT Image high é mais lento (10-60s)

export interface OpenAIGenerateInput {
  prompt: string;
  /** Refs em base64 (sem data: prefix). Max 16, ≤25MB cada. */
  referenceImages: Array<{ data: string; mimeType: string }>;
  /** "low" | "medium" | "high". Default "high" (tier Detalhado). */
  quality?: "low" | "medium" | "high";
  size?: "1024x1024" | "1024x1536" | "1536x1024";
}

export interface OpenAIGenerateResult {
  imageBase64: string;
  mimeType: string;
}

function apiKey(): string {
  const k = process.env.OPENAI_API_KEY;
  if (!k) throw new Error("OPENAI_API_KEY missing");
  return k;
}

/**
 * Gera imagem com GPT Image 1 a partir de prompt + refs.
 * Pra freestyle 1 pessoa funciona bem; multi-pessoa ainda degrada
 * identidade — usar Gemini + face-swap nesses casos.
 */
export async function generateWithOpenAI(
  input: OpenAIGenerateInput,
): Promise<OpenAIGenerateResult> {
  const key = apiKey();
  const quality = input.quality ?? "high";
  const size = input.size ?? "1024x1024";

  const form = new FormData();
  form.append("model", MODEL);
  form.append("prompt", input.prompt);
  form.append("size", size);
  form.append("quality", quality);
  form.append("output_format", "jpeg");
  form.append("n", "1");

  // Refs como Blob — campo "image" repetido (multi-image edits)
  input.referenceImages.slice(0, 16).forEach((ref, i) => {
    const buf = Buffer.from(ref.data, "base64");
    const ext = ref.mimeType.includes("png") ? "png" : "jpg";
    const blob = new Blob([buf], { type: ref.mimeType });
    form.append("image[]", blob, `ref-${i}.${ext}`);
  });

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), TIMEOUT_MS);
  try {
    const res = await fetch(ENDPOINT, {
      method: "POST",
      headers: { Authorization: `Bearer ${key}` },
      body: form,
      signal: controller.signal,
    });

    if (!res.ok) {
      const errBody = await res.text().catch(() => "");
      throw new Error(
        `OpenAI ${res.status}: ${errBody.slice(0, 300)}`,
      );
    }

    const json = (await res.json()) as {
      data?: Array<{ b64_json?: string }>;
    };
    const b64 = json.data?.[0]?.b64_json;
    if (!b64) throw new Error("OpenAI sem b64_json no response");

    return { imageBase64: b64, mimeType: "image/jpeg" };
  } finally {
    clearTimeout(timer);
  }
}

/** Custo estimado em centavos USD pra telemetria (sem ratio BRL aqui). */
export function openAICostCentsUSD(quality: "low" | "medium" | "high"): number {
  switch (quality) {
    case "low":
      return 1; // ~$0.011
    case "medium":
      return 4; // ~$0.042
    case "high":
      return 17; // ~$0.167
  }
}
