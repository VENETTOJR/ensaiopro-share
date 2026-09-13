/**
 * GET /api/admin/prompts       — lista prompts com filtros
 * POST /api/admin/prompts      — cria prompt novo
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

export async function GET(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const url = new URL(req.url);
  const categoria = url.searchParams.get("categoria") ?? "";
  const activeParam = url.searchParams.get("active");
  const search = url.searchParams.get("search")?.trim() ?? "";

  const admin = await createAdminClient();
  let q = admin
    .from("prompts")
    .select("id, ensaio_type_id, numero, categoria, texto, example_image_url, active, sort_order, created_at, updated_at")
    .order("categoria", { ascending: true })
    .order("numero", { ascending: true });

  if (categoria) q = q.eq("categoria", categoria);
  if (activeParam === "true") q = q.eq("active", true);
  if (activeParam === "false") q = q.eq("active", false);
  if (search) q = q.ilike("texto", `%${search}%`);

  const { data, error } = await q;
  if (error) return NextResponse.json({ error: error.message }, { status: 500 });

  const { data: tipos } = await admin
    .from("ensaio_types")
    .select("id, slug, name")
    .order("sort_order", { ascending: true });

  const categorias = Array.from(new Set((data ?? []).map((p) => p.categoria))).sort();

  return NextResponse.json({
    rows: data ?? [],
    categorias,
    tipos: tipos ?? [],
  });
}

export async function POST(req: NextRequest) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const texto = String(body.texto ?? "").trim();
  const categoria = String(body.categoria ?? "").trim();
  const ensaio_type_id = String(body.ensaio_type_id ?? "").trim();

  if (!texto || texto.length < 30) {
    return NextResponse.json({ error: "texto muito curto" }, { status: 400 });
  }
  if (!categoria) return NextResponse.json({ error: "categoria obrigatória" }, { status: 400 });
  if (!ensaio_type_id) return NextResponse.json({ error: "ensaio_type_id obrigatório" }, { status: 400 });

  const admin = await createAdminClient();

  // Próximo numero + sort_order da categoria
  const { data: maxRow } = await admin
    .from("prompts")
    .select("numero, sort_order")
    .eq("categoria", categoria)
    .order("numero", { ascending: false })
    .limit(1)
    .maybeSingle();
  const nextNum = (maxRow?.numero ?? 0) + 1;
  const nextSort = (maxRow?.sort_order ?? 0) + 1;

  const { data, error } = await admin
    .from("prompts")
    .insert({
      ensaio_type_id,
      categoria,
      numero: body.numero ?? nextNum,
      sort_order: body.sort_order ?? nextSort,
      texto,
      active: body.active ?? true,
      example_image_url: body.example_image_url ?? null,
      framing: body.framing ?? null,
      creditos_por_foto: body.creditos_por_foto ?? null,
    })
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prompt: data });
}
