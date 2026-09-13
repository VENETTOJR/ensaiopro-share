/**
 * POST /api/webhook/plynx
 * Recebe webhooks outbound do Plynx (dispatchWebhooks).
 * Payload: { event, order_id, data: {...}, timestamp }
 */

import { NextResponse, type NextRequest } from "next/server";
import { createAdminClient } from "@/lib/supabase/server";
import { createHmac, timingSafeEqual } from "node:crypto";

function verifySignature(body: string, signature: string | null): boolean {
  const secret = process.env.PLYNX_WEBHOOK_SECRET;
  if (!secret) return true;
  if (!signature) return false;
  const expected = createHmac("sha256", secret).update(body).digest("hex");
  try {
    const a = Buffer.from(expected, "hex");
    const b = Buffer.from(signature.replace(/^sha256=/, ""), "hex");
    return a.length === b.length && timingSafeEqual(a, b);
  } catch {
    return false;
  }
}

interface PlynxPayload {
  event: string;
  order_id?: string;
  data: {
    order_id?: string;
    id?: string;
    pagarme_order_id?: string;
    amount_cents?: number;
    payment_method?: string;
    ext_ref?: string;
    // Plynx envia customer_email (flat) — estas são de backup
    customer_email?: string;
    customer_name?: string;
    product_name?: string;
    customer?: { email?: string; name?: string };
    product?: { slug?: string; price_cents?: number };
    metadata?: Record<string, unknown>;
  };
  timestamp: string;
}

export async function POST(req: NextRequest) {
  const body = await req.text();
  const signature =
    req.headers.get("x-hub-signature-256") ??
    req.headers.get("x-webhook-signature") ??
    req.headers.get("x-plynx-signature") ??
    req.headers.get("x-signature");

  if (!verifySignature(body, signature)) {
    console.warn("[webhook/plynx] invalid signature");
    return NextResponse.json({ error: "invalid signature" }, { status: 401 });
  }

  let payload: PlynxPayload;
  try {
    payload = JSON.parse(body);
  } catch {
    return NextResponse.json({ error: "invalid json" }, { status: 400 });
  }

  console.log(`[webhook/plynx] ${payload.event} order=${payload.order_id}`);

  const { event, data } = payload;
  if (!data) return NextResponse.json({ ok: true, ignored: "no data" });

  const admin = await createAdminClient();

  async function findCompra() {
    const extRef = data.ext_ref ?? (data.metadata?.ext_ref as string | undefined);
    if (extRef) {
      const { data: c } = await admin
        .from("compras")
        .select("*")
        .eq("id", extRef)
        .maybeSingle();
      if (c) return c;
    }
    const email = data.customer_email ?? data.customer?.email;
    const amountCents = data.amount_cents;
    if (email && amountCents) {
      const { data: c } = await admin
        .from("compras")
        .select("*, profiles!inner(email)")
        .eq("status", "pending")
        .eq("profiles.email", email)
        .eq("valor_cents", amountCents)
        .order("created_at", { ascending: false })
        .limit(1)
        .maybeSingle();
      if (c) return c;
    }
    return null;
  }

  if (event === "order.paid") {
    const compra = await findCompra();
    if (!compra) {
      console.warn("[webhook/plynx] compra não encontrada");
      return NextResponse.json({ ok: true, ignored: "compra não encontrada" });
    }

    if (compra.status === "paid") {
      return NextResponse.json({ ok: true, already_paid: true });
    }

    // Claim atômico: UPDATE com WHERE status='pending' pega row-lock no Postgres.
    // Se chegar webhook duplicado, a 2ª request retorna 0 linhas e NÃO credita.
    const { data: claimed, error: claimErr } = await admin
      .from("compras")
      .update({
        status: "paid",
        plynx_order_id: data.id ?? data.pagarme_order_id ?? payload.order_id,
        metodo: data.payment_method ?? null,
        paid_at: new Date().toISOString(),
        metadata: {
          ...compra.metadata,
          plynx_event: event,
          pagarme_order_id: data.pagarme_order_id,
        },
      })
      .eq("id", compra.id)
      .eq("status", "pending")
      .select("id, user_id, quantidade")
      .maybeSingle();

    if (claimErr) {
      console.error("[webhook/plynx] claim failed", claimErr);
      return NextResponse.json({ error: claimErr.message }, { status: 500 });
    }

    if (!claimed) {
      return NextResponse.json({ ok: true, already_paid: true });
    }

    await admin.rpc("add_credits", {
      p_user_id: claimed.user_id,
      p_amount: claimed.quantidade,
    });

    return NextResponse.json({
      ok: true,
      credited: claimed.quantidade,
      compraId: claimed.id,
    });
  }

  if (event === "order.refunded") {
    const compra = await findCompra();
    if (compra) {
      await admin.from("compras").update({ status: "refunded" }).eq("id", compra.id);
    }
    return NextResponse.json({ ok: true });
  }

  if (event === "order.failed") {
    const compra = await findCompra();
    if (compra) {
      await admin.from("compras").update({ status: "failed" }).eq("id", compra.id);
    }
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: true, ignored: event });
}
