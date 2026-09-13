/**
 * POST /api/retry-ensaio
 * Refaz prompts que falharam num ensaio.
 *
 * Estratégia (em ordem de preferência):
 *  1. Usa `ensaios.prompt_ids` persistido (nova coluna, ensaios criados após fix)
 *  2. Fallback: lista prompt_ids das tentativas em `fotos_geradas` (ensaios antigos)
 *
 * Debita 1 crédito por prompt a refazer. Devolve em caso de falha (refund automático).
 *
 * Body: { ensaioId }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { runGeneration } from "@/lib/gemini/run-generation";

export const runtime = "nodejs";
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const { ensaioId } = await req.json();
  if (!ensaioId) return NextResponse.json({ error: "ensaioId required" }, { status: 400 });

  const admin = await createAdminClient();

  // Valida ownership + pega prompt_ids persistidos
  const { data: ensaio } = await admin
    .from("ensaios")
    .select("id, user_id, status, prompt_ids")
    .eq("id", ensaioId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!ensaio) return NextResponse.json({ error: "ensaio não encontrado" }, { status: 404 });
  if (ensaio.status === "processing") {
    return NextResponse.json({ error: "ensaio ainda processando" }, { status: 409 });
  }

  const { data: fotosExistentes } = await admin
    .from("fotos_geradas")
    .select("id, prompt_id, status")
    .eq("ensaio_id", ensaioId);

  const okIds = new Set(
    (fotosExistentes ?? []).filter((f) => f.status === "completed").map((f) => f.prompt_id)
  );

  // Fonte 1: coluna prompt_ids persistida (novo fluxo)
  // Fonte 2 (fallback): prompt_ids das tentativas (ensaios antigos)
  const sourceIds: string[] =
    ensaio.prompt_ids && ensaio.prompt_ids.length > 0
      ? (ensaio.prompt_ids as string[])
      : Array.from(
          new Set((fotosExistentes ?? []).map((f) => f.prompt_id).filter((id): id is string => !!id))
        );

  const originalPromptIds = sourceIds.filter((id) => !okIds.has(id));

  if (originalPromptIds.length === 0) {
    const hasNoSource = sourceIds.length === 0;
    return NextResponse.json(
      {
        error: hasNoSource
          ? "Ensaio antigo sem histórico pra retomar. Crie um novo ensaio — as mesmas fotos de referência ainda estão lá."
          : "nada a refazer",
      },
      { status: 400 }
    );
  }

  // Debita créditos
  const { data: debitOk } = await supabase.rpc("debit_credits", {
    p_user_id: user.id,
    p_amount: originalPromptIds.length,
  });
  if (!debitOk) {
    return NextResponse.json({ error: "créditos insuficientes" }, { status: 402 });
  }

  // Apaga registros falhos
  const failedRecordIds = (fotosExistentes ?? [])
    .filter((f) => f.status === "failed")
    .map((f) => f.id);
  if (failedRecordIds.length > 0) {
    await admin.from("fotos_geradas").delete().in("id", failedRecordIds);
  }

  // Refs
  const { data: refsRows } = await admin
    .from("fotos_referencia")
    .select("storage_path")
    .eq("ensaio_id", ensaioId)
    .order("sort_order");

  const referencePaths = (refsRows ?? []).map((r) => r.storage_path);

  // Marca processing + garante prompt_ids persistido (pra próxima recovery)
  await admin
    .from("ensaios")
    .update({
      status: "processing",
      total_failed: 0,
      prompt_ids: sourceIds,
    })
    .eq("id", ensaioId);

  runGeneration({
    ensaioId,
    userId: user.id,
    promptIds: originalPromptIds,
    referencePaths,
  }).catch((err) => {
    console.error(`[retry ${ensaioId}] failed:`, err);
  });

  return NextResponse.json({ ok: true, retrying: originalPromptIds.length });
}
