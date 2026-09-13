/**
 * lib/face/messages.ts
 *
 * Vocabulário neutro user-facing (PRD §1.bis). NUNCA mencionar termo técnico:
 * "face-api", "detecção facial", "modelo", "GPU", "inference", "AI", R$, etc.
 *
 * Todas as strings que aparecem no `<RefUploader>`, `<FaceCropModal>`,
 * `<FaceSelectModal>` ou em mensagens da API DEVEM vir desta lib.
 */

import type { QualityLabel, QualityReason } from "./quality";

export const QUALITY_LABEL_TEXT: Record<QualityLabel, string> = {
  green: "Boa pra IA",
  yellow: "Pode funcionar, resultado vai variar",
  red: "Muito ruim, recomendamos outra",
};

export const QUALITY_LABEL_EMOJI: Record<QualityLabel, string> = {
  green: "✅",
  yellow: "⚠️",
  red: "❌",
};

const REASON_TEXT: Record<QualityReason, string> = {
  ok: "Ótima foto pra IA.",
  no_face: "Não conseguimos enxergar um rosto. Tente outra foto.",
  face_too_small: "O rosto tá pequeno demais. Recomendamos recortar.",
  blur: "Foto fora de foco. Tente outra com mais nitidez.",
  too_dark: "Foto escura demais. Tente uma com mais luz.",
  too_bright: "Foto estourada de luz. Tente uma mais equilibrada.",
  multiple_faces: "Mais de uma pessoa na foto — escolha qual é a Pessoa desta aba.",
  side_profile: "Rosto de lado. Prefira foto frontal.",
  unknown: "Não conseguimos analisar essa foto. Tente outra.",
};

export function reasonText(reason: QualityReason): string {
  return REASON_TEXT[reason] ?? REASON_TEXT.unknown;
}

/** Mensagem de bloqueio quando 100% das refs de uma pessoa = vermelho (AC6.8). */
export function blockGenerationMessage(personLabel: string): string {
  return `Adicione pelo menos 1 foto frontal nítida de ${personLabel}.`;
}

/** Texto do CTA "recortar foto" — NUNCA "crop facial" / "face crop". */
export const CROP_CTA_TEXT = "Recortar foto";

/** Modal de escolha de rosto em foto de grupo. */
export function faceSelectPrompt(personLabel: string): string {
  return `Escolha o rosto de ${personLabel}`;
}

/** Aviso de fallback (browser sem WebGL ou modelo não carregou). */
export const ANALYSIS_UNAVAILABLE =
  "Não conseguimos analisar essa foto agora. Suba outra se possível.";
