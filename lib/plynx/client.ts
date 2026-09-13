/**
 * Cliente da API do Plynx (gateway interno em 127.0.0.1:3456).
 * Plynx já roda Next.js + Supabase + Pagar.me (cartão + PIX).
 *
 * Fluxo Ensa.IA → Plynx:
 * 1. Usuário escolhe plano → POST /api/checkout/create-order
 * 2. Plynx responde com { checkoutUrl } → redirect
 * 3. Usuário paga no Plynx
 * 4. Webhook Plynx → /api/webhook/plynx → adiciona créditos
 */

const PLYNX_URL = process.env.PLYNX_URL || "http://127.0.0.1:3456";

export interface PlynxOrderInput {
  userId: string;
  userEmail: string;
  userName?: string;
  userDocument?: string;
  userPhone?: string;
  planSlug: "entrada" | "intermediario" | "popular";
  amountCents: number;
  description: string;
  metadata?: Record<string, unknown>;
  successUrl: string;
  cancelUrl: string;
}

export interface PlynxOrderResult {
  orderId: string;
  checkoutUrl: string;
}

export async function createOrder(input: PlynxOrderInput): Promise<PlynxOrderResult> {
  const res = await fetch(`${PLYNX_URL}/api/checkout/create-order`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      ...(process.env.PLYNX_API_KEY
        ? { Authorization: `Bearer ${process.env.PLYNX_API_KEY}` }
        : {}),
    },
    body: JSON.stringify({
      source: "ensaiopro",
      user: {
        id: input.userId,
        email: input.userEmail,
        name: input.userName,
        document: input.userDocument,
        phone: input.userPhone,
      },
      product: {
        slug: input.planSlug,
        description: input.description,
        amount: input.amountCents,
      },
      metadata: input.metadata ?? {},
      successUrl: input.successUrl,
      cancelUrl: input.cancelUrl,
    }),
    cache: "no-store",
  });

  if (!res.ok) {
    const text = await res.text();
    throw new Error(`Plynx create-order failed: ${res.status} ${text}`);
  }

  const data = await res.json();
  return {
    orderId: data.orderId ?? data.id,
    checkoutUrl: data.checkoutUrl ?? data.url,
  };
}

export interface PlynxWebhookPayload {
  event: "payment.paid" | "payment.refunded" | "payment.failed";
  orderId: string;
  amountCents: number;
  metadata?: Record<string, unknown>;
}

export function verifyWebhookSignature(
  body: string,
  signature: string | null
): boolean {
  const secret = process.env.PLYNX_WEBHOOK_SECRET;
  if (!secret) return true; // dev mode
  if (!signature) return false;
  // HMAC verification — align with Plynx impl. For now accept matching secret.
  return signature === secret;
}
