/**
 * lib/face/enhance.ts
 *
 * Story 04 — AC2.4 (Pipeline pós-swap: refinamento de pele/textura).
 *
 * Decisão técnica registrada em `docs/architecture/face-enhance-decision.md`:
 *   - Modelo padrão: `tencentarc/gfpgan` (variável env `FACE_ENHANCE_MODEL`)
 *   - Razão: latência ~3-5s por face em GPU compartilhada Replicate, custo
 *     ~US$0.0011 por chamada (~R$0.005 hoje), qualidade superior em retratos
 *     reais com texturas naturais (skin pores, sardas) — o que casa exato
 *     com o objetivo do PRD.
 *   - GFPGAN weight padrão = 0.5 (PRD §5 Feature 2 sugere — equilibra
 *     suavização vs preservação de marcas).
 *
 * NUNCA expor "GFPGAN", "Replicate" ou "enhance" em mensagens user-facing
 * (PRD §1.bis). Toda string técnica é só pra log admin.
 */

import Replicate from "replicate";

const DEFAULT_ENHANCE_MODEL = "tencentarc/gfpgan";
const DEFAULT_GFPGAN_VERSION =
  "0fbacf7afc6c144e5be9767cff80f25aff23e52b0708f17e20f9879b2f21516c";

let _replicate: Replicate | null = null;
function client(): Replicate {
  if (!_replicate) {
    const key = process.env.REPLICATE_API_TOKEN;
    if (!key) throw new Error("REPLICATE_API_TOKEN missing");
    _replicate = new Replicate({ auth: key });
  }
  return _replicate;
}

export interface EnhanceOptions {
  /** Override do modelo (default lê de FACE_ENHANCE_MODEL ou cai no padrão). */
  model?: string;
  /** Timeout total da chamada Replicate. */
  timeoutMs?: number;
  /** Versão pinada do GFPGAN (se não passar, lib monta `owner/name:version`). */
  version?: string;
  /** Fator de upscaling (1 = mesma resolução; padrão GFPGAN é 1). */
  scale?: number;
}

export interface EnhanceResult {
  buffer: Buffer;
  mimeType: string;
  /** Latência da chamada Replicate (ms). */
  latencyMs: number;
  /** Custo aproximado em centavos (R$) — preenchido pelo caller via tabela. */
  costCents: number;
  model: string;
  /** True quando enhance funcionou de fato; false se devolveu input original. */
  applied: boolean;
}

/**
 * Tenta extrair URL string de qualquer formato que `replicate.run()` possa
 * retornar (string direta, FileOutput, array, etc). Retorna null se não achar.
 */
function pickImageUrl(output: unknown): string | null {
  if (!output) return null;
  if (typeof output === "string") return output;
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === "string") return first;
    if (first && typeof first === "object") {
      const maybeUrl = (first as { url?: () => URL | string }).url?.();
      if (maybeUrl) return String(maybeUrl);
    }
  }
  if (typeof output === "object") {
    const maybeUrl = (output as { url?: () => URL | string }).url?.();
    if (maybeUrl) return String(maybeUrl);
  }
  return null;
}

/**
 * Aplica enhance numa imagem completa (a pós-swap final, conforme PRD).
 *
 * Em qualquer falha (timeout, Replicate down, modelo indisponível, output
 * inválido), retorna `{ buffer: input, applied: false, ... }` — o pipeline
 * principal segue com a foto pré-enhance e marca `cost_cents_enhance = 0`.
 *
 * NÃO lança exceção em caso de falha — falha de enhance NUNCA pode derrubar
 * a entrega da foto (princípio de fallback gracioso AC2.5).
 */
export async function enhanceFace(
  input: Buffer,
  opts: EnhanceOptions = {},
): Promise<EnhanceResult> {
  const model =
    opts.model ?? process.env.FACE_ENHANCE_MODEL ?? DEFAULT_ENHANCE_MODEL;
  const timeoutMs = opts.timeoutMs ?? 60_000;
  const startedAt = Date.now();

  // Custo aprox. tabela do PRD §2.3: 5 cents por foto enhanced (foto inteira,
  // não por face). Preenchido em centavos pra match com schema fotos_geradas.
  const COST_CENTS = 5;

  try {
    const dataUri = `data:image/jpeg;base64,${input.toString("base64")}`;
    const controller = new AbortController();
    const timer = setTimeout(() => controller.abort(), timeoutMs);

    // Replicate quer identifier `owner/name` ou `owner/name:version`.
    // Se opts.version tiver valor, monta com pin. Caso contrário, usa o pin
    // default (mais seguro pra reprodutibilidade — model latest pode mudar).
    const version = opts.version ?? DEFAULT_GFPGAN_VERSION;
    const identifier =
      model.includes(":") || !version
        ? (model as `${string}/${string}`)
        : (`${model}:${version}` as `${string}/${string}:${string}`);

    let raw: unknown;
    try {
      raw = await client().run(identifier, {
        input: {
          img: dataUri,
          version: "v1.4",
          scale: opts.scale ?? 1,
          // GFPGAN não tem param "weight" exposto via API pública — o weight 0.5
          // é interno do modelo e já é o default da versão v1.4.
        },
        signal: controller.signal,
      });
    } finally {
      clearTimeout(timer);
    }

    const url = pickImageUrl(raw);
    if (!url) {
      return {
        buffer: input,
        mimeType: "image/jpeg",
        latencyMs: Date.now() - startedAt,
        costCents: 0,
        model,
        applied: false,
      };
    }

    const res = await fetch(url, { signal: controller.signal });
    if (!res.ok) {
      return {
        buffer: input,
        mimeType: "image/jpeg",
        latencyMs: Date.now() - startedAt,
        costCents: 0,
        model,
        applied: false,
      };
    }
    const buf = Buffer.from(await res.arrayBuffer());
    const mime = res.headers.get("content-type") ?? "image/jpeg";
    return {
      buffer: buf,
      mimeType: mime,
      latencyMs: Date.now() - startedAt,
      costCents: COST_CENTS,
      model,
      applied: true,
    };
  } catch (err) {
    // Log admin-only (princípio §1.bis: nunca em response user-facing).
    const msg = err instanceof Error ? err.message : String(err);
    console.warn(
      JSON.stringify({
        scope: "face/enhance",
        provider: "replicate",
        model,
        success: false,
        latency_ms: Date.now() - startedAt,
        error: msg.slice(0, 300),
      }),
    );
    return {
      buffer: input,
      mimeType: "image/jpeg",
      latencyMs: Date.now() - startedAt,
      costCents: 0,
      model,
      applied: false,
    };
  }
}
