/**
 * PATCH /api/admin/prompts/[id]   — atualiza prompt (texto, categoria, active, example_image_url, etc)
 * DELETE /api/admin/prompts/[id]  — soft-delete (active=false)
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/admin/auth";

export const runtime = "nodejs";

type RouteCtx = { params: Promise<{ id: string }> };

export async function PATCH(req: NextRequest, ctx: RouteCtx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const body = await req.json().catch(() => null);
  if (!body || typeof body !== "object") {
    return NextResponse.json({ error: "invalid body" }, { status: 400 });
  }

  const update: Record<string, unknown> = {
    updated_at: new Date().toISOString(),
  };
  if (typeof body.texto === "string") update.texto = body.texto;
  if (typeof body.categoria === "string") update.categoria = body.categoria;
  if (typeof body.ensaio_type_id === "string") update.ensaio_type_id = body.ensaio_type_id;
  if (typeof body.active === "boolean") update.active = body.active;
  if (body.example_image_url !== undefined) update.example_image_url = body.example_image_url;
  if (typeof body.numero === "number") update.numero = body.numero;
  if (typeof body.sort_order === "number") update.sort_order = body.sort_order;
  if (body.framing !== undefined) update.framing = body.framing;
  if (body.creditos_por_foto !== undefined) update.creditos_por_foto = body.creditos_por_foto;

  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("prompts")
    .update(update)
    .eq("id", id)
    .select()
    .single();

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ prompt: data });
}

export async function DELETE(_req: NextRequest, ctx: RouteCtx) {
  const auth = await requireAdmin();
  if (!auth.ok) return auth.response;

  const { id } = await ctx.params;
  const admin = await createAdminClient();
  const { error } = await admin
    .from("prompts")
    .update({ active: false, updated_at: new Date().toISOString() })
    .eq("id", id);

  if (error) return NextResponse.json({ error: error.message }, { status: 500 });
  return NextResponse.json({ ok: true });
}
