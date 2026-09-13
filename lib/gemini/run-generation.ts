/**
 * Background worker que processa um ensaio:
 *  - baixa as fotos de referência do Storage
 *  - pré-processa com sharp (resize 1024, JPEG 92% mozjpeg, auto-rotate EXIF)
 *  - pra cada prompt: chama o modelo de IA, salva no Storage, registra em fotos_geradas
 *  - atualiza progresso em ensaios.total_generated
 *  - ao fim marca status=completed (ou failed)
 *  - DEVOLVE créditos proporcionalmente ao número de falhas
 */

import { createClient as createAdmin } from "@supabase/supabase-js";
import sharp from "sharp";
import { generateEnsaioPhoto } from "./generate";
import { applyFaceSwap, type SwapAnchor } from "@/lib/face/swap-pipeline";
import type { QualityLabel, QualityMetadata } from "@/lib/face/quality";
import { isInfantilSlug } from "@/lib/ensaio-slugs";

const SUPABASE_URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const SERVICE_ROLE = process.env.SUPABASE_SERVICE_ROLE_KEY!;

const MIN_REFS_REQUIRED = 1; // aceita 1 ref (qualidade menor). Ideal 4+
const REF_MAX_DIMENSION = 1024; // Gemini performa melhor com ≤1024
// Story 07 — Reduzido temporariamente de 3 → 1 para evitar rate limit do
// Replicate quando saldo < US$5 (limite "burst of 1"). Cada foto roda
// sequencial: Flux+PuLID/Nano → face-swap → enhance, uma de cada vez.
// Trade-off: ensaio demora 3x mais, mas todas as fotos passam pelo
// pipeline completo sem cair em rate limit.
const CONCURRENCY = 1;

export interface RunInput {
  ensaioId: string;
  userId: string;
  promptIds: string[];
  referencePaths: string[];
  pessoasCount?: number;
  pessoaLabels?: string[];
  /** Story 06 — texto livre quando source='freestyle'. Substitui prompts. */
  freestyleText?: string;
  /** Story 06 ext — 'fast' (Gemini) | 'detailed' (GPT Image 1 high). Default 'fast'. */
  generationTier?: "fast" | "detailed";
  /** Slug do tipo de ensaio — usado para roteamento por tipo no gerador. */
  ensaioTypeSlug?: string;
}

export async function runGeneration(input: RunInput) {
  const admin = createAdmin(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  async function refund(amount: number) {
    if (amount <= 0) return;
    await admin.rpc("add_credits", {
      p_user_id: input.userId,
      p_amount: amount,
    });
    console.log(`[ensaio ${input.ensaioId}] refunded ${amount} credits`);
  }

  async function markFailed() {
    await admin
      .from("ensaios")
      .update({ status: "failed", completed_at: new Date().toISOString() })
      .eq("id", input.ensaioId);
  }

  // 1. meta do ensaio (pra idade) + prompts
  const { data: ensaioMeta } = await admin
    .from("ensaios")
    .select("idade")
    .eq("id", input.ensaioId)
    .single();
  const idade = ensaioMeta?.idade ?? null;

  // Story 06 — modo freestyle: 1 prompt sintético com o texto do user
  let prompts: Array<{ id: string; numero: number; texto: string; categoria: string | null }>;
  if (input.freestyleText) {
    prompts = [
      {
        id: `freestyle-${input.ensaioId}`,
        numero: 1,
        texto: `Ultra-realistic photo, 8K resolution. ${input.freestyleText}\n\nFacial features accurately matched from the provided reference image. Hairstyle, hair texture, hair length, and hair color accurately matched from the provided reference image. Body type, physical build, proportions, and overall physique accurately matched from the provided reference image.`,
        categoria: "freestyle",
      },
    ];
  } else {
    const { data: dbPrompts, error: promptsErr } = await admin
      .from("prompts")
      .select("id, numero, texto, categoria")
      .in("id", input.promptIds);
    if (promptsErr || !dbPrompts || dbPrompts.length === 0) {
      await markFailed();
      await refund(input.promptIds.length);
      return;
    }
    prompts = dbPrompts;
  }

  // 2. Carrega refs já com pessoa_index + qualidade (pra escolher a melhor por pessoa)
  const { data: refRows } = await admin
    .from("fotos_referencia")
    .select("id, storage_path, pessoa_index, size_bytes, quality_label, quality_metadata")
    .eq("ensaio_id", input.ensaioId)
    .order("pessoa_index", { ascending: true })
    .order("sort_order", { ascending: true });

  const refList = refRows && refRows.length > 0
    ? refRows.map((r) => ({
        id: r.id as string,
        path: r.storage_path as string,
        personIdx: (r.pessoa_index ?? 0) as number,
        size_bytes: r.size_bytes as number | null,
        quality_label: r.quality_label as QualityLabel | null,
        quality_metadata: r.quality_metadata as QualityMetadata | null,
      }))
    : input.referencePaths.map((p) => ({
        id: p,
        path: p,
        personIdx: 0,
        size_bytes: null,
        quality_label: null,
        quality_metadata: null,
      }));

  const refs: Array<{
    id: string;
    data: string;
    buffer: Buffer;
    mimeType: string;
    personIdx: number;
    size_bytes: number | null;
    quality_label: QualityLabel | null;
    quality_metadata: QualityMetadata | null;
  }> = [];
  for (const r of refList) {
    const { data, error } = await admin.storage.from("references").download(r.path);
    if (error || !data) {
      console.warn(`[ensaio ${input.ensaioId}] ref download failed: ${r.path}`);
      continue;
    }
    try {
      const rawBuf = Buffer.from(await data.arrayBuffer());
      const processed = await sharp(rawBuf)
        .rotate()
        .resize(REF_MAX_DIMENSION, REF_MAX_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer();
      refs.push({
        id: r.id,
        data: processed.toString("base64"),
        buffer: processed,
        mimeType: "image/jpeg",
        personIdx: r.personIdx,
        size_bytes: r.size_bytes,
        quality_label: r.quality_label,
        quality_metadata: r.quality_metadata,
      });
    } catch (err) {
      console.warn(`[ensaio ${input.ensaioId}] sharp falhou em ${r.path}:`, err);
    }
  }

  if (refs.length < MIN_REFS_REQUIRED) {
    console.error(
      `[ensaio ${input.ensaioId}] refs insuficientes: ${refs.length}/${MIN_REFS_REQUIRED}`
    );
    await markFailed();
    await refund(input.promptIds.length);
    return;
  }

  const pessoasCount = input.pessoasCount ?? 1;
  const pessoaLabels = input.pessoaLabels ?? [];

  // Mandamos TODAS as refs pro Gemini. Anchor-select (1/pessoa) degradava
  // identidade quando user sobe 2-3 refs — modelo precisa de redundância
  // facial pra travar traços. Validado 25/04: 2 refs sem todas → cabelo
  // muda entre prompts, corpo varia. 10 refs com todas → consistente.
  // FIX 2026-04-26 — Ordenamos por qualidade ANTES de mandar pros providers,
  // pra que Runware (que pega só as 4 primeiras por personIdx) receba as melhores.
  function metaScore(meta: QualityMetadata | null): number {
    if (!meta) return 0;
    const w = Number(meta.image_width) || 0;
    const h = Number(meta.image_height) || 0;
    const areaPct = Number(meta.area_pct) || 0;
    if (w <= 0 || h <= 0 || areaPct <= 0) return 0;
    return w * h * (areaPct / 100);
  }
  function labelRank(l: QualityLabel | null): number {
    return l === "green" ? 3 : l === "yellow" ? 2 : l === "red" ? 1 : 0;
  }
  const geminiRefs = [...refs].sort((a, b) => {
    if (a.personIdx !== b.personIdx) return a.personIdx - b.personIdx;
    const lr = labelRank(b.quality_label) - labelRank(a.quality_label);
    if (lr !== 0) return lr;
    const ms = metaScore(b.quality_metadata) - metaScore(a.quality_metadata);
    if (ms !== 0) return ms;
    return (b.size_bytes ?? 0) - (a.size_bytes ?? 0);
  });

  console.log(
    `[ensaio ${input.ensaioId}] start: ${refs.length} refs total, ${geminiRefs.length} pro gemini (todas), ${prompts.length} prompts, ${pessoasCount} pessoas`
  );

  // 3. Substitui placeholders + worker pool com concorrência
  // Story 07 fix — Idades 1-9 estavam saindo como "55", "77" etc porque
  // muitos prompts dizem "two balloons shaped as the number {idade}"
  // (pensado pra 2 dígitos: "two balloons forming 52" = balão 5 + balão 2).
  // Quando idade=5, renderiza 2 balões "5" cada = "55" visualmente.
  // Corrigimos com instrução forte anti-duplicação no fim do prompt.
  function fillPlaceholders(texto: string, categoria: string | null): string {
    // Bug 2026-04-27: quando categoria=bebe e idade=null, fallback "30" gerava
    // "30-year-old child" (contradição) e modelo renderizava adulto. Pra bebê
    // sem idade, default toddler "3" (cenário "Ensaio Infantil" sem idade
    // declarada deve presumir criança pequena, não adulto). Mesma regra vale
    // pro slug bebe-masc (Ensaio Infantil Masculino).
    const isBebe = isInfantilSlug(categoria);
    const idadeStr =
      idade !== null && idade !== undefined
        ? String(idade)
        : isBebe
          ? "3"
          : "30";
    let base = texto.replace(/\{idade\}/g, idadeStr);

    // Story 07 fix bebê — quando categoria='bebe', injeta bloco de preservação
    // infantil ANTES do prompt de cena. Os prompts da categoria 'bebe' no banco
    // foram escritos com poses/roupas de criança 5-9 anos, e o bloco genérico
    // de preservação não trava idade — modelo "envelhecia" o sujeito pra caber
    // na cena. Bloco abaixo trava idade e proporções na fonte.
    const isToddler =
      isBebe &&
      ((idade !== null && idade !== undefined && idade <= 3) || idade === null || idade === undefined);
    if (isBebe) {
      const ageGuard = isToddler
        ? `CRITICAL AGE LOCK — The subject is a ${idadeStr}-year-old TODDLER. ` +
          `Render with toddler proportions: relatively larger head, shorter limbs, ` +
          `softer rounded facial features, smaller body, baby teeth. ` +
          `Do NOT render as a child of 5+ years old. Do NOT render as teenager or adult. ` +
          `If the scene description requires older motor skills (kneeling on one knee, ` +
          `arms fully raised triumphantly, holding heavy objects, sophisticated standing pose), ` +
          `simplify to age-appropriate posture: seated, supported standing, or natural toddler stance. ` +
          `Outfits must fit a ${idadeStr}-year-old body (not a model's body).`
        : `CRITICAL AGE LOCK — The subject is a ${idadeStr}-year-old child. ` +
          `Preserve child facial proportions, child body size, and natural child skin texture. ` +
          `Do NOT render as a teenager or adult. Do NOT idealize features or apply makeup. ` +
          `Do NOT make the face look older than ${idadeStr}.`;
      base = ageGuard + "\n\n" + base;
    }

    if (idadeStr.length === 1) {
      return (
        base +
        `\n\nCRITICAL NUMBER RENDERING — The age is ${idadeStr} (a SINGLE digit). ` +
        `When the scene includes balloons, candles, or decorations shaped as the number ${idadeStr}, ` +
        `show EXACTLY ONE decoration with the digit "${idadeStr}". ` +
        `Do NOT place two "${idadeStr}" decorations side by side (this would look like "${idadeStr}${idadeStr}"). ` +
        `Do NOT duplicate the digit. The total visible age must read "${idadeStr}", never "${idadeStr}${idadeStr}" or any multi-digit form. ` +
        `If the prompt mentions "two number-shaped" items, interpret as ONE item showing "${idadeStr}".`
      );
    }
    return base;
  }

  function inferSubjectMode(categoria: string | null): "adult" | "child" | "toddler" {
    if (!isInfantilSlug(categoria)) return "adult";
    // Bug 2026-04-27: idade=null com categoria=bebe caía em "child" e ainda
    // passava por Flux+PuLID/Runware (que adultizam). Default toddler é seguro.
    if (idade === null || idade === undefined) return "toddler";
    if (idade <= 3) return "toddler";
    return "child";
  }

  let completed = 0;
  let failed = 0;
  const promptList = prompts;

  type Prompt = (typeof promptList)[number];
  async function handlePrompt(p: Prompt) {
    try {
      const result = await generateEnsaioPhoto({
        prompt: fillPlaceholders(p.texto, p.categoria),
        referenceImages: geminiRefs,
        seedKey: `${input.ensaioId}:${p.id}`,
        pessoasCount,
        pessoaLabels,
        tier: input.generationTier ?? "fast",
        subjectMode: inferSubjectMode(p.categoria),
        ensaioTypeSlug: input.ensaioTypeSlug,
      });

      let finalBuf = Buffer.from(result.imageBase64, "base64");
      let finalMime = result.mimeType;

      // Story 07 — Se geração já foi via Flux+PuLID (cost_cents_base >= 25),
      // o PuLID já travou identidade na geração. Skipar face-swap economiza
      // 2 chamadas Replicate por foto (swap+enhance) — crítico em rate limit.
      const usedFluxPulid = result.cost_cents_base >= 25 && result.provider === "replicate";

      const anchors: SwapAnchor[] = refs.map((r) => ({
        data: r.data,
        mimeType: r.mimeType,
        personIdx: r.personIdx,
      }));
      const swap = usedFluxPulid
        ? {
            buffer: finalBuf,
            mimeType: finalMime,
            swap_status: "skipped" as const,
            faces_swapped: 0,
            cost_cents_swap: 0,
            cost_cents_enhance: 0,
            log: ["skip: já passou por Flux+PuLID (identity locked)"],
          }
        : await applyFaceSwap({
            imageBuffer: finalBuf,
            imageMime: finalMime,
            anchors,
            pessoasCount,
            jobId: `${input.ensaioId}:${p.id}`,
            subjectMode: inferSubjectMode(p.categoria),
          });
      finalBuf = Buffer.from(swap.buffer);
      finalMime = swap.mimeType;

      const outExt = finalMime.includes("png") ? "png" : "jpg";
      const storagePath = `${input.userId}/${input.ensaioId}/${p.id}.${outExt}`;

      const { error: upErr } = await admin.storage
        .from("generated")
        .upload(storagePath, finalBuf, {
          contentType: finalMime,
          upsert: true,
        });
      if (upErr) throw upErr;

      // Custo granular (Story 03 — FR-4.1, AC4.7) + Story 04 (swap/enhance).
      // O trigger fg_sync_cost_cents recalcula `cost_cents` automaticamente.
      // prompt_id null em freestyle (id sintético, não existe em prompts table)
      const isFreestylePrompt = p.id.startsWith("freestyle-");
      await admin.from("fotos_geradas").insert({
        ensaio_id: input.ensaioId,
        user_id: input.userId,
        prompt_id: isFreestylePrompt ? null : p.id,
        prompt_numero: p.numero,
        prompt_categoria: p.categoria,
        storage_path: storagePath,
        status: "completed",
        cost_cents_nano: result.cost_cents_base,
        cost_cents_swap: swap.cost_cents_swap,
        cost_cents_enhance: swap.cost_cents_enhance,
        swap_status: swap.swap_status,
        provider_used: result.provider,
      });

      completed++;
      console.log(`[ensaio ${input.ensaioId}] ✓ #${p.numero} (${completed}/${promptList.length})`);
    } catch (err) {
      failed++;
      const errMsg = err instanceof Error ? err.message : String(err);
      console.error(`[ensaio ${input.ensaioId}] ❌ #${p.numero}:`, errMsg.slice(0, 300));

      await admin.from("fotos_geradas").insert({
        ensaio_id: input.ensaioId,
        user_id: input.userId,
        prompt_id: p.id.startsWith("freestyle-") ? null : p.id,
        prompt_numero: p.numero,
        prompt_categoria: p.categoria,
        storage_path: "",
        status: "failed",
        error_message: errMsg,
      });
    } finally {
      await admin
        .from("ensaios")
        .update({
          total_generated: completed,
          total_failed: failed,
        })
        .eq("id", input.ensaioId);
    }
  }

  // Worker pool
  let cursor = 0;
  async function worker() {
    while (true) {
      const idx = cursor++;
      if (idx >= promptList.length) return;
      await handlePrompt(promptList[idx]);
    }
  }
  await Promise.all(
    Array.from({ length: Math.min(CONCURRENCY, promptList.length) }, worker)
  );

  // 4. Finaliza + devolve créditos das falhas
  await admin
    .from("ensaios")
    .update({
      status: completed > 0 ? "completed" : "failed",
      total_generated: completed,
      total_failed: failed,
      completed_at: new Date().toISOString(),
    })
    .eq("id", input.ensaioId);

  await refund(failed);
  console.log(`[ensaio ${input.ensaioId}] done: ${completed} ok / ${failed} failed`);
}

/**
 * Reprocessa uma única foto que o user quer refazer.
 * Consome 1 crédito (se sucesso) ou devolve (se falhar).
 */
export async function regenerateSinglePhoto(opts: {
  ensaioId: string;
  userId: string;
  promptId: string;
  fotoGeradaId?: string; // registro anterior a deletar
}) {
  const admin = createAdmin(SUPABASE_URL, SERVICE_ROLE, {
    auth: { persistSession: false, autoRefreshToken: false },
  });

  // 0. Lê tier do ensaio (define quanto debitar)
  const { data: ensaioTierRow } = await admin
    .from("ensaios")
    .select("generation_tier")
    .eq("id", opts.ensaioId)
    .single();
  const regenTier: "fast" | "detailed" =
    ensaioTierRow?.generation_tier === "detailed" ? "detailed" : "fast";
  const regenCost = regenTier === "detailed" ? 4 : 1;

  // 1. Debita créditos antecipadamente (1 fast | 4 detailed)
  const { data: debitOk } = await admin.rpc("debit_credits", {
    p_user_id: opts.userId,
    p_amount: regenCost,
  });
  if (!debitOk) {
    return { ok: false, error: "créditos insuficientes" as const };
  }

  try {
    // Refs do ensaio (com pessoa_index + qualidade pra escolher a melhor por pessoa)
    const { data: refsRows } = await admin
      .from("fotos_referencia")
      .select("id, storage_path, pessoa_index, size_bytes, quality_label, quality_metadata")
      .eq("ensaio_id", opts.ensaioId)
      .order("pessoa_index", { ascending: true })
      .order("sort_order", { ascending: true });

    const refs: Array<{
      id: string;
      data: string;
      buffer: Buffer;
      mimeType: string;
      personIdx: number;
      size_bytes: number | null;
      quality_label: QualityLabel | null;
      quality_metadata: QualityMetadata | null;
    }> = [];
    for (const r of refsRows ?? []) {
      const { data } = await admin.storage.from("references").download(r.storage_path);
      if (!data) continue;
      const rawBuf = Buffer.from(await data.arrayBuffer());
      const processed = await sharp(rawBuf)
        .rotate()
        .resize(REF_MAX_DIMENSION, REF_MAX_DIMENSION, {
          fit: "inside",
          withoutEnlargement: true,
        })
        .jpeg({ quality: 92, mozjpeg: true })
        .toBuffer();
      refs.push({
        id: r.id as string,
        data: processed.toString("base64"),
        buffer: processed,
        mimeType: "image/jpeg",
        personIdx: (r.pessoa_index ?? 0) as number,
        size_bytes: r.size_bytes as number | null,
        quality_label: r.quality_label as QualityLabel | null,
        quality_metadata: r.quality_metadata as QualityMetadata | null,
      });
    }
    // Quantas pessoas distintas existem nas refs (pra disparar face-swap)
    const pessoasCount = Math.max(1, new Set(refs.map((r) => r.personIdx)).size);

    if (refs.length < MIN_REFS_REQUIRED) {
      throw new Error("referências insuficientes");
    }

    // Mandamos TODAS as refs pro Gemini (mesma lógica do runGeneration).
    const geminiRefs = refs;

    const { data: prompt } = await admin
      .from("prompts")
      .select("id, numero, texto, categoria")
      .eq("id", opts.promptId)
      .single();
    if (!prompt) throw new Error("prompt não encontrado");

    const { data: ensaio } = await admin
      .from("ensaios")
      .select("idade, generation_tier, ensaio_types(slug)")
      .eq("id", opts.ensaioId)
      .single();

    const idadeNumRegen: number | null =
      ensaio?.idade !== null && ensaio?.idade !== undefined ? Number(ensaio.idade) : null;
    const isBebeRegen = isInfantilSlug(prompt.categoria);
    // Bug 2026-04-27: bebê sem idade default "3" (toddler), não "30".
    const idadeRegen =
      idadeNumRegen !== null ? String(idadeNumRegen) : isBebeRegen ? "3" : "30";
    let texto = prompt.texto.replace(/\{idade\}/g, idadeRegen);

    // Story 07 fix bebê — mesmo bloco de preservação infantil de runGeneration.
    const isToddlerRegen =
      isBebeRegen && (idadeNumRegen === null || idadeNumRegen <= 3);
    if (isBebeRegen) {
      const ageGuard = isToddlerRegen
        ? `CRITICAL AGE LOCK — The subject is a ${idadeRegen}-year-old TODDLER. ` +
          `Render with toddler proportions: relatively larger head, shorter limbs, ` +
          `softer rounded facial features, smaller body, baby teeth. ` +
          `Do NOT render as a child of 5+ years old. Do NOT render as teenager or adult. ` +
          `If the scene description requires older motor skills (kneeling on one knee, ` +
          `arms fully raised triumphantly, holding heavy objects, sophisticated standing pose), ` +
          `simplify to age-appropriate posture: seated, supported standing, or natural toddler stance. ` +
          `Outfits must fit a ${idadeRegen}-year-old body (not a model's body).`
        : `CRITICAL AGE LOCK — The subject is a ${idadeRegen}-year-old child. ` +
          `Preserve child facial proportions, child body size, and natural child skin texture. ` +
          `Do NOT render as a teenager or adult. Do NOT idealize features or apply makeup. ` +
          `Do NOT make the face look older than ${idadeRegen}.`;
      texto = ageGuard + "\n\n" + texto;
    }

    if (idadeRegen.length === 1) {
      texto +=
        `\n\nCRITICAL NUMBER RENDERING — The age is ${idadeRegen} (a SINGLE digit). ` +
        `When the scene includes balloons, candles, or decorations shaped as the number ${idadeRegen}, ` +
        `show EXACTLY ONE decoration with the digit "${idadeRegen}". ` +
        `Do NOT place two "${idadeRegen}" decorations side by side (this would look like "${idadeRegen}${idadeRegen}"). ` +
        `Do NOT duplicate the digit. The total visible age must read "${idadeRegen}", never "${idadeRegen}${idadeRegen}" or any multi-digit form. ` +
        `If the prompt mentions "two number-shaped" items, interpret as ONE item showing "${idadeRegen}".`;
    }
    const tier: "fast" | "detailed" =
      ensaio?.generation_tier === "detailed" ? "detailed" : "fast";

    const subjectModeRegen: "adult" | "child" | "toddler" = !isBebeRegen
      ? "adult"
      : isToddlerRegen
      ? "toddler"
      : "child";

    const regenEnsaioTypeSlug =
      (ensaio?.ensaio_types as { slug?: string } | null | undefined)?.slug ?? undefined;

    // seedKey diferente pra garantir variação da regeneração
    const result = await generateEnsaioPhoto({
      prompt: texto,
      referenceImages: geminiRefs,
      seedKey: `${opts.ensaioId}:${opts.promptId}:retry:${Date.now()}`,
      pessoasCount,
      tier,
      subjectMode: subjectModeRegen,
      ensaioTypeSlug: regenEnsaioTypeSlug,
    });

    let finalBuf = Buffer.from(result.imageBase64, "base64");
    let finalMime = result.mimeType;

    // Story 04 — face-swap também na regeneração (CON-2.2)
    const swap = await applyFaceSwap({
      imageBuffer: finalBuf,
      imageMime: finalMime,
      anchors: refs.map((r) => ({
        data: r.data,
        mimeType: r.mimeType,
        personIdx: r.personIdx,
      })),
      pessoasCount,
      jobId: `${opts.ensaioId}:${opts.promptId}:retry`,
      subjectMode: subjectModeRegen,
    });
    finalBuf = Buffer.from(swap.buffer);
    finalMime = swap.mimeType;

    const outExt = finalMime.includes("png") ? "png" : "jpg";
    const storagePath = `${opts.userId}/${opts.ensaioId}/${opts.promptId}.${outExt}`;

    await admin.storage
      .from("generated")
      .upload(storagePath, finalBuf, {
        contentType: finalMime,
        upsert: true,
      });

    // Remove registro anterior (se existir) e insere novo
    if (opts.fotoGeradaId) {
      await admin.from("fotos_geradas").delete().eq("id", opts.fotoGeradaId);
    }
    const { data: inserted } = await admin
      .from("fotos_geradas")
      .insert({
        ensaio_id: opts.ensaioId,
        user_id: opts.userId,
        prompt_id: opts.promptId,
        prompt_numero: prompt.numero,
        prompt_categoria: prompt.categoria,
        storage_path: storagePath,
        status: "completed",
        cost_cents_nano: result.cost_cents_base,
        cost_cents_swap: swap.cost_cents_swap,
        cost_cents_enhance: swap.cost_cents_enhance,
        swap_status: swap.swap_status,
        provider_used: result.provider,
      })
      .select("id, storage_path")
      .single();

    return { ok: true as const, foto: inserted };
  } catch (err) {
    // Devolve crédito em falha (mesmo valor debitado pelo tier)
    await admin.rpc("add_credits", {
      p_user_id: opts.userId,
      p_amount: regenCost,
    });
    return {
      ok: false as const,
      error: err instanceof Error ? err.message : String(err),
    };
  }
}
