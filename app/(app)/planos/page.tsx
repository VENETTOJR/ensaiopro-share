import { createClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";
import { PlanosClient } from "./client";

export default async function PlanosPage() {
  const supabase = await createClient();
  const { data: plans } = await supabase
    .from("plans")
    .select("id, slug, name, quantidade, preco_cents, popular, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("name, email, phone, document, photo_credits")
    .eq("id", user!.id)
    .single();

  return (
    <PlanosClient
      plans={(plans ?? []).map((p) => ({
        ...p,
        preco_formatted: formatBRL(p.preco_cents / 100),
        per_photo: formatBRL(p.preco_cents / 100 / p.quantidade),
      }))}
      profile={profile ?? { name: null, email: null, phone: null, document: null, photo_credits: 0 }}
    />
  );
}
