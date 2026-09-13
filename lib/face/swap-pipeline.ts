/**
 * Pipeline face-swap (Story 04 — PRD §5 Feature 2)
 *
 * Após Gemini Nano Banana gerar a imagem base, este pipeline:
 *  1. Pra cada pessoa (1..N), troca a face N pelo rosto da ref daquela pessoa
 *     usando Replicate cdingram/face-swap (face_index controla qual face)
 *  2. Aplica enhance final (GFPGAN) pra restaurar nitidez
 *  3. Retorna buffer + telemetria de custo/latência
 *
 * Fallback gracioso: qualquer erro retorna a imagem original com swap_status='failed'.
 *
 * Princípio §1.bis: NENHUMA string user-facing menciona Replicate/face-swap/GFPGAN.
 * Mensagens técnicas vão SÓ pra log admin.
 */

import Replicate from "replicate";
import { enhanceFace } from "./enhance";
import {
  isFaceSwapEnabled,
  isFaceSwapSoloEnabled,
} from "@/lib/admin/face-swap-setting";

export type SwapStatus = "skipped" | "success" | "partial" | "failed";

export interface SwapAnchor {
  /** base64 da foto de referência (sem data: prefix) */
  data: string;
  /** "image/jpeg" | "image/png" | "image/webp" */
  mimeType: string;
  /** índice da pessoa (0-based) — corresponde a destination_face_index = personIdx + 1 */
  personIdx: number;
}

export interface SwapInput {
  /** Imagem gerada pelo Nano Banana (Buffer) */
  imageBuffer: Buffer;
  /** mime type da imagem (image/png ou image/jpeg) */
  imageMime: string;
  /** Anchors selecionados — 1 por pessoa */
  anchors: SwapAnchor[];
  /** Quantas pessoas o ensaio tem (1..4). Se <2 → skip. */
  pessoasCount: number;
  /** Identificação pra logs (ex: ensaioId:promptId) */
  jobId?: string;
  /**
   * Story 07 fix bebê — quando `child` ou `toddler`, pulamos swap+enhance.
   * cdingram/face-swap e GFPGAN são treinados em rostos adultos: plastificam
   * traços infantis (cara de boneca, pele lisa demais, olhos idealizados).
   * Pra criança, o output do Nano Banana cru fica mais natural.
   */
  subjectMode?: "adult" | "child" | "toddler";
}

export interface SwapResult {
  buffer: Buffer;
  mimeType: string;
  swap_status: SwapStatus;
  faces_swapped: number;
  cost_cents_swap: number;
  cost_cents_enhance: number;
  /** Mensagens técnicas — só log admin, NUNCA exibir ao user */
  log: string[];
}

const FACE_SWAP_MODEL = (process.env.FACE_SWAP_MODEL ??
  "cdingram/face-swap:d1d6ea8c8be89d664a07a457526f7128109dee7030fdac424788d762c71ed111") as `${string}/${string}` | `${string}/${string}:${string}`;
const FACE_SWAP_TIMEOUT_MS = Number(process.env.FACE_SWAP_TIMEOUT_MS ?? 60000);

// Custo por etapa (centavos) — bate com PRD §2.3
const COST_SWAP_PER_FACE = 8; // R$0,08 por face trocada

let _client: Replicate | null = null;
function client() {
  if (!_client) {
    const token = process.env.REPLICATE_API_TOKEN;
    if (!token) throw new Error("REPLICATE_API_TOKEN missing");
    _client = new Replicate({ auth: token });
  }
  return _client;
}

function withTimeout<T>(p: Promise<T>, ms: number, label: string): Promise<T> {
  return Promise.race([
    p,
    new Promise<T>((_, reject) =>
      setTimeout(() => reject(new Error(`timeout ${label} ${ms}ms`)), ms)
    ),
  ]);
}

function bufferToDataUrl(buf: Buffer, mime: string): string {
  return `data:${mime};base64,${buf.toString("base64")}`;
}

function anchorToDataUrl(a: SwapAnchor): string {
  return `data:${a.mimeType};base64,${a.data}`;
}

/** Extrai URL string do output Replicate (string | array | object com .url()). */
function extractUrl(output: unknown): string | null {
  if (typeof output === "string") return output;
  if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === "string") return first;
    const fn = (first as { url?: () => string })?.url;
    if (typeof fn === "function") return fn();
  }
  if (output && typeof output === "object") {
    const fn = (output as { url?: () => string }).url;
    if (typeof fn === "function") return fn();
  }
  return null;
}

async function downloadAsBuffer(url: string): Promise<{ buf: Buffer; mime: string }> {
  const res = await fetch(url);
  if (!res.ok) throw new Error(`download falhou HTTP ${res.status}`);
  const arr = await res.arrayBuffer();
  return {
    buf: Buffer.from(arr),
    mime: res.headers.get("content-type") ?? "image/jpeg",
  };
}

/** Roda 1 face-swap (uma face). Retorna buffer novo. */
async function runFaceSwap(
  imageBuffer: Buffer,
  imageMime: string,
  anchor: SwapAnchor,
  destFaceIndex: number
): Promise<{ buf: Buffer; mime: string }> {
  const c = client();
  const output = (await withTimeout(
    c.run(FACE_SWAP_MODEL, {
      input: {
        input_image: bufferToDataUrl(imageBuffer, imageMime),
        swap_image: anchorToDataUrl(anchor),
        // cdingram/face-swap aceita estes campos quando suportados pela versão.
        // Se a versão não usar índices, troca a primeira face — comportamento aceitável
        // pra single-pessoa; em multi pode dar overlap mas o pipeline tolera.
        source_face_index: 1,
        destination_face_index: destFaceIndex,
      },
    }),
    FACE_SWAP_TIMEOUT_MS,
    "face-swap"
  )) as unknown;

  const url = extractUrl(output);
  if (!url) throw new Error("face-swap sem URL no output");
  return downloadAsBuffer(url);
}


/**
 * Aplica face-swap + enhance no resultado do Nano Banana.
 *
 * Se `pessoasCount < 2` → skip silencioso (zero custo, retorna original).
 * Se toggle admin `face_swap_enabled` = false → skip silencioso.
 * Toggle controlado em /admin/gastos (system_settings.face_swap_enabled).
 *
 * Em qualquer falha técnica, retorna buffer original + status="failed" — JAMAIS
 * vaza erro pra cima. Caller decide se mostra "Foto pronta" mesmo assim
 * (foto Nano original ainda foi entregue).
 */
export async function applyFaceSwap(input: SwapInput): Promise<SwapResult> {
  const log: string[] = [];

  // Bug 2026-04-27: criança saía artificial mesmo via Nano Banana porque o
  // swap+enhance posterior plastificava o rosto (cdingram + GFPGAN treinados
  // em adulto). Pulamos a pipeline inteira pra child/toddler.
  if (input.subjectMode === "child" || input.subjectMode === "toddler") {
    return {
      buffer: input.imageBuffer,
      mimeType: input.imageMime,
      swap_status: "skipped",
      faces_swapped: 0,
      cost_cents_swap: 0,
      cost_cents_enhance: 0,
      log: [`skip: subjectMode=${input.subjectMode} (face-swap adultiza criança)`],
    };
  }

  const enabled = await isFaceSwapEnabled();
  if (!enabled) {
    return {
      buffer: input.imageBuffer,
      mimeType: input.imageMime,
      swap_status: "skipped",
      faces_swapped: 0,
      cost_cents_swap: 0,
      cost_cents_enhance: 0,
      log: ["skip: toggle admin face_swap_enabled=false"],
    };
  }

  // Story 07 — swap em solo agora é controlado por toggle separado.
  // Nano Banana sozinho em solo inventa traços quando refs têm variação
  // (iluminação, ângulo) — o swap aplica o rosto real por cima.
  if (input.pessoasCount < 2) {
    const soloEnabled = await isFaceSwapSoloEnabled();
    if (!soloEnabled) {
      return {
        buffer: input.imageBuffer,
        mimeType: input.imageMime,
        swap_status: "skipped",
        faces_swapped: 0,
        cost_cents_swap: 0,
        cost_cents_enhance: 0,
        log: ["skip: solo com face_swap_solo_enabled=false"],
      };
    }
  }

  // Limita a 4 pessoas conforme a regra do produto.
  const pessoasCount = Math.min(4, Math.max(1, input.pessoasCount));

  // 1 anchor por pessoa
  const anchorByIdx = new Map<number, SwapAnchor>();
  for (const a of input.anchors) {
    if (!anchorByIdx.has(a.personIdx)) anchorByIdx.set(a.personIdx, a);
  }

  let currentBuf = input.imageBuffer;
  let currentMime = input.imageMime;
  let facesSwapped = 0;
  let swapErrors = 0;

  // Swap por pessoa (face_index = personIdx + 1)
  for (let p = 0; p < pessoasCount; p++) {
    const anchor = anchorByIdx.get(p);
    if (!anchor) {
      log.push(`pessoa ${p}: sem anchor disponível, pulando`);
      swapErrors++;
      continue;
    }
    const t0 = Date.now();
    try {
      const result = await runFaceSwap(currentBuf, currentMime, anchor, p + 1);
      currentBuf = result.buf;
      currentMime = result.mime;
      facesSwapped++;
      log.push(`pessoa ${p}: swap ok (${Date.now() - t0}ms)`);
    } catch (err) {
      swapErrors++;
      const msg = err instanceof Error ? err.message : String(err);
      log.push(`pessoa ${p}: swap falhou — ${msg.slice(0, 100)}`);
      console.warn(`[face-swap] ${input.jobId ?? ""} pessoa=${p}: ${msg}`);
    }
  }

  if (facesSwapped === 0) {
    return {
      buffer: input.imageBuffer,
      mimeType: input.imageMime,
      swap_status: "failed",
      faces_swapped: 0,
      cost_cents_swap: 0,
      cost_cents_enhance: 0,
      log,
    };
  }

  const costSwap = facesSwapped * COST_SWAP_PER_FACE;

  // Enhance final — usa lib/face/enhance.ts (já trata fallback gracioso)
  const enh = await enhanceFace(currentBuf, { timeoutMs: FACE_SWAP_TIMEOUT_MS });
  if (enh.applied) {
    currentBuf = enh.buffer;
    currentMime = enh.mimeType;
    log.push(`enhance ok (${enh.latencyMs}ms)`);
  } else {
    log.push(`enhance falhou ou pulou (entregando swap sem enhance)`);
  }
  const costEnhance = enh.costCents;

  const status: SwapStatus =
    swapErrors === 0 ? "success" : facesSwapped > 0 ? "partial" : "failed";

  return {
    buffer: currentBuf,
    mimeType: currentMime,
    swap_status: status,
    faces_swapped: facesSwapped,
    cost_cents_swap: costSwap,
    cost_cents_enhance: costEnhance,
    log,
  };
}
