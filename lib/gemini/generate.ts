/**
 * Legacy re-export — a lógica real foi movida pra lib/ai/providers.ts
 * com failover Google → Replicate.
 */
export {
  generateEnsaioPhoto,
  type GenerateInput,
  type GenerateResult,
} from "@/lib/ai/providers";
