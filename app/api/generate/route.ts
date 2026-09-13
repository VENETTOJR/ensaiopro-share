/**
 * POST /api/generate
 * Cria um novo ensaio. Aceita:
 *  - Single pessoa: field "photos" (array de Files)
 *  - Multi pessoa: fields "photos_0", "photos_1", ... (um array por pessoa)
 *                  + "pessoa_label_0", "pessoa_label_1", ... (labels)
 *                  + "pessoas_count" (quantas pessoas)
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { runGeneration } from "@/lib/gemini/run-generation";
import { isInfantilSlug } from "@/lib/ensaio-slugs";

export const runtime = "nodejs";
export const maxDuration = 60;

const SAFE_TYPES = [
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
];

function isSafePhoto(f: File) {
  const t = f.type.toLowerCase();
  const n = f.name.toLowerCase();
  return (
    SAFE_TYPES.includes(t) || n.endsWith(".heic") || n.endsWith(".heif")
  );
}

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  const userId = user.id;

  const form = await req.formData();
  const source = String(form.get("source") ?? "template"); // Story 06
  const isFreestyle = source === "freestyle";
  // Story 06 ext — tier de qualidade (só se aplica em freestyle)
  const rawTier = String(form.get("generation_tier") ?? "fast");
  const generationTier: "fast" | "detailed" =
    isFreestyle && rawTier === "detailed" ? "detailed" : "fast";
  const FREESTYLE_CREDITS_PER_TIER = { fast: 1, detailed: 4 } as const;

  const ensaio_type_id = String(form.get("ensaio_type_id") ?? "");
  const ensaio_type_slug = String(form.get("ensaio_type_slug") ?? "");
  const nome = String(form.get("nome") ?? "").slice(0, 80) || null;
  const idadeRaw = form.get("idade");
  const idade = idadeRaw ? Number(idadeRaw) : null;

  // Bug 2026-04-27: bebê sem idade caía em fallback "30" e gerava adulto na
  // cena infantil. Validação server-side espelha o gate da UI.
  if (isInfantilSlug(ensaio_type_slug) && (idade === null || isNaN(idade))) {
    return NextResponse.json(
      { error: "Idade é obrigatória pra ensaio infantil." },
      { status: 400 }
    );
  }
  const pessoasCount = Math.max(1, Math.min(4, Number(form.get("pessoas_count") ?? 1)));

  let promptIds: string[] = [];
  let freestyleText: string | null = null;

  if (isFreestyle) {
    // Story 06 — modo freestyle
    freestyleText = String(form.get("freestyle_text") ?? "").trim();
    const { validateFreestylePrompt } = await import("@/lib/moderation/freestyle-deny");
    const moderation = validateFreestylePrompt(freestyleText);
    if (!moderation.ok) {
      // Log admin do motivo técnico real (NUNCA exibir ao user)
      const admin = await createAdminClient();
      await admin.from("freestyle_moderation_log").insert({
        user_id: userId,
        prompt: freestyleText,
        reason: moderation.reason ?? "unknown",
      });
      // Mensagem específica por categoria + chars (sem expor termo técnico)
      const reason = moderation.reason ?? "";
      let userMsg = "Esse conteúdo não pode ser gerado.";
      if (reason.includes("muito longo")) {
        userMsg = `Prompt longo demais (limite 3000 caracteres, recebido ${freestyleText.length}). Encurte o texto.`;
      } else if (reason.includes("muito curto")) {
        userMsg = "Prompt muito curto. Descreva com mais detalhe (mínimo 20 caracteres).";
      } else if (moderation.category === "child") {
        userMsg = "Esse texto bateu no filtro de proteção infantil. Evite palavras como 'child', 'kid', 'criança', 'menina', 'menino', 'teen', 'baby' — substitua por 'subject', 'pessoa', 'lead subject' (a idade real vem da foto de referência).";
      } else if (moderation.category === "nsfw") {
        userMsg = "Esse texto bateu no filtro de conteúdo adulto. Reescreva sem termos sensuais explícitos.";
      } else if (moderation.category === "celebrity") {
        userMsg = "Não é permitido gerar imagens de celebridades reais. Remova o nome.";
      } else if (moderation.category === "brand") {
        userMsg = "Esse texto cita uma marca registrada. Remova logos/nomes de marcas.";
      }
      return NextResponse.json(
        { error: userMsg, category: moderation.category ?? null },
        { status: 422 }
      );
    }
    // Rate limit: max 5 freestyle/dia/user
    const admin = await createAdminClient();
    const sinceMidnight = new Date();
    sinceMidnight.setHours(0, 0, 0, 0);
    const { count } = await admin
      .from("ensaios")
      .select("id", { count: "exact", head: true })
      .eq("user_id", userId)
      .eq("source", "freestyle")
      .gte("created_at", sinceMidnight.toISOString());
    if ((count ?? 0) >= 5) {
      return NextResponse.json(
        { error: "Você atingiu o limite diário do modo avançado. Tente amanhã." },
        { status: 429 }
      );
    }
  } else {
    try {
      promptIds = JSON.parse(String(form.get("prompt_ids") ?? "[]"));
    } catch {
      return NextResponse.json({ error: "prompt_ids invalid" }, { status: 400 });
    }
    if (!Array.isArray(promptIds) || promptIds.length === 0) {
      return NextResponse.json({ error: "nenhum estilo selecionado" }, { status: 400 });
    }
  }

  // Coleta fotos: single OR multi-pessoa
  // Story 01: aceita também `quality_$i` (JSON array — label + metadata por foto,
  // mesma ordem dos files). Quality é OPCIONAL — fallback aceita upload sem label.
  type QualityIn = {
    label: "green" | "yellow" | "red" | null;
    metadata: unknown;
  };
  type PhotoIn = {
    file: File;
    pessoaIdx: number;
    quality_label: "green" | "yellow" | "red" | null;
    quality_metadata: unknown;
  };
  const photosByPessoa: PhotoIn[] = [];
  const pessoaLabels: (string | null)[] = [];

  // Aceita ambos formatos:
  //  - Legacy/single: campo "photos" (quando pessoasCount=1 e é código antigo)
  //  - Novo multi: "photos_0", "photos_1", ... (novo fluxo client)
  const legacyPhotos = form.getAll("photos").filter((p): p is File => p instanceof File).filter(isSafePhoto);
  for (const f of legacyPhotos) {
    photosByPessoa.push({ file: f, pessoaIdx: 0, quality_label: null, quality_metadata: null });
  }

  for (let i = 0; i < Math.max(pessoasCount, 1); i++) {
    const fs = form.getAll(`photos_${i}`).filter((p): p is File => p instanceof File).filter(isSafePhoto);
    let qualities: QualityIn[] = [];
    const qRaw = form.get(`quality_${i}`);
    if (typeof qRaw === "string") {
      try {
        const parsed = JSON.parse(qRaw);
        if (Array.isArray(parsed)) {
          qualities = parsed.map((q): QualityIn => ({
            label:
              q && (q.label === "green" || q.label === "yellow" || q.label === "red")
                ? q.label
                : null,
            metadata: q && typeof q.metadata === "object" ? q.metadata : null,
          }));
        }
      } catch {
        // Quality payload inválido — segue sem labels.
      }
    }
    for (let j = 0; j < fs.length; j++) {
      const q = qualities[j] ?? { label: null, metadata: null };
      photosByPessoa.push({
        file: fs[j],
        pessoaIdx: i,
        quality_label: q.label,
        quality_metadata: q.metadata,
      });
    }
    const label = form.get(`pessoa_label_${i}`);
    pessoaLabels.push(typeof label === "string" ? label.slice(0, 30) : null);
  }

  if (photosByPessoa.length < 1 || photosByPessoa.length > 50) {
    return NextResponse.json(
      { error: "envie pelo menos 1 foto (máx 50 no total)" },
      { status: 400 }
    );
  }
  // Valida que cada pessoa tem pelo menos 1 foto em multi
  if (pessoasCount > 1) {
    for (let i = 0; i < pessoasCount; i++) {
      const count = photosByPessoa.filter((p) => p.pessoaIdx === i).length;
      if (count < 1) {
        return NextResponse.json(
          { error: `Pessoa ${i + 1} está sem fotos de referência` },
          { status: 400 }
        );
      }
    }
  }

  // Story 05 — calcula créditos pelo tipo do ensaio
  // Freestyle (Story 06) custa 1 crédito (fast/Gemini) ou 4 créditos (detailed/GPT)
  const { calcCreditsToDebit } = await import("@/lib/credits/calculate");
  const freestyleCost = FREESTYLE_CREDITS_PER_TIER[generationTier];
  const creditCalc = isFreestyle
    ? { total: freestyleCost, breakdown: new Map<string, number>(), avgPerPhoto: freestyleCost }
    : await calcCreditsToDebit(promptIds, ensaio_type_id);

  // Debita créditos atomicamente
  const { data: debitOk, error: debitErr } = await supabase.rpc("debit_credits", {
    p_user_id: userId,
    p_amount: creditCalc.total,
  });
  if (debitErr || !debitOk) {
    return NextResponse.json(
      { error: `Saldo insuficiente. Esse ensaio custa ${creditCalc.total} créditos.` },
      { status: 402 }
    );
  }

  const admin = await createAdminClient();
  let ensaioId: string | null = null;
  async function refund() {
    await admin.rpc("add_credits", { p_user_id: userId, p_amount: creditCalc.total });
  }

  try {
    // Cria ensaio
    const { data: ensaio, error: ensaioErr } = await admin
      .from("ensaios")
      .insert({
        user_id: userId,
        ensaio_type_id: isFreestyle ? null : ensaio_type_id,
        name:
          nome ??
          (isFreestyle
            ? `Modo avançado ${new Date().toLocaleDateString("pt-BR")}`
            : `Ensaio ${ensaio_type_slug}`),
        idade,
        status: "processing",
        total_prompts: isFreestyle ? 1 : promptIds.length,
        prompt_ids: isFreestyle ? [] : promptIds,
        pessoas_count: pessoasCount,
        source: isFreestyle ? "freestyle" : "template",
        freestyle_text: freestyleText,
        generation_tier: generationTier,
      })
      .select("id")
      .single();

    if (ensaioErr || !ensaio) {
      await refund();
      return NextResponse.json(
        { error: `falha ao criar ensaio: ${ensaioErr?.message}` },
        { status: 500 }
      );
    }
    ensaioId = ensaio.id;

    // Upload refs + persist pessoa_index + quality (Story 01 — AC6.10)
    const refPaths: Array<{
      path: string;
      mime: string;
      size: number;
      pessoaIdx: number;
      quality_label: "green" | "yellow" | "red" | null;
      quality_metadata: unknown;
    }> = [];
    for (let i = 0; i < photosByPessoa.length; i++) {
      const { file, pessoaIdx, quality_label, quality_metadata } = photosByPessoa[i];
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "jpg";
      const storagePath = `${userId}/${ensaio.id}/${pessoaIdx}-${i}.${ext}`;
      const buf = Buffer.from(await file.arrayBuffer());
      const { error: upErr } = await admin.storage
        .from("references")
        .upload(storagePath, buf, { contentType: file.type, upsert: true });
      if (upErr) {
        console.error("upload ref failed:", upErr);
        continue;
      }
      refPaths.push({
        path: storagePath,
        mime: file.type,
        size: file.size,
        pessoaIdx,
        quality_label,
        quality_metadata,
      });
    }

    if (refPaths.length === 0) {
      await admin.from("ensaios").update({ status: "failed" }).eq("id", ensaio.id);
      await refund();
      return NextResponse.json({ error: "Falha ao enviar fotos" }, { status: 500 });
    }

    const { error: refInsertErr } = await admin.from("fotos_referencia").insert(
      refPaths.map((r, idx) => ({
        ensaio_id: ensaio.id,
        user_id: userId,
        storage_path: r.path,
        mime_type: r.mime,
        size_bytes: r.size,
        sort_order: idx,
        pessoa_index: r.pessoaIdx,
        quality_label: r.quality_label,
        quality_metadata: r.quality_metadata,
      }))
    );
    if (refInsertErr) {
      console.error("ref insert failed:", refInsertErr);
      await admin.from("ensaios").update({ status: "failed" }).eq("id", ensaio.id);
      await refund();
      return NextResponse.json({ error: "Falha ao registrar fotos" }, { status: 500 });
    }

    // Dispara geração em background
    runGeneration({
      ensaioId: ensaio.id,
      userId,
      promptIds,
      referencePaths: refPaths.map((r) => r.path),
      pessoasCount,
      pessoaLabels: pessoaLabels.filter((l): l is string => !!l),
      freestyleText: freestyleText ?? undefined,
      generationTier,
      ensaioTypeSlug: ensaio_type_slug || undefined,
    }).catch((err) => {
      console.error(`[generation ${ensaio.id}] failed:`, err);
    });

    return NextResponse.json({ ensaioId: ensaio.id, ensaio_id: ensaio.id });
  } catch (err) {
    console.error("/api/generate unexpected error:", err);
    if (ensaioId) {
      await admin.from("ensaios").update({ status: "failed" }).eq("id", ensaioId);
    }
    await refund();
    return NextResponse.json(
      { error: "erro inesperado — créditos devolvidos" },
      { status: 500 }
    );
  }
}
