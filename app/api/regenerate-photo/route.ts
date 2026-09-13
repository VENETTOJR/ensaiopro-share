/**
 * POST /api/regenerate-photo
 * Refaz 1 foto específica do ensaio. Consome 1 crédito.
 * Body: { ensaioId, promptId, fotoGeradaId }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { regenerateSinglePhoto } from "@/lib/gemini/run-generation";

export const runtime = "nodejs";
export const maxDuration = 120;

export async function POST(req: NextRequest) {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const body = await req.json();
  const { ensaioId, promptId, fotoGeradaId } = body;
  if (!ensaioId || !promptId) {
    return NextResponse.json({ error: "missing params" }, { status: 400 });
  }

  // Valida ownership do ensaio
  const { data: ensaio } = await supabase
    .from("ensaios")
    .select("id, user_id")
    .eq("id", ensaioId)
    .eq("user_id", user.id)
    .maybeSingle();
  if (!ensaio) return NextResponse.json({ error: "ensaio não encontrado" }, { status: 404 });

  const result = await regenerateSinglePhoto({
    ensaioId,
    userId: user.id,
    promptId,
    fotoGeradaId,
  });

  if (!result.ok) {
    const status = result.error === "créditos insuficientes" ? 402 : 500;
    return NextResponse.json({ error: result.error }, { status });
  }

  return NextResponse.json({ ok: true, foto: result.foto });
}
