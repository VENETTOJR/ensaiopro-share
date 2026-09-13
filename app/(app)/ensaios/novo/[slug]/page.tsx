import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { NovoEnsaioClient } from "./client";

export default async function NovoEnsaioPage({
  params,
}: {
  params: Promise<{ slug: string }>;
}) {
  const { slug } = await params;
  const supabase = await createClient();

  const { data: tipo } = await supabase
    .from("ensaio_types")
    .select("id, slug, name, description, supports_idade, icon, max_pessoas")
    .eq("slug", slug)
    .eq("active", true)
    .maybeSingle();

  if (!tipo) notFound();

  const { data: prompts } = await supabase
    .from("prompts")
    .select("id, numero, texto, example_image_url, categoria")
    .eq("ensaio_type_id", tipo.id)
    .eq("active", true)
    .order("numero", { ascending: true });

  const { data: { user } } = await supabase.auth.getUser();
  const { data: profile } = await supabase
    .from("profiles")
    .select("photo_credits")
    .eq("id", user!.id)
    .single();

  return (
    <NovoEnsaioClient
      tipo={tipo}
      prompts={prompts ?? []}
      credits={profile?.photo_credits ?? 0}
    />
  );
}
