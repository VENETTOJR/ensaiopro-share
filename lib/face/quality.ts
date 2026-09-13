/**
 * lib/face/quality.ts
 *
 * Heurística client-side de qualidade de foto de referência.
 * Story 01 — AC6.1, AC6.2, AC6.3, AC6.10.
 *
 * Estratégia:
 *   - face-api é carregado via `dynamic import()` no callsite (NÃO importar
 *     estaticamente aqui — quebraria SSR e estouraria bundle inicial).
 *   - Esta lib expõe puramente a heurística + tipos. O loader de modelos vive
 *     em `lib/face/loader.ts` e é o único lugar que importa @vladmandic/face-api.
 *   - Toda string user-facing passa por `lib/face/messages.ts` pra garantir
 *     vocabulário neutro (princípio §1.bis do PRD).
 */

export type QualityLabel = "green" | "yellow" | "red";

export interface FaceBox {
  /** Coordenadas absolutas em pixels da imagem original. */
  x: number;
  y: number;
  width: number;
  height: number;
  /** Score de confiança do detector (0..1). */
  score: number;
}

export interface QualityMetadata {
  /** Quantidade de faces detectadas. */
  faces: number;
  /** % da área da maior face em relação à imagem (0..100). */
  area_pct: number;
  /** Score de blur (variância do Laplaciano). >100 = nítido; <50 = borrado. */
  blur_score: number;
  /** Brilho médio (0..255). */
  brightness: number;
  /** Largura da imagem original em pixels. */
  image_width: number;
  /** Altura da imagem original em pixels. */
  image_height: number;
  /** Motivo neutro do label (chave canônica — não a string user-facing). */
  reason: QualityReason;
}

export type QualityReason =
  | "ok"
  | "no_face"
  | "face_too_small"
  | "blur"
  | "too_dark"
  | "too_bright"
  | "multiple_faces"
  | "side_profile"
  | "unknown";

export interface QualityResult {
  label: QualityLabel;
  metadata: QualityMetadata;
  /** Bounding boxes de TODAS as faces detectadas (ordem decrescente por área). */
  faces: FaceBox[];
}

/**
 * Limiares calibrados pra refs de face-swap.
 * Extraídos de empiria interna + benchmark de PRD §5 Feature 6.
 */
export const QUALITY_THRESHOLDS = {
  /** Área mínima da face (% da imagem) pra label verde. */
  AREA_GREEN_PCT: 20,
  /** Área mínima da face (% da imagem) pra label amarelo. Abaixo = vermelho. */
  AREA_YELLOW_PCT: 8,
  /** Variância do Laplaciano: acima = nítido. */
  BLUR_GREEN: 100,
  /** Variância do Laplaciano: abaixo = borrado. */
  BLUR_RED: 40,
  /** Brilho médio: abaixo = escuro demais. */
  BRIGHTNESS_MIN: 55,
  /** Brilho médio: acima = estourado. */
  BRIGHTNESS_MAX: 225,
  /** Confiança mínima do detector pra contar como face. */
  FACE_CONFIDENCE_MIN: 0.45,
} as const;

/**
 * Combina métricas de baixo nível em um label e um motivo.
 * Pure function — testável sem browser. Recebe métricas já extraídas.
 */
export function classify(metrics: {
  faces: number;
  area_pct: number;
  blur_score: number;
  brightness: number;
}): { label: QualityLabel; reason: QualityReason } {
  const { faces, area_pct, blur_score, brightness } = metrics;

  if (faces === 0) {
    return { label: "red", reason: "no_face" };
  }

  // Imagem inutilizável independente das demais métricas
  if (area_pct < QUALITY_THRESHOLDS.AREA_YELLOW_PCT) {
    return { label: "red", reason: "face_too_small" };
  }
  if (blur_score < QUALITY_THRESHOLDS.BLUR_RED) {
    return { label: "red", reason: "blur" };
  }

  // Múltiplas faces nunca pode ser verde (user precisa escolher 1)
  if (faces > 1) {
    return { label: "yellow", reason: "multiple_faces" };
  }

  // Brilho fora de faixa derruba pra amarelo
  if (brightness < QUALITY_THRESHOLDS.BRIGHTNESS_MIN) {
    return { label: "yellow", reason: "too_dark" };
  }
  if (brightness > QUALITY_THRESHOLDS.BRIGHTNESS_MAX) {
    return { label: "yellow", reason: "too_bright" };
  }

  // Área entre yellow e green = amarelo
  if (area_pct < QUALITY_THRESHOLDS.AREA_GREEN_PCT) {
    return { label: "yellow", reason: "face_too_small" };
  }

  // Blur entre green e red = amarelo
  if (blur_score < QUALITY_THRESHOLDS.BLUR_GREEN) {
    return { label: "yellow", reason: "blur" };
  }

  return { label: "green", reason: "ok" };
}

/**
 * Calcula brilho médio (0..255) e variância do Laplaciano (proxy de blur)
 * de uma ImageData. Pure-ish (depende só de Uint8ClampedArray).
 *
 * Implementação propositalmente simples — roda em <50ms em 1024x1024 num
 * smartphone médio (NFR-6.2).
 */
export function computeImageMetrics(imageData: ImageData): {
  brightness: number;
  blur_score: number;
} {
  const { data, width, height } = imageData;
  const pixels = width * height;

  // 1) Brilho médio + grayscale buffer
  const gray = new Float32Array(pixels);
  let sumLuma = 0;
  for (let i = 0, p = 0; i < data.length; i += 4, p++) {
    // Luma rec601
    const luma = 0.299 * data[i] + 0.587 * data[i + 1] + 0.114 * data[i + 2];
    gray[p] = luma;
    sumLuma += luma;
  }
  const brightness = sumLuma / pixels;

  // 2) Laplaciano 3x3: kernel [0,1,0; 1,-4,1; 0,1,0]
  // Calcula em amostragem (passo 2) pra ganhar perf — irrelevante pra heurística.
  let sum = 0;
  let sumSq = 0;
  let count = 0;
  for (let y = 1; y < height - 1; y += 2) {
    for (let x = 1; x < width - 1; x += 2) {
      const c = gray[y * width + x];
      const t = gray[(y - 1) * width + x];
      const b = gray[(y + 1) * width + x];
      const l = gray[y * width + (x - 1)];
      const r = gray[y * width + (x + 1)];
      const lap = t + b + l + r - 4 * c;
      sum += lap;
      sumSq += lap * lap;
      count++;
    }
  }
  const mean = sum / count;
  const variance = sumSq / count - mean * mean;
  const blur_score = Math.max(0, variance);

  return { brightness, blur_score };
}

/**
 * Reduz uma `HTMLImageElement` ou `ImageBitmap` pra ImageData
 * num tamanho máximo (downscale mantendo proporção). Reduz custo de Laplaciano
 * sem perder fidelidade de brilho/blur perceptual.
 */
export function imageToImageData(
  source: HTMLImageElement | HTMLCanvasElement | ImageBitmap,
  maxSide = 512
): ImageData {
  const sw = "naturalWidth" in source ? source.naturalWidth : source.width;
  const sh = "naturalHeight" in source ? source.naturalHeight : source.height;
  const scale = Math.min(1, maxSide / Math.max(sw, sh));
  const w = Math.max(1, Math.round(sw * scale));
  const h = Math.max(1, Math.round(sh * scale));

  const canvas = document.createElement("canvas");
  canvas.width = w;
  canvas.height = h;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) {
    throw new Error("canvas_unavailable");
  }
  ctx.drawImage(source as CanvasImageSource, 0, 0, w, h);
  return ctx.getImageData(0, 0, w, h);
}
