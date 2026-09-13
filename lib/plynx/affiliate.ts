import { createClient } from "@supabase/supabase-js";

// IDs fixos dos 3 produtos EnsaioPro no Plynx (não muda).
export const PLYNX_ENSAIOPRO_PRODUCT_IDS = [
  "3edbb2cf-3d28-49a5-8d55-6d3bc2ec6aa4", // Entrada
  "fa041d95-d321-4e77-a992-9d8670e90463", // Intermediário
  "7f07042e-e358-444b-b3f4-17d37d929020", // Popular
] as const;

export interface AffiliateProduct {
  product_id: string;
  product_name: string;
  product_price_cents: number;
  custom_slug: string;
  commission_type: "percent" | "fixed";
  commission_value: number;
  active: boolean;
}

export interface AffiliateInfo {
  affiliate_id: string;
  status: string;
  kyc_status: string | null;
  /** Slug unificado entre os 3 produtos — usar como ?ref= no link curto */
  unified_slug: string | null;
  products: AffiliateProduct[];
}

function plynxAdmin() {
  const url = process.env.PLYNX_SUPABASE_URL;
  const key = process.env.PLYNX_SUPABASE_SERVICE_KEY;
  if (!url || !key) return null;
  return createClient(url, key, {
    auth: { persistSession: false, autoRefreshToken: false },
  });
}

export async function getAffiliateInfo(email: string): Promise<AffiliateInfo | null> {
  const admin = plynxAdmin();
  if (!admin) return null;

  const { data: aff } = await admin
    .from("affiliates")
    .select("id, status, pagarme_kyc_status")
    .eq("email", email.toLowerCase())
    .maybeSingle();

  if (!aff) return null;

  const { data: links } = await admin
    .from("affiliate_products")
    .select("product_id, custom_slug, commission_type, commission_value, active")
    .eq("affiliate_id", aff.id)
    .in("product_id", PLYNX_ENSAIOPRO_PRODUCT_IDS as unknown as string[]);

  if (!links?.length) {
    return {
      affiliate_id: aff.id,
      status: aff.status,
      kyc_status: aff.pagarme_kyc_status ?? null,
      unified_slug: null,
      products: [],
    };
  }

  // Unifica os custom_slug dos produtos EnsaioPro pra UM só.
  // Plynx exige (product_id, custom_slug) único — mesmo slug em produtos
  // diferentes é OK. Pega o primeiro como canônico e atualiza os outros.
  const activeLinks = links.filter((l) => l.active);
  const canonicalSlug = activeLinks[0]?.custom_slug ?? links[0].custom_slug;
  const needsSync = links.some((l) => l.custom_slug !== canonicalSlug);

  if (needsSync && canonicalSlug) {
    const idsToUpdate = links
      .filter((l) => l.custom_slug !== canonicalSlug)
      .map((l) => l.product_id);
    await admin
      .from("affiliate_products")
      .update({ custom_slug: canonicalSlug })
      .eq("affiliate_id", aff.id)
      .in("product_id", idsToUpdate);
    for (const l of links) l.custom_slug = canonicalSlug;
  }

  const { data: products } = await admin
    .from("products")
    .select("id, name, price_cents")
    .in("id", links.map((l) => l.product_id));

  const productMap = new Map(products?.map((p) => [p.id, p]) ?? []);

  return {
    affiliate_id: aff.id,
    status: aff.status,
    kyc_status: aff.pagarme_kyc_status ?? null,
    unified_slug: canonicalSlug,
    products: links.map((l) => ({
      product_id: l.product_id,
      product_name: productMap.get(l.product_id)?.name ?? "Produto",
      product_price_cents: productMap.get(l.product_id)?.price_cents ?? 0,
      custom_slug: l.custom_slug,
      commission_type: l.commission_type,
      commission_value: Number(l.commission_value),
      active: l.active,
    })),
  };
}
