/**
 * lib/face/loader.ts
 *
 * Lazy loader de @vladmandic/face-api. Único arquivo do projeto que importa
 * o pacote pesado. Sempre via `dynamic import()` pra preservar bundle inicial
 * (AC6.1, NFR-6.1: bundle inicial NÃO pode crescer >50KB).
 *
 * Modelos servidos de `/models/face-api/` (copiados em build do node_modules).
 *
 * Cache: o pacote é carregado UMA vez por sessão. Se carga falhar, retorna
 * `null` e o caller cai pro fallback (aceita upload sem classificar).
 */

import {
  type FaceBox,
  type QualityResult,
  classify,
  computeImageMetrics,
  imageToImageData,
} from "./quality";

type FaceApi = typeof import("@vladmandic/face-api");

const MODEL_URL = "/models/face-api";

let faceApiPromise: Promise<FaceApi | null> | null = null;

/**
 * Carrega face-api + modelos. Idempotente. Em caso de falha (ex: WebGL off),
 * retorna `null` — caller deve tratar fallback (label `null`, aviso neutro).
 */
export function loadFaceApi(): Promise<FaceApi | null> {
  if (faceApiPromise) return faceApiPromise;
  faceApiPromise = (async () => {
    try {
      const faceApi = await import("@vladmandic/face-api");
      // Detector leve + landmarks pra eventual frontalização futura.
      await Promise.all([
        faceApi.nets.tinyFaceDetector.loadFromUri(MODEL_URL),
        faceApi.nets.faceLandmark68Net.loadFromUri(MODEL_URL),
      ]);
      return faceApi;
    } catch (err) {
      // Não logar com termo técnico em UI — caller usa string neutra.
      console.error("[face/loader] init failed:", err);
      return null;
    }
  })();
  return faceApiPromise;
}

/**
 * Carrega um File como `HTMLImageElement` decodificado.
 * Útil pra rodar detector e canvas operations.
 */
export function fileToImage(file: File): Promise<HTMLImageElement> {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      // Não revoga aqui — caller pode precisar redrawar o mesmo img várias vezes.
      // Quem invoca é responsável por revogar via `URL.revokeObjectURL(img.src)`.
      resolve(img);
    };
    img.onerror = () => {
      URL.revokeObjectURL(url);
      reject(new Error("image_decode_failed"));
    };
    img.src = url;
  });
}

/**
 * Pipeline completo: File → QualityResult.
 *
 * 1. Decodifica File pra Image
 * 2. Lazy-loada face-api e roda tinyFaceDetector
 * 3. Calcula brilho + blur via Laplaciano
 * 4. Combina via `classify()`
 *
 * Em caso de falha (modelo não carregou ou WebGL off), retorna label "yellow"
 * com reason "unknown" — NÃO bloqueia upload.
 */
export async function analyzeFile(file: File): Promise<QualityResult> {
  const img = await fileToImage(file);
  try {
    const result = await analyzeImage(img);
    return result;
  } finally {
    URL.revokeObjectURL(img.src);
  }
}

/**
 * Versão que recebe `HTMLImageElement` já decodificada — útil pro modal de
 * crop, que precisa rodar detector na imagem original e na imagem cortada.
 */
export async function analyzeImage(img: HTMLImageElement): Promise<QualityResult> {
  const faceApi = await loadFaceApi();

  // Brilho/blur sempre roda — não depende de modelo
  const data = imageToImageData(img, 512);
  const { brightness, blur_score } = computeImageMetrics(data);

  let faces: FaceBox[] = [];
  if (faceApi) {
    try {
      const detections = await faceApi.detectAllFaces(
        img,
        new faceApi.TinyFaceDetectorOptions({ inputSize: 320, scoreThreshold: 0.45 })
      );
      faces = detections
        .map((d) => ({
          x: d.box.x,
          y: d.box.y,
          width: d.box.width,
          height: d.box.height,
          score: d.score,
        }))
        .sort((a, b) => b.width * b.height - a.width * a.height);
    } catch (err) {
      console.error("[face/loader] detect failed:", err);
    }
  }

  const imgArea = img.naturalWidth * img.naturalHeight;
  const biggestFace = faces[0];
  const area_pct = biggestFace
    ? ((biggestFace.width * biggestFace.height) / imgArea) * 100
    : 0;

  // Se face-api não carregou, marcamos label amarelo + reason unknown (fallback).
  if (!faceApi) {
    return {
      label: "yellow",
      faces: [],
      metadata: {
        faces: 0,
        area_pct: 0,
        blur_score,
        brightness,
        image_width: img.naturalWidth,
        image_height: img.naturalHeight,
        reason: "unknown",
      },
    };
  }

  const { label, reason } = classify({
    faces: faces.length,
    area_pct,
    blur_score,
    brightness,
  });

  return {
    label,
    faces,
    metadata: {
      faces: faces.length,
      area_pct,
      blur_score,
      brightness,
      image_width: img.naturalWidth,
      image_height: img.naturalHeight,
      reason,
    },
  };
}

/**
 * Recorta uma região retangular de uma `HTMLImageElement` e retorna File JPEG.
 * Usado pelo `<FaceCropModal>` e pela auto-seleção em foto de grupo.
 *
 * Adiciona padding configurável (default 25%) ao redor do bounding box pra
 * incluir cabelo/queixo (necessário pra face-swap).
 */
export async function cropToFile(
  img: HTMLImageElement,
  box: { x: number; y: number; width: number; height: number },
  baseName: string,
  paddingPct = 0.25
): Promise<File> {
  const padX = box.width * paddingPct;
  const padY = box.height * paddingPct;
  const sx = Math.max(0, box.x - padX);
  const sy = Math.max(0, box.y - padY);
  const sw = Math.min(img.naturalWidth - sx, box.width + padX * 2);
  const sh = Math.min(img.naturalHeight - sy, box.height + padY * 2);

  const canvas = document.createElement("canvas");
  canvas.width = Math.round(sw);
  canvas.height = Math.round(sh);
  const ctx = canvas.getContext("2d");
  if (!ctx) throw new Error("canvas_unavailable");
  ctx.drawImage(img, sx, sy, sw, sh, 0, 0, sw, sh);

  const blob = await new Promise<Blob | null>((resolve) =>
    canvas.toBlob(resolve, "image/jpeg", 0.92)
  );
  if (!blob) throw new Error("canvas_toblob_failed");

  const safeName = baseName.replace(/\.[^.]+$/, "") + "-crop.jpg";
  return new File([blob], safeName, { type: "image/jpeg" });
}
