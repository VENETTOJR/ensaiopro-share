import { redirect } from "next/navigation";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { DashboardClient, type EnsaioTypeView } from "./client";

/**
 * Categorização granular — 7 grupos cobrem todos os tipos atuais + novos.
 */
function categorizar(slug: string): EnsaioTypeView["group"] {
  const s = slug.toLowerCase();

  // Infantil — crianças / super-heróis / temas
  if (["bebe", "bebe-masc", "bat", "super", "cap", "hom", "fer", "hul", "flash", "can", "bomb", "rel", "car", "pascol", "masc"].includes(s))
    return "infantil";

  // Casal / família / mãe
  if (["familia", "casal", "mae"].includes(s)) return "familia";

  // Profissional (corporativo, formatura, executiva, padrão feminino clássico)
  if (["corporativo", "forma", "executiva-premium", "padrao-feminino"].includes(s)) return "profissional";

  // Esportivo/torcida
  if (["copa-brasil"].includes(s)) return "celebracoes";

  // Lifestyle (café, cozinha, pet, yoga, tropical)
  if (["cafe-urbano", "cozinha-gourmet", "pet-amor", "fitness-yoga", "tropical-ferias"].includes(s))
    return "lifestyle";

  // Artístico (retrô, preto&branco, natureza, noite urbana, editorial)
  if (["retro-vintage", "preto-branco", "natureza-floresta", "noite-urbana"].includes(s))
    return "artistico";

  // Romântico / boudoir / gestante
  if (["sensual", "gestante", "boudoir-elegante", "praia-sunset"].includes(s))
    return "romantico";

  // Especiais (aniversários, 15 anos, evangélico, praia)
  if (["aniversario", "ani", "velas", "15anosestudio", "evan", "praia"].includes(s))
    return "celebracoes";

  return "celebracoes";
}

export default async function DashboardPage() {
  const supabase = await createClient();

  const { data: { user: currentUser } } = await supabase.auth.getUser();
  if (currentUser) {
    const { data: me } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", currentUser.id)
      .single();
    if (me?.role === "admin") redirect("/admin");
  }

  const admin = await createAdminClient();
  const { data: types } = await admin
    .from("ensaio_types")
    .select("id, slug, name, description, icon, sort_order")
    .eq("active", true)
    .order("sort_order", { ascending: true });

  // Busca a 1ª imagem de exemplo de cada tipo pra usar como capa visual
  let coversMap = new Map<string, string>();
  if (types && types.length > 0) {
    const { data: coversRows } = await admin
      .from("prompts")
      .select("ensaio_type_id, example_image_url")
      .in("ensaio_type_id", types.map((t) => t.id))
      .not("example_image_url", "is", null)
      .eq("active", true)
      .order("numero", { ascending: true });

    if (coversRows) {
      for (const row of coversRows) {
        if (row.ensaio_type_id && row.example_image_url && !coversMap.has(row.ensaio_type_id)) {
          coversMap.set(row.ensaio_type_id, row.example_image_url);
        }
      }
    }
  }

  const { data: ensaiosRecentes } = await supabase
    .from("ensaios")
    .select("id, name, status, created_at, ensaio_types(name, slug)")
    .eq("user_id", currentUser!.id)
    .order("created_at", { ascending: false })
    .limit(3);

  const { data: profileData } = await supabase
    .from("profiles")
    .select("photo_credits, name, email")
    .eq("id", currentUser!.id)
    .single();

  // Stats totais do user pro hero
  const { count: totalEnsaios } = await supabase
    .from("ensaios")
    .select("*", { count: "exact", head: true })
    .eq("user_id", currentUser!.id);

  const { count: totalFotos } = await supabase
    .from("fotos_geradas")
    .select("*", { count: "exact", head: true })
    .eq("user_id", currentUser!.id)
    .eq("status", "completed");

  // Ensaio em processamento pro card "continue de onde parou"
  const { data: ensaioProc } = await supabase
    .from("ensaios")
    .select("id, name, total_generated, total_prompts, total_failed, ensaio_types(name, slug)")
    .eq("user_id", currentUser!.id)
    .eq("status", "processing")
    .order("created_at", { ascending: false })
    .limit(1)
    .maybeSingle();

  const typesView: EnsaioTypeView[] = (types ?? []).map((t) => ({
    id: t.id,
    slug: t.slug,
    name: t.name,
    description: t.description,
    icon: t.icon,
    group: categorizar(t.slug),
    cover: coversMap.get(t.id) ?? null,
  }));

  const recentesView = (ensaiosRecentes ?? []).map((e) => ({
    id: e.id,
    name: e.name,
    status: e.status,
    created_at: e.created_at,
    tipo_name:
      (Array.isArray(e.ensaio_types) ? e.ensaio_types[0]?.name : (e.ensaio_types as { name?: string } | null)?.name) ?? "Ensaio",
  }));

  const procView = ensaioProc
    ? {
        id: ensaioProc.id,
        name: ensaioProc.name ?? "Ensaio em andamento",
        generated: ensaioProc.total_generated ?? 0,
        total: ensaioProc.total_prompts ?? 0,
        failed: ensaioProc.total_failed ?? 0,
        tipo_name:
          (Array.isArray(ensaioProc.ensaio_types)
            ? ensaioProc.ensaio_types[0]?.name
            : (ensaioProc.ensaio_types as { name?: string } | null)?.name) ?? "Ensaio",
      }
    : null;

  return (
    <DashboardClient
      types={typesView}
      recentes={recentesView}
      credits={profileData?.photo_credits ?? 0}
      userName={profileData?.name ?? null}
      totalEnsaios={totalEnsaios ?? 0}
      totalFotos={totalFotos ?? 0}
      processing={procView}
    />
  );
}
