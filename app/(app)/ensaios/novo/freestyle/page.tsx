/**
 * Story 06 — Modo freestyle (lifestyle prompt).
 *
 * Acesso DISCRETO: link pequeno no fim da lista de tipos. SEM badge "NEW",
 * SEM banner. Custo = 1 crédito por foto. Limite 5 ensaios/dia/user.
 *
 * Princípio §1.bis: zero menção a R$/USD/nome de modelo.
 */

import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { FreestyleClient } from "./client";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Modo avançado",
  description: "Modo experimental. Resultado pode variar.",
  robots: { index: false, follow: false }, // CON-5.2 — sem SEO
};

export const dynamic = "force-dynamic";

export default async function FreestylePage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) redirect("/login?next=/ensaios/novo/freestyle");

  const { data: profile } = await supabase
    .from("profiles")
    .select("photo_credits")
    .eq("id", user.id)
    .single();

  // Feature flag: só mostra tier "Detalhado" se OPENAI_API_KEY estiver configurada.
  // Evita UI quebrada quando user escolhe tier sem provider backend disponível.
  const detailedEnabled = !!process.env.OPENAI_API_KEY;

  return (
    <FreestyleClient
      credits={profile?.photo_credits ?? 0}
      detailedEnabled={detailedEnabled}
    />
  );
}
