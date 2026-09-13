/**
 * POST /api/admin/regenerate-ensaio  body: { ensaioId }
 *
 * Admin-only. Pega TUDO do ensaio original (refs storage + prompt_ids +
 * pessoas + idade) e dispara um NOVO ensaio sem cobrar créditos.
 * Útil quando provider mudou (Nano → Runware/Flux) e queremos refazer
 * com mesmo briefing pra comparar fidelidade.
 *
 * Retorna: { ok: true, newEnsaioId, prompts: N, refs: M }
 */

import { NextResponse, type NextRequest } from "next/server";
import { randomUUID } from "node:crypto";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";
import { runGeneration } from "@/lib/gemini/run-generation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  // Aceita 2 formas de auth:
  //   1) Cookie admin (user logado como admin via UI)
  //   2) Header X-Service-Role com SUPABASE_SERVICE_ROLE_KEY (uso interno/script)
  const serviceHeader = req.headers.get("x-service-role");
  const isServiceCall =
    serviceHeader && serviceHeader === process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!isServiceCall) {
    const auth = await requireAdmin();
    if (!auth.ok) return auth.response;
  }

  const body = (await req.json().catch(() => null)) as { ensaioId?: string } | null;
  const ensaioId = body?.ensaioId;
  if (!ensaioId) {
    return NextResponse.json({ error: "ensaioId required" }, { status: 400 });
  }

  const admin = await createAdminClient();

  // 1) Pega ensaio original
  const { data: orig, error: origErr } = await admin
    .from("ensaios")
    .select("user_id, idade, pessoas_count, prompt_ids, ensaio_type_id, source, generation_tier, freestyle_text, total_prompts")
    .eq("id", ensaioId)
    .maybeSingle();
  if (origErr || !orig) {
    return NextResponse.json({ error: "ensaio original não encontrado" }, { status: 404 });
  }

  const promptIds = (orig.prompt_ids ?? []) as string[];
  if (!promptIds.length && !orig.freestyle_text) {
    return NextResponse.json(
      { error: "ensaio sem prompt_ids persistidos — não dá pra regenerar" },
      { status: 400 },
    );
  }

  // 2) Pega refs do ensaio original
  const { data: refs } = await admin
    .from("fotos_referencia")
    .select("storage_path, pessoa_index, sort_order, quality_label, quality_metadata, size_bytes")
    .eq("ensaio_id", ensaioId)
    .order("sort_order", { ascending: true });

  if (!refs || refs.length === 0) {
    return NextResponse.json({ error: "sem refs no ensaio original" }, { status: 400 });
  }

  // 3) Cria novo ensaio
  const newId = randomUUID();
  const { error: insErr } = await admin.from("ensaios").insert({
    id: newId,
    user_id: orig.user_id,
    idade: orig.idade,
    pessoas_count: orig.pessoas_count,
    total_prompts: orig.total_prompts,
    prompt_ids: promptIds,
    ensaio_type_id: orig.ensaio_type_id,
    source: orig.source ?? "template",
    status: "processing",
    generation_tier: orig.generation_tier ?? "fast",
    freestyle_text: orig.freestyle_text,
  });
  if (insErr) {
    return NextResponse.json({ error: `insert ensaio: ${insErr.message}` }, { status: 500 });
  }

  // 4) Copia refs no storage + insere rows pro novo ensaio
  const newRefPaths: string[] = [];
  for (const r of refs) {
    const fromPath = r.storage_path as string;
    const toPath = fromPath.replace(`/${ensaioId}/`, `/${newId}/`);
    if (toPath === fromPath) continue;

    const { data: blob, error: dlErr } = await admin.storage.from("references").download(fromPath);
    if (dlErr || !blob) {
      console.warn(`[regenerate] skip ref ${fromPath}: ${dlErr?.message}`);
      continue;
    }
    const buf = Buffer.from(await blob.arrayBuffer());
    const { error: upErr } = await admin.storage.from("references").upload(toPath, buf, {
      upsert: true,
      contentType: blob.type || "image/jpeg",
    });
    if (upErr) {
      console.warn(`[regenerate] upload fail ${toPath}: ${upErr.message}`);
      continue;
    }

    const { error: refInsErr } = await admin.from("fotos_referencia").insert({
      ensaio_id: newId,
      user_id: orig.user_id,
      storage_path: toPath,
      pessoa_index: r.pessoa_index,
      sort_order: r.sort_order,
      quality_label: r.quality_label,
      quality_metadata: r.quality_metadata,
      size_bytes: r.size_bytes,
    });
    if (refInsErr) {
      console.warn(`[regenerate] insert ref row fail: ${refInsErr.message}`);
      continue;
    }
    newRefPaths.push(toPath);
  }

  if (newRefPaths.length === 0) {
    await admin.from("ensaios").update({ status: "failed" }).eq("id", newId);
    return NextResponse.json({ error: "falha ao copiar refs" }, { status: 500 });
  }

  // 5) Dispara worker (sem cobrar — admin override)
  const tier = (orig.generation_tier === "detailed" ? "detailed" : "fast") as "fast" | "detailed";
  runGeneration({
    ensaioId: newId,
    userId: orig.user_id as string,
    promptIds,
    referencePaths: newRefPaths,
    pessoasCount: orig.pessoas_count ?? 1,
    freestyleText: orig.freestyle_text ?? undefined,
    generationTier: tier,
  }).catch((err) => {
    console.error(`[admin/regenerate ${newId}]`, err);
  });

  return NextResponse.json({
    ok: true,
    newEnsaioId: newId,
    promptsToGenerate: promptIds.length,
    refsCopied: newRefPaths.length,
    sourceEnsaio: ensaioId,
  });
}
