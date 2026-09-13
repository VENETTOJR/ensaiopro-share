/**
 * POST /api/checkout
 * Redireciona pro checkout externo do Plynx (checkout.plynxpay.com/{slug}).
 *
 * Fluxo:
 *  1. Valida plano + usuário
 *  2. Cria registro em `compras` (pending) com metadata do usuário
 *  3. Devolve URL https://checkout.plynxpay.com/{plynx_product_slug}?customer_email=...
 *  4. Frontend redireciona
 *  5. Plynx processa e via webhook outbound credita o usuário
 */

import { NextResponse, type NextRequest } from "next/server";
import { cookies } from "next/headers";
import { createClient, createAdminClient } from "@/lib/supabase/server";

// URL do checkout Plynx. O guia oficial usa https://plynxpay.com/checkout/<slug>
// mas checkout.plynxpay.com/<slug> também funciona.
const PLYNX_CHECKOUT_URL =
  process.env.PLYNX_CHECKOUT_URL || "https://plynxpay.com/checkout";

export async function POST(req: NextRequest) {
  const { planId } = await req.json();
  if (!planId) return NextResponse.json({ error: "planId required" }, { status: 400 });

  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (!user) return NextResponse.json({ error: "unauthorized" }, { status: 401 });

  const [{ data: plan }, { data: profile }] = await Promise.all([
    supabase
      .from("plans")
      .select("id, slug, name, quantidade, preco_cents, plynx_product_slug")
      .eq("id", planId)
      .eq("active", true)
      .maybeSingle(),
    supabase
      .from("profiles")
      .select("name, email, phone, document")
      .eq("id", user.id)
      .single(),
  ]);

  if (!plan?.plynx_product_slug) {
    return NextResponse.json(
      { error: "plano sem produto Plynx configurado" },
      { status: 500 }
    );
  }

  const cookieStore = await cookies();
  const affiliateCode = cookieStore.get("ensaiopro_aff")?.value?.trim() || null;
  const affiliateValid =
    affiliateCode && /^[a-zA-Z0-9_-]{2,64}$/.test(affiliateCode) ? affiliateCode : null;

  const admin = await createAdminClient();
  const { data: compra, error } = await admin
    .from("compras")
    .insert({
      user_id: user.id,
      plan_id: plan.id,
      valor_cents: plan.preco_cents,
      quantidade: plan.quantidade,
      status: "pending",
      metadata: {
        plynx_product_slug: plan.plynx_product_slug,
        ...(affiliateValid ? { affiliate_ref: affiliateValid } : {}),
      },
    })
    .select("id")
    .single();

  if (error || !compra) {
    return NextResponse.json(
      { error: error?.message ?? "falha ao criar compra" },
      { status: 500 }
    );
  }

  const params = new URLSearchParams();
  params.set("ext_ref", compra.id);
  params.set("source", "ensaiopro");
  if (affiliateValid) params.set("ref", affiliateValid);
  if (user.email) params.set("email", user.email);
  if (profile?.name) params.set("name", profile.name);
  if (profile?.phone) params.set("phone", profile.phone);
  if (profile?.document) params.set("document", profile.document);

  const checkoutUrl = `${PLYNX_CHECKOUT_URL}/${plan.plynx_product_slug}?${params.toString()}`;

  return NextResponse.json({ checkoutUrl, compraId: compra.id });
}
