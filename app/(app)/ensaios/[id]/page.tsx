import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { EnsaioDetailClient } from "./client";

export default async function EnsaioDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const supabase = await createClient();

  const { data: { user } } = await supabase.auth.getUser();
  if (!user) notFound();

  const { data: ensaio } = await supabase
    .from("ensaios")
    .select("id, name, status, total_prompts, total_generated, total_failed, created_at, ensaio_types(name, slug)")
    .eq("id", id)
    .eq("user_id", user.id)
    .maybeSingle();

  if (!ensaio) notFound();

  const ensaioTypes = Array.isArray(ensaio.ensaio_types)
    ? ensaio.ensaio_types[0] ?? null
    : ensaio.ensaio_types;

  return (
    <EnsaioDetailClient
      ensaioId={id}
      initialEnsaio={{ ...ensaio, ensaio_types: ensaioTypes }}
    />
  );
}
