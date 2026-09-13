/**
 * Slugs de ensaio que representam crianças. Centralizam toda lógica
 * que dependia de `slug === "bebe"` antes do split menino/menina.
 *
 * Regras associadas:
 * - idade obrigatória no formulário
 * - injeção do bloco "CRITICAL AGE LOCK" no prompt (run-generation)
 * - subjectMode = child/toddler em vez de adult (run-generation)
 * - default toddler "3" quando idade ausente em vez de adulto "30"
 */

export const INFANTIL_SLUGS = ["bebe", "bebe-masc"] as const;

export type InfantilSlug = (typeof INFANTIL_SLUGS)[number];

export function isInfantilSlug(slug: string | null | undefined): boolean {
  if (!slug) return false;
  return (INFANTIL_SLUGS as readonly string[]).includes(slug);
}
