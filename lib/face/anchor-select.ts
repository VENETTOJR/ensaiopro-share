/**
 * lib/face/anchor-select.ts
 *
 * Story 04 — AC2.2.
 *
 * Seleciona a melhor "anchor" (foto de referência mais frontal/limpa) por pessoa.
 * Score = `image_width × image_height × (area_pct / 100)`.
 *
 * Tie-break: ref com `quality_label = 'green'` ganha sobre `yellow` que ganha
 * sobre `red` / `null`.
 *
 * Usa exclusivamente metadados já calculados pela Story 01 (lib/face/quality.ts).
 * Se a ref ainda não tem `quality_metadata` (rollout intermediário), cai pra
 * fallback heurístico simples (maior `size_bytes`).
 *
 * NÃO importa face-api aqui — esta lib roda no servidor, no worker de geração.
 */
import type { QualityLabel, QualityMetadata } from "./quality";

export interface AnchorRef {
  /** ID da row em fotos_referencia. */
  id?: string;
  /** Caminho no bucket `references`. */
  storage_path: string;
  /** Buffer já baixado e pré-processado (JPEG ≤1024). */
  buffer: Buffer;
  /** MIME real do buffer. */
  mimeType: string;
  /** Index da pessoa (0..pessoasCount-1). */
  pessoaIdx: number;
  /** Bytes do upload original — usado como fallback de score. */
  size_bytes?: number | null;
  /** Label calculado pela Story 01 (client-side). */
  quality_label?: QualityLabel | null;
  /** Métricas detalhadas (faces, area_pct, blur_score, etc). */
  quality_metadata?: QualityMetadata | null;
}

const LABEL_RANK: Record<QualityLabel, number> = {
  green: 3,
  yellow: 2,
  red: 1,
};

function rankLabel(label: QualityLabel | null | undefined): number {
  if (!label) return 0;
  return LABEL_RANK[label] ?? 0;
}

function metadataScore(meta: QualityMetadata | null | undefined): number {
  if (!meta) return 0;
  const w = Number(meta.image_width) || 0;
  const h = Number(meta.image_height) || 0;
  const areaPct = Number(meta.area_pct) || 0;
  if (w <= 0 || h <= 0 || areaPct <= 0) return 0;
  // resolução × área da face (em pixels reais).
  return w * h * (areaPct / 100);
}

/**
 * Score composto pra ordenar refs de uma mesma pessoa, do melhor pro pior anchor.
 * Maior = melhor.
 */
export function scoreRef(ref: AnchorRef): number {
  const meta = metadataScore(ref.quality_metadata ?? null);
  if (meta > 0) return meta;
  // Fallback puro quando Story 01 ainda não rodou: usa tamanho do arquivo
  // como proxy de resolução. Não é perfeito mas evita sempre cair na primeira.
  return Number(ref.size_bytes) || 1;
}

/**
 * Escolhe O MELHOR anchor pra UMA pessoa específica dentre suas refs.
 *
 * Regra:
 *   1) Se houver ref(s) com `quality_label = 'green'`, escolhe entre elas;
 *   2) senão, entre as `yellow`;
 *   3) senão, entre o resto.
 *   4) Dentro do bucket vencedor, pega a de maior `scoreRef()`.
 *
 * Garante que NUNCA cai em ref `red` se houver alternativa com label melhor.
 * Se `refs` vier vazio, retorna `null`.
 */
export function selectAnchor(refs: AnchorRef[]): AnchorRef | null {
  if (!refs || refs.length === 0) return null;

  // Agrupa por rank de label
  const byRank = new Map<number, AnchorRef[]>();
  for (const r of refs) {
    const rank = rankLabel(r.quality_label ?? null);
    const list = byRank.get(rank) ?? [];
    list.push(r);
    byRank.set(rank, list);
  }
  // Pega o maior rank disponível (3 → 2 → 1 → 0)
  const ranks = Array.from(byRank.keys()).sort((a, b) => b - a);
  for (const rank of ranks) {
    const bucket = byRank.get(rank)!;
    bucket.sort((a, b) => scoreRef(b) - scoreRef(a));
    if (bucket.length > 0) return bucket[0];
  }
  return refs[0];
}

/**
 * Recebe TODAS as refs do ensaio (já agrupadas por `pessoaIdx`) e devolve um
 * mapa pessoaIdx → melhor anchor. Pessoas sem nenhum anchor são omitidas.
 */
export function selectAnchorsByPessoa(
  refs: AnchorRef[],
  pessoasCount: number,
): Map<number, AnchorRef> {
  const out = new Map<number, AnchorRef>();
  for (let i = 0; i < pessoasCount; i++) {
    const own = refs.filter((r) => r.pessoaIdx === i);
    const anchor = selectAnchor(own);
    if (anchor) out.set(i, anchor);
  }
  return out;
}
