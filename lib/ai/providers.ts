/**
 * Multi-provider image generation com failover automático.
 *
 * Estratégia:
 *   1. Tenta Google Gemini (primary — mais barato, geralmente rápido)
 *   2. Em 429/quota/tier error → fallback pra Replicate (mesmo modelo: google/nano-banana)
 *   3. Circuit breaker: se Google falhar N vezes em M minutos, pula direto pro Replicate
 *      por cooldown period (evita ping-pong).
 *
 * Ambos provedores rodam o MESMO modelo (Gemini 2.5 Flash Image / Nano Banana).
 * Qualidade idêntica — só muda o tubo.
 */

import { GoogleGenAI, Modality } from "@google/genai";
import Replicate from "replicate";
import { createHash } from "node:crypto";
import { generateWithOpenAI, openAICostCentsUSD } from "./openai-image";

const REQUEST_TIMEOUT_MS = 90_000;
const GOOGLE_MODEL = "gemini-3.1-flash-image"; // Nano Banana 2 (upgrade de 2.5)
const REPLICATE_MODEL = "google/nano-banana-2"; // Nano Banana 2 (sincronizado com GOOGLE_MODEL)

// Story 07 — Flux+PuLID via Replicate (alternativa à Nano Banana).
// Quando system_settings.use_flux_pulid = true, geração principal usa este
// modelo no lugar do Nano. Custo ~R$0,25/img (vs R$0,20 Nano puro), mas
// fidelidade muito superior em refs reais (PuLID = identity adapter nativo).
const FLUX_PULID_MODEL =
  "zsxkib/flux-pulid:8baa7ef2255075b46f4d91cd238c21d31181b3e6a864463f967960bb0112525b" as const;

// Circuit breaker em memória (reset quando PM2 restart — OK pra nosso caso)
const CIRCUIT_STATE = {
  googleFailures: [] as number[], // timestamps
  googleCooldownUntil: 0,
};
const WINDOW_MS = 5 * 60_000; // 5 min
const FAIL_THRESHOLD = 3;
const COOLDOWN_MS = 30 * 60_000; // 30 min

// ────────────────────────────────────────────────────────────────────────────
// Clientes
// ────────────────────────────────────────────────────────────────────────────
let _google: GoogleGenAI | null = null;
function googleClient() {
  if (!_google) {
    const k = process.env.GEMINI_API_KEY;
    if (!k) throw new Error("GEMINI_API_KEY missing");
    _google = new GoogleGenAI({ apiKey: k });
  }
  return _google;
}

let _replicate: Replicate | null = null;
function replicateClient() {
  if (!_replicate) {
    const k = process.env.REPLICATE_API_TOKEN;
    if (!k) throw new Error("REPLICATE_API_TOKEN missing");
    _replicate = new Replicate({ auth: k });
  }
  return _replicate;
}

// ────────────────────────────────────────────────────────────────────────────
// Tipos e helpers
// ────────────────────────────────────────────────────────────────────────────
export interface GenerateInput {
  prompt: string;
  /** Referências — em multi-pessoa, cada imagem tem `personIdx` indicando a qual pessoa pertence */
  referenceImages: Array<{ data: string; mimeType: string; personIdx?: number }>;
  seedKey?: string;
  /** Quantas pessoas distintas o ensaio retrata. Default 1. */
  pessoasCount?: number;
  /** Labels opcionais das pessoas ("Mãe", "Filho", "Ela", "Ele"). */
  pessoaLabels?: string[];
  /**
   * Tier de qualidade (Story 06 ext).
   *  - 'fast' (default): Gemini Nano-Banana → Replicate failover
   *  - 'detailed': OpenAI GPT Image 1 high (mais lento, mais caro, mais detalhe)
   */
  tier?: "fast" | "detailed";
  /**
   * Story 07 fix bebê — categoria/idade do sujeito principal.
   *  - 'adult' (default): comportamento atual
   *  - 'child': criança 4-9 anos. Negative prompt do Runware reforça anti-adultização.
   *  - 'toddler': bebê 0-3 anos. Pula Runware/Flux+PuLID (PuLID treinado em rostos
   *               adultos distorce traços de bebê) e vai direto pra Gemini Nano Banana,
   *               que renderiza melhor proporções infantis e números/balões pequenos.
   */
  subjectMode?: "adult" | "child" | "toddler";
  /**
   * Slug do tipo de ensaio — roteamento por tipo.
   * "sensual" → Flux+PuLID diretamente (fotorrealismo + identidade superior para adulto solo).
   * Outros slugs → pipeline padrão Gemini → Nano Banana.
   */
  ensaioTypeSlug?: string;
}

export interface GenerateResult {
  imageBase64: string;
  mimeType: string;
  provider: "google" | "replicate" | "openai";
  /** Custo do gerador base em centavos R$ (varia por tier/provider). */
  cost_cents_base: number;
}

function seedFromKey(key: string): number {
  const h = createHash("sha256").update(key).digest();
  return h.readUInt32BE(0) & 0x7fffffff;
}

function isQuotaError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    msg.includes("429") ||
    msg.includes("RESOURCE_EXHAUSTED") ||
    msg.includes("quota") ||
    msg.includes("free_tier") ||
    msg.includes("rate limit")
  );
}

function isTransientError(err: unknown): boolean {
  const msg = err instanceof Error ? err.message : String(err);
  return (
    isQuotaError(err) ||
    msg.includes("500") ||
    msg.includes("502") ||
    msg.includes("503") ||
    msg.includes("504") ||
    msg.includes("UNAVAILABLE") ||
    msg.includes("DEADLINE_EXCEEDED") ||
    msg.includes("network") ||
    msg.includes("fetch failed")
  );
}

function recordGoogleFailure() {
  const now = Date.now();
  CIRCUIT_STATE.googleFailures = CIRCUIT_STATE.googleFailures.filter(
    (t) => now - t < WINDOW_MS
  );
  CIRCUIT_STATE.googleFailures.push(now);
  if (CIRCUIT_STATE.googleFailures.length >= FAIL_THRESHOLD) {
    CIRCUIT_STATE.googleCooldownUntil = now + COOLDOWN_MS;
    CIRCUIT_STATE.googleFailures = [];
    console.warn(
      `[circuit] Google em cooldown por ${COOLDOWN_MS / 60_000}min — todas requests vão pro Replicate`
    );
  }
}

function isGoogleInCooldown(): boolean {
  return Date.now() < CIRCUIT_STATE.googleCooldownUntil;
}

// ────────────────────────────────────────────────────────────────────────────
// Provider: Google Gemini
// ────────────────────────────────────────────────────────────────────────────
function buildAnchor(refs: GenerateInput["referenceImages"], pessoasCount: number, labels: string[]): string {
  if (pessoasCount <= 1) {
    return `The ${refs.length} reference photos above show THE SAME PERSON.`;
  }
  // Multi-pessoa: descreve quais fotos são de quem
  const counts: number[] = Array(pessoasCount).fill(0);
  for (const r of refs) {
    const idx = Math.max(0, Math.min(pessoasCount - 1, r.personIdx ?? 0));
    counts[idx]++;
  }
  const groups: string[] = [];
  let cursor = 0;
  for (let i = 0; i < pessoasCount; i++) {
    const label = labels[i] ?? `Person ${i + 1}`;
    const from = cursor + 1;
    const to = cursor + counts[i];
    groups.push(`photos ${from}-${to}: ${label}`);
    cursor += counts[i];
  }
  return (
    `The ${refs.length} reference photos above show ${pessoasCount} DIFFERENT people: ` +
    groups.join("; ") +
    `. These are distinct individuals — do NOT merge their faces. ` +
    `The final image must contain all ${pessoasCount} people, each preserving their own identity.`
  );
}

// Preservation blocks — Story 07 (Fidelidade 100%).
// Reforçado para bloquear invenção de marcas e idealização de feições.
// Nano Banana respeita melhor instruções POSITIVAS explícitas + NEGATIVAS enumeradas
// do que negative_prompt tradicional (que o modelo não expõe via API).
const PRESERVATION_SINGLE =
  `CRITICAL IDENTITY LOCK — This is the SAME real person from the reference photos. ` +
  `Reproduce this specific human being, not a look-alike, not an idealized version. ` +
  `\n\nMatch EXACTLY from the references: face shape, jaw line, cheek bones, chin; ` +
  `eye shape, eye color, eyebrow shape and thickness; nose shape and nostril width; ` +
  `lip shape and thickness; skin tone, undertone, and natural skin texture (pores, fine lines); ` +
  `hair color, hair length, hair texture (straight/wavy/curly), hairline and parting; ` +
  `body type, shoulder width, torso proportions, arm thickness. ` +
  `\n\nPreserve ALL visible permanent marks EXACTLY where they appear in the references: ` +
  `tattoos (same design and location), piercings, scars, moles, freckles, birthmarks. ` +
  `\n\nDo NOT add any tattoo, piercing, scar, mole, or mark that is not clearly visible in the references. ` +
  `Do NOT remove or move any visible mark from its reference location. ` +
  `Do NOT smooth skin to a plastic or airbrushed finish. ` +
  `Do NOT whiten teeth, enlarge eyes, thin the nose, slim the jaw, or make any "beauty" changes. ` +
  `Do NOT change hair color or straighten/curl hair beyond what is in the references. ` +
  `Do NOT change apparent age, weight, or body proportions. ` +
  `\n\nThe person must be immediately recognizable to their own family.`;

const PRESERVATION_MULTI =
  `CRITICAL IDENTITY LOCK — Each person in this image MUST be the exact same real individual ` +
  `from their own reference photos. These are real distinct people, NOT similar-looking characters. ` +
  `\n\nFor EACH person independently, match EXACTLY: face shape, jaw, cheek bones, chin; ` +
  `eye shape and color; nose shape; lip shape and thickness; skin tone and texture; ` +
  `hair color, length, and texture; body type and proportions; ` +
  `and ALL visible permanent marks (tattoos, piercings, scars, moles, freckles) in their exact reference locations. ` +
  `\n\nDo NOT merge, blend, average, or swap features between the people. ` +
  `Do NOT make them look alike. ` +
  `Do NOT invent marks that aren't in each person's references. ` +
  `Do NOT remove marks that ARE in each person's references. ` +
  `Do NOT smooth skin or idealize features. ` +
  `Do NOT change hair or body beyond the references. ` +
  `\n\nEach person must be immediately recognizable to their own family.`;

async function generateWithGoogle(input: GenerateInput): Promise<GenerateResult> {
  const client = googleClient();
  const seed = input.seedKey ? seedFromKey(input.seedKey) : undefined;
  const pessoasCount = input.pessoasCount ?? 1;
  const labels = input.pessoaLabels ?? [];

  // Ordena refs por personIdx pra que "photos 1-4: Person 1, photos 5-8: Person 2" seja consistente
  const sortedRefs = [...input.referenceImages].sort(
    (a, b) => (a.personIdx ?? 0) - (b.personIdx ?? 0)
  );

  const anchor = buildAnchor(sortedRefs, pessoasCount, labels);
  const preservation = pessoasCount > 1 ? PRESERVATION_MULTI : PRESERVATION_SINGLE;

  // Story 07 — ordem otimizada pra reforçar identidade.
  // Modelos image-gen tendem a dar mais peso ao que vem logo após as imagens
  // de referência E ao que vem no final do prompt (recency + proximity).
  // Por isso preservation aparece 2x: logo após as refs (contexto imediato)
  // e no final (reminder que sobrevive ao prompt descritivo da cena).
  const parts: Array<
    | { text: string }
    | { inlineData: { data: string; mimeType: string } }
  > = [
    { text: anchor },
    ...sortedRefs.map((img) => ({
      inlineData: { data: img.data, mimeType: img.mimeType },
    })),
    { text: preservation },
    { text: input.prompt },
    { text: `REMINDER — Identity preservation above is non-negotiable. ${preservation}` },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const response = await client.models.generateContent({
      model: GOOGLE_MODEL,
      contents: [{ role: "user", parts }],
      config: {
        responseModalities: [Modality.IMAGE],
        // Rosto ocupa ~30% em 1:1 vs ~5% em 9:16 → fidelidade facial sobe muito
        imageConfig: { aspectRatio: "1:1" },
        // Story 07 — baixado de 0.75 → 0.35. Menos "criatividade" do modelo,
        // mais aderência ao prompt de preservação. Trade-off aceito: prompts
        // idênticos produzem imagens mais próximas, mas a seedKey varia por
        // prompt então a diversidade de cenas do ensaio se mantém.
        temperature: 0.35,
        ...(seed !== undefined ? { seed } : {}),
        abortSignal: controller.signal,
      },
    });

    const candidate = response.candidates?.[0];
    if (!candidate) throw new Error("Geração sem candidato");

    for (const part of candidate.content?.parts ?? []) {
      if ("inlineData" in part && part.inlineData?.data) {
        return {
          imageBase64: part.inlineData.data,
          mimeType: part.inlineData.mimeType ?? "image/png",
          provider: "google",
          cost_cents_base: 20, // Gemini ≈ R$0,20/img
        };
      }
    }
    throw new Error("Imagem não gerada");
  } finally {
    clearTimeout(timer);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Provider: Replicate (fallback — mesmo modelo google/nano-banana)
// ────────────────────────────────────────────────────────────────────────────
async function generateWithReplicate(input: GenerateInput): Promise<GenerateResult> {
  const client = replicateClient();
  const pessoasCount = input.pessoasCount ?? 1;
  const labels = input.pessoaLabels ?? [];

  const sortedRefs = [...input.referenceImages].sort(
    (a, b) => (a.personIdx ?? 0) - (b.personIdx ?? 0)
  );
  const imageInputs = sortedRefs.map(
    (img) => `data:${img.mimeType};base64,${img.data}`
  );

  const anchor = buildAnchor(sortedRefs, pessoasCount, labels);
  const preservation = pessoasCount > 1 ? PRESERVATION_MULTI : PRESERVATION_SINGLE;

  // Story 07 — reforço duplo de preservation (começo após anchor + final)
  const fullPrompt = [
    anchor,
    preservation,
    "",
    input.prompt,
    "",
    `REMINDER — Identity preservation above is non-negotiable. ${preservation}`,
  ].join("\n\n");

  const output = (await client.run(REPLICATE_MODEL, {
    input: {
      prompt: fullPrompt,
      image_input: imageInputs,
      output_format: "jpg",
      aspect_ratio: "1:1",
    },
  })) as unknown;

  // Replicate retorna string URL, File-like object, ou array deles
  let imageUrl: string | null = null;
  if (typeof output === "string") {
    imageUrl = output;
  } else if (Array.isArray(output) && output.length > 0) {
    imageUrl = typeof output[0] === "string" ? output[0] : output[0]?.url?.() ?? null;
  } else if (output && typeof output === "object") {
    const maybeUrl = (output as { url?: () => string }).url?.();
    if (maybeUrl) imageUrl = maybeUrl;
  }

  if (!imageUrl) throw new Error("Replicate não retornou imagem");

  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`Replicate download falhou: ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  const mime = res.headers.get("content-type") ?? "image/jpeg";
  return {
    imageBase64: buf.toString("base64"),
    mimeType: mime,
    provider: "replicate",
    cost_cents_base: 20, // mesmo modelo Nano-Banana, mesmo preço
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Provider: Runware (Story 07 — Flux+PuLID via API Runware)
// Modelo base: runware:101@1 (FLUX Dev) com puLID sub-objeto.
// Custo ~$0.038-0.06/img. SDK não-oficial — fetch puro.
// ────────────────────────────────────────────────────────────────────────────
const RUNWARE_API_URL = "https://api.runware.ai/v1";

function uuid4(): string {
  // RFC 4122 v4 compatível
  return "xxxxxxxx-xxxx-4xxx-yxxx-xxxxxxxxxxxx".replace(/[xy]/g, (c) => {
    const r = (Math.random() * 16) | 0;
    const v = c === "x" ? r : (r & 0x3) | 0x8;
    return v.toString(16);
  });
}

async function generateWithRunware(input: GenerateInput): Promise<GenerateResult> {
  const apiKey = process.env.RUNWARE_API_KEY;
  if (!apiKey) throw new Error("RUNWARE_API_KEY missing");

  const sortedRefs = [...input.referenceImages].sort(
    (a, b) => (a.personIdx ?? 0) - (b.personIdx ?? 0),
  );
  const pessoasCount = input.pessoasCount ?? 1;
  const labels = input.pessoaLabels ?? [];
  const anchor = buildAnchor(sortedRefs, pessoasCount, labels);
  const preservation = pessoasCount > 1 ? PRESERVATION_MULTI : PRESERVATION_SINGLE;

  const fullPrompt = [anchor, preservation, "", input.prompt].join("\n\n");

  // FIX 2026-04-26 — Antes pegava só sortedRefs[0] = uma única foto.
  // PuLID Flux aceita até 4 imageUUIDs e faz média de embeddings,
  // resultando em identidade muito mais robusta. Subimos as 4 melhores
  // refs da pessoa principal (personIdx=0) e mandamos todas pro PuLID.
  const personZeroRefs = sortedRefs.filter((r) => (r.personIdx ?? 0) === 0).slice(0, 4);
  const facesToUpload = personZeroRefs.length > 0 ? personZeroRefs : sortedRefs.slice(0, 4);
  if (facesToUpload.length === 0) throw new Error("runware: nenhuma ref disponível");

  // FÓRMULA PuLID Flux Runware (Story 07):
  //  - Modelo base: runware:101@1 = FLUX Dev
  //  - puLID.idWeight: 0.95 — identidade muito forte (essencial pra criança)
  //  - puLID.trueCFGScale: 1.8 — equilíbrio prompt/identidade
  //  - Steps: 28, CFGScale: 3.5
  //  - inputImages: até 4 UUIDs = média de embeddings = +fidelidade

  // PASSO 1 — Upload de TODAS as faces de referência em uma chamada
  const uploadTasks = facesToUpload.map((face) => ({
    taskType: "imageUpload" as const,
    taskUUID: uuid4(),
    image: `data:${face.mimeType};base64,${face.data}`,
  }));
  const uploadBody = [
    { taskType: "authentication", apiKey },
    ...uploadTasks,
  ];

  const uploadController = new AbortController();
  const uploadTimer = setTimeout(() => uploadController.abort(), 60_000);
  let imageUUIDs: string[];
  try {
    const upRes = await fetch(RUNWARE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(uploadBody),
      signal: uploadController.signal,
    });
    if (!upRes.ok) {
      const txt = await upRes.text().catch(() => "");
      throw new Error(`runware upload HTTP ${upRes.status}: ${txt.slice(0, 200)}`);
    }
    const upData = (await upRes.json()) as {
      data?: Array<Record<string, unknown>>;
      errors?: Array<Record<string, unknown>>;
    };
    if (upData.errors && upData.errors.length > 0) {
      throw new Error(`runware upload errors: ${JSON.stringify(upData.errors).slice(0, 200)}`);
    }
    const uploadResults = (upData.data ?? []).filter(
      (x) => x.taskType === "imageUpload",
    ) as Array<{ imageUUID?: string }>;
    imageUUIDs = uploadResults
      .map((r) => r.imageUUID)
      .filter((x): x is string => typeof x === "string" && x.length > 0);
    if (imageUUIDs.length === 0) {
      throw new Error("runware: imageUpload não retornou nenhum imageUUID");
    }
  } finally {
    clearTimeout(uploadTimer);
  }

  console.log(
    `[runware] PuLID Flux: ${imageUUIDs.length} ref(s) uploaded, idWeight=0.95, trueCFGScale=1.8`,
  );

  // PASSO 2 — Inference com PuLID Flux usando TODAS as imageUUIDs
  const inferenceUUID = uuid4();
  const body = [
    { taskType: "authentication", apiKey },
    {
      taskType: "imageInference",
      taskUUID: inferenceUUID,
      model: "runware:101@1", // FLUX Dev
      positivePrompt: fullPrompt.slice(0, 3000),
      negativePrompt:
        (input.subjectMode === "child" || input.subjectMode === "toddler"
          ? "adult features, mature face, teenager, adolescent, makeup, lipstick, fashion model pose, sophisticated stance, aged face, "
          : "") +
        "cartoon face, illustration face, painting face, low quality, blurry face, distorted face, plastic skin, ai-generated face, deformed, asymmetric eyes, fused fingers, extra limbs, oversaturated face, beauty filter, smoothed skin",
      width: 1024,
      height: 1024,
      numberResults: 1,
      outputType: "URL",
      outputFormat: "JPG",
      includeCost: true,
      steps: 28,
      CFGScale: 3.5,
      puLID: {
        inputImages: imageUUIDs,
        // Calibração 2026-04-26 — fidelidade prioritária sobre naturalidade:
        //  idWeight 0.95 = PuLID trava identidade quase 100%
        //                  (era 0.7 — saía rosto "parecido" mas não a pessoa).
        //  trueCFGScale 1.8 = prompt respeitado mas sem sobrescrever rosto
        //                     (era 2.5 — Flux idealizava traços).
        idWeight: 0.95,
        trueCFGScale: 1.8,
      },
    },
  ];

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), REQUEST_TIMEOUT_MS);
  try {
    const res = await fetch(RUNWARE_API_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
      signal: controller.signal,
    });
    if (!res.ok) {
      const txt = await res.text().catch(() => "");
      throw new Error(`runware HTTP ${res.status}: ${txt.slice(0, 250)}`);
    }
    const data = (await res.json()) as {
      data?: Array<Record<string, unknown>>;
      errors?: Array<Record<string, unknown>>;
    };

    if (data.errors && data.errors.length > 0) {
      throw new Error(`runware errors: ${JSON.stringify(data.errors).slice(0, 250)}`);
    }

    const inferenceResult = (data.data ?? []).find(
      (x) => x.taskType === "imageInference" && x.taskUUID === inferenceUUID,
    ) as { imageURL?: string; cost?: number } | undefined;

    if (!inferenceResult?.imageURL) {
      throw new Error(`runware: sem imageURL (resposta: ${JSON.stringify(data).slice(0, 250)})`);
    }

    const imgRes = await fetch(inferenceResult.imageURL);
    if (!imgRes.ok) throw new Error(`runware download HTTP ${imgRes.status}`);
    const buf = Buffer.from(await imgRes.arrayBuffer());

    const usdCost = Number(inferenceResult.cost ?? 0.04);
    const brlCents = Math.max(20, Math.round(usdCost * 5.2 * 100));

    console.log(
      `[runware] ✓ generated (cost ~$${usdCost.toFixed(3)} = ${brlCents} cents BRL)`,
    );

    return {
      imageBase64: buf.toString("base64"),
      mimeType: imgRes.headers.get("content-type") ?? "image/jpeg",
      provider: "replicate", // schema atual aceita só google/replicate/openai
      cost_cents_base: brlCents,
    };
  } finally {
    clearTimeout(timer);
  }
}

// ────────────────────────────────────────────────────────────────────────────
// Provider: Flux + PuLID via Replicate (Story 07 — fidelidade alta)
// ────────────────────────────────────────────────────────────────────────────
async function generateWithFluxPulid(input: GenerateInput): Promise<GenerateResult> {
  const client = replicateClient();
  const sortedRefs = [...input.referenceImages].sort(
    (a, b) => (a.personIdx ?? 0) - (b.personIdx ?? 0),
  );
  const pessoasCount = input.pessoasCount ?? 1;
  const labels = input.pessoaLabels ?? [];
  const anchor = buildAnchor(sortedRefs, pessoasCount, labels);
  const preservation = pessoasCount > 1 ? PRESERVATION_MULTI : PRESERVATION_SINGLE;

  // Flux respeita melhor prompts curtos e objetivos. Mantemos preservation
  // mas removemos os reminders duplicados (PuLID já cuida da identidade).
  const fullPrompt = [anchor, preservation, "", input.prompt].join("\n\n");

  // PuLID precisa de UMA face de referência principal (a melhor anchor).
  // Pegamos a primeira ref (já vem ordenada por anchor-select como melhor).
  const mainFace = sortedRefs[0];
  if (!mainFace) throw new Error("flux-pulid: nenhuma ref disponível");
  const mainFaceUrl = `data:${mainFace.mimeType};base64,${mainFace.data}`;

  // Schema validado em https://api.replicate.com/v1/models/zsxkib/flux-pulid
  // Required: main_face_image
  //
  // Calibração (Story 07):
  //  - id_weight=1.0 (default): equilíbrio identidade × cenário do prompt.
  //    Aumentar pra 1.5+ faz o modelo IGNORAR o prompt (vira só retrato).
  //  - start_step=4: deixa cenário (cake, balões, vestido) ser construído
  //    nos primeiros passos; só carimba identidade nos últimos.
  //  - max_sequence_length=512: prompts longos (>1500 chars) precisam
  //    desse aumento senão Flux corta no tokenizador T5.
  const output = (await client.run(FLUX_PULID_MODEL, {
    input: {
      prompt: fullPrompt,
      main_face_image: mainFaceUrl,
      width: 1024,
      height: 1024,
      num_outputs: 1,
      num_steps: 20, // máximo aceito pelo zsxkib/flux-pulid
      guidance_scale: 4,
      true_cfg: 1,
      id_weight: 1.2,
      start_step: 2,
      max_sequence_length: 512,
      output_format: "webp",
      output_quality: 90,
    },
  })) as unknown;

  let imageUrl: string | null = null;
  if (typeof output === "string") {
    imageUrl = output;
  } else if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === "string") imageUrl = first;
    else if (first && typeof first === "object") {
      const maybe = (first as { url?: () => URL | string }).url?.();
      if (maybe) imageUrl = String(maybe);
    }
  } else if (output && typeof output === "object") {
    const maybe = (output as { url?: () => URL | string }).url?.();
    if (maybe) imageUrl = String(maybe);
  }

  if (!imageUrl) throw new Error("flux-pulid: sem URL no output");

  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`flux-pulid: download falhou ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());
  return {
    imageBase64: buf.toString("base64"),
    mimeType: res.headers.get("content-type") ?? "image/jpeg",
    provider: "replicate",
    cost_cents_base: 25, // Flux+PuLID ≈ $0,05/img → R$0,25
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Provider: FLUX Dev img2img (ensaio sensual)
//
// Abordagem diferente do text-to-image: usa a FOTO REAL da cliente como base
// e transforma só a roupa/cenário. O rosto e corpo ficam reais porque a
// imagem de entrada é a foto real. Sem face swap, sem PuLID, sem colagem.
//
// prompt_strength: 0.60 → 40% vem da foto original (identidade) + 60% do
// prompt (roupa/cenário). Ajuste se precisar: mais baixo = mais fiel ao
// original; mais alto = mais transformação.
// ────────────────────────────────────────────────────────────────────────────
async function generateWithFluxImg2Img(input: GenerateInput): Promise<GenerateResult> {
  const client = replicateClient();

  // Pega a melhor referência (já vem ordenada por qualidade pelo caller)
  const sortedRefs = [...input.referenceImages].sort(
    (a, b) => (a.personIdx ?? 0) - (b.personIdx ?? 0),
  );
  const mainRef = sortedRefs[0];
  if (!mainRef) throw new Error("flux-img2img: nenhuma referência disponível");

  const mainRefDataUrl = `data:${mainRef.mimeType};base64,${mainRef.data}`;

  // Para img2img o prompt descreve o resultado desejado — não precisa de
  // blocos de preservação de identidade (a foto base já garante isso).
  const output = (await client.run("black-forest-labs/flux-dev", {
    input: {
      image: mainRefDataUrl,
      prompt: input.prompt,
      prompt_strength: 0.6,
      num_inference_steps: 30,
      guidance: 3.5,
      output_format: "jpg",
      output_quality: 95,
      disable_safety_checker: true,
      go_fast: false,
    },
  })) as unknown;

  let imageUrl: string | null = null;
  if (typeof output === "string") {
    imageUrl = output;
  } else if (Array.isArray(output) && output.length > 0) {
    const first = output[0];
    if (typeof first === "string") imageUrl = first;
    else if (first && typeof first === "object") {
      const maybe = (first as { url?: () => URL | string }).url?.();
      if (maybe) imageUrl = String(maybe);
    }
  } else if (output && typeof output === "object") {
    const maybe = (output as { url?: () => URL | string }).url?.();
    if (maybe) imageUrl = String(maybe);
  }

  if (!imageUrl) throw new Error("flux-img2img: sem URL no output");

  const res = await fetch(imageUrl);
  if (!res.ok) throw new Error(`flux-img2img: download falhou ${res.status}`);
  const buf = Buffer.from(await res.arrayBuffer());

  return {
    imageBase64: buf.toString("base64"),
    mimeType: res.headers.get("content-type") ?? "image/jpeg",
    provider: "replicate",
    cost_cents_base: 22, // FLUX Dev ~$0.04/img → R$0,22
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Provider: OpenAI GPT Image 1 (tier "Detalhado")
// ────────────────────────────────────────────────────────────────────────────
async function generateWithOpenAITier(input: GenerateInput): Promise<GenerateResult> {
  const sortedRefs = [...input.referenceImages].sort(
    (a, b) => (a.personIdx ?? 0) - (b.personIdx ?? 0),
  );
  const pessoasCount = input.pessoasCount ?? 1;
  const labels = input.pessoaLabels ?? [];
  const anchor = buildAnchor(sortedRefs, pessoasCount, labels);
  const preservation = pessoasCount > 1 ? PRESERVATION_MULTI : PRESERVATION_SINGLE;

  // Story 07 — reforço duplo de preservation (começo após anchor + final)
  const fullPrompt = [
    anchor,
    preservation,
    "",
    input.prompt,
    "",
    `REMINDER — Identity preservation above is non-negotiable. ${preservation}`,
  ].join("\n\n");

  const result = await generateWithOpenAI({
    prompt: fullPrompt,
    referenceImages: sortedRefs.map((r) => ({ data: r.data, mimeType: r.mimeType })),
    quality: "high",
    size: "1024x1024",
  });

  const usdCents = openAICostCentsUSD("high");
  // Aproximação BRL — refinada no /admin pelo getUsdBrlRate.
  // Aqui usamos 5.20 como taxa de conversão conservadora e editável.
  const brlCents = Math.round(usdCents * 5.2);

  return {
    imageBase64: result.imageBase64,
    mimeType: result.mimeType,
    provider: "openai",
    cost_cents_base: brlCents,
  };
}

// ────────────────────────────────────────────────────────────────────────────
// Público: generateEnsaioPhoto — failover automático + retry
// ────────────────────────────────────────────────────────────────────────────
const MAX_ATTEMPTS_PER_PROVIDER = 2;

function sleep(ms: number) {
  return new Promise((r) => setTimeout(r, ms));
}

export async function generateEnsaioPhoto(
  input: GenerateInput
): Promise<GenerateResult> {
  // Tier "Detalhado" — vai direto pro OpenAI GPT Image 1 high.
  // Sem failover por enquanto: se OpenAI falhar, propaga erro pro caller
  // (run-generation devolve crédito). Não cai pra Gemini pq o user pagou
  // 4 créditos esperando GPT — entregar Gemini seria fraude.
  if (input.tier === "detailed") {
    return generateWithOpenAITier(input);
  }

  // Story 07 fix bebê — qualquer criança (toddler 0-3 OU child 4-12) pula
  // Runware/Flux+PuLID e vai direto pro Gemini Nano Banana. PuLID é treinado em
  // rostos adultos: mesmo com idWeight baixo, ele plastifica/idealiza traços
  // infantis (cara de boneca, pele lisa demais, olhos "anime"). Nano Banana
  // respeita melhor proporções infantis e renderiza melhor números pequenos
  // (balões "2", velas "3" etc.).
  // Bug 2026-04-27: idade=5 (subjectMode="child") ainda saía via Flux+PuLID e
  // o resultado ficava artificial. Estendido pra child também.
  const skipPulid =
    input.subjectMode === "toddler" || input.subjectMode === "child";

  // Story 07 — toggles dinâmicos. Ordem de prioridade:
  //   1. Runware (sistema irmão, key RUNWARE_API_KEY)
  //   2. Flux+PuLID via Replicate (mesma key REPLICATE_API_TOKEN)
  //   3. Nano Banana (default histórico)
  // Cada provider tem fallback gracioso pro próximo em caso de erro.
  if (!skipPulid) {
    try {
      const { isRunwareEnabled } = await import("@/lib/admin/runware-setting");
      if (await isRunwareEnabled()) {
        try {
          return await generateWithRunware(input);
        } catch (err) {
          console.warn(
            "[providers] runware falhou, fallback Flux+PuLID/Nano:",
            err instanceof Error ? err.message.slice(0, 200) : String(err),
          );
        }
      }
    } catch {
      /* setting helper indisponível, segue */
    }

    try {
      const { isFluxPulidEnabled } = await import("@/lib/admin/flux-pulid-setting");
      if (await isFluxPulidEnabled()) {
        try {
          return await generateWithFluxPulid(input);
        } catch (err) {
          console.warn(
            "[providers] flux-pulid falhou, fallback Nano Banana:",
            err instanceof Error ? err.message.slice(0, 200) : String(err),
          );
        }
      }
    } catch {
      /* setting helper indisponível, segue */
    }
  } else {
    console.log(`[providers] subjectMode=${input.subjectMode} — pulando Runware/Flux+PuLID, indo direto pra Nano Banana`);
  }

  const hasReplicate = !!process.env.REPLICATE_API_TOKEN;
  const skipGoogle = hasReplicate && isGoogleInCooldown();

  // Tenta Google primeiro (se não está em cooldown)
  if (!skipGoogle) {
    for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_PROVIDER; attempt++) {
      try {
        return await generateWithGoogle(input);
      } catch (err) {
        const retriable = isTransientError(err);
        if (isQuotaError(err)) {
          recordGoogleFailure();
          if (hasReplicate) {
            console.warn("[failover] Google quota → Replicate");
            break; // sai do loop, cai pro Replicate
          }
        }
        if (!retriable || attempt === MAX_ATTEMPTS_PER_PROVIDER) {
          if (!hasReplicate) throw err;
          break; // cai pro Replicate
        }
        await sleep(attempt * 1500);
      }
    }
  }

  if (!hasReplicate) {
    throw new Error("Google falhou e Replicate não configurado");
  }

  // Replicate (fallback)
  let lastErr: unknown = null;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS_PER_PROVIDER; attempt++) {
    try {
      return await generateWithReplicate(input);
    } catch (err) {
      lastErr = err;
      if (!isTransientError(err) || attempt === MAX_ATTEMPTS_PER_PROVIDER) throw err;
      await sleep(attempt * 2000);
    }
  }
  throw lastErr ?? new Error("Geração falhou em ambos providers");
}
