import Link from "next/link";
import Image from "next/image";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { Camera, Plus, Sparkles, Clock, CheckCircle2, XCircle } from "lucide-react";
import { formatDate, cn } from "@/lib/utils";

const STATUS_LABEL: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Aguardando", color: "text-[var(--warning)]", icon: Clock },
  processing: { label: "Gerando", color: "text-[var(--primary)]", icon: Sparkles },
  completed: { label: "Pronto", color: "text-[var(--success)]", icon: CheckCircle2 },
  failed: { label: "Falhou", color: "text-[var(--danger)]", icon: XCircle },
};

export default async function EnsaiosListPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const { data: ensaios } = await supabase
    .from("ensaios")
    .select("id, name, status, total_prompts, total_generated, created_at, ensaio_types(name, slug)")
    .eq("user_id", user!.id)
    .order("created_at", { ascending: false });

  // Busca 1ª foto gerada de cada ensaio como capa (via service role pra signed URL)
  const coverMap = new Map<string, string>();
  if (ensaios && ensaios.length > 0) {
    const admin = await createAdminClient();
    const ensaioIds = ensaios.map((e) => e.id);
    const { data: covers } = await admin
      .from("fotos_geradas")
      .select("ensaio_id, storage_path")
      .in("ensaio_id", ensaioIds)
      .eq("status", "completed")
      .order("created_at", { ascending: true });

    // Primeira foto por ensaio
    const pathsByEnsaio: Record<string, string> = {};
    for (const f of covers ?? []) {
      if (!pathsByEnsaio[f.ensaio_id]) pathsByEnsaio[f.ensaio_id] = f.storage_path;
    }
    const paths = Object.values(pathsByEnsaio);
    if (paths.length > 0) {
      const { data: signed } = await admin.storage
        .from("generated")
        .createSignedUrls(paths, 3600);
      const urlByPath = new Map((signed ?? []).map((s) => [s.path, s.signedUrl]));
      for (const [ensaioId, path] of Object.entries(pathsByEnsaio)) {
        const url = urlByPath.get(path);
        if (url) coverMap.set(ensaioId, url);
      }
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 fade-in">
      <div className="flex items-start justify-between mb-6 flex-wrap gap-3">
        <div>
          <h1 className="text-3xl font-bold">Meus ensaios</h1>
          <p className="text-[var(--muted)] mt-1">
            Histórico completo dos ensaios gerados
          </p>
        </div>
        <Link href="/dashboard" className="btn btn-primary">
          <Plus className="w-4 h-4" /> Novo ensaio
        </Link>
      </div>

      {!ensaios || ensaios.length === 0 ? (
        <div className="card text-center py-16">
          <div className="w-14 h-14 rounded-full bg-[var(--background-elev-2)] flex items-center justify-center mx-auto mb-4">
            <Camera className="w-6 h-6 text-[var(--muted)]" />
          </div>
          <h2 className="text-lg font-semibold mb-1">Nenhum ensaio ainda</h2>
          <p className="text-sm text-[var(--muted)] mb-5">
            Escolha um tipo e envie suas fotos para começar
          </p>
          <Link href="/dashboard" className="btn btn-primary">
            <Sparkles className="w-4 h-4" /> Criar meu primeiro ensaio
          </Link>
        </div>
      ) : (
        <div className="space-y-3">
          {ensaios.map((e) => {
            const st = STATUS_LABEL[e.status] ?? STATUS_LABEL.pending;
            const StIcon = st.icon;
            const cover = coverMap.get(e.id);
            return (
              <Link
                key={e.id}
                href={`/ensaios/${e.id}`}
                className="card hover:border-[var(--primary)]/40 transition flex items-center gap-4 p-3 md:p-4"
              >
                {/* Preview — 1ª foto do ensaio como miniatura, fallback pra ícone */}
                <div className="w-16 h-16 md:w-20 md:h-20 rounded-xl overflow-hidden shrink-0 bg-gradient-to-br from-[var(--primary)]/15 to-[var(--accent)]/15 relative flex items-center justify-center">
                  {cover ? (
                    <Image
                      src={cover}
                      alt={e.name ?? "Ensaio"}
                      fill
                      className="object-cover"
                      sizes="80px"
                      unoptimized
                    />
                  ) : (
                    <Camera className="w-5 h-5 text-[var(--primary)]" />
                  )}
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold truncate">{e.name ?? "Ensaio"}</div>
                  <div className="text-xs text-[var(--muted)] mt-0.5 truncate">
                    {(e.ensaio_types as { name?: string } | null)?.name ?? ""} · {formatDate(e.created_at)}
                  </div>
                  <div className={cn("flex items-center gap-1 text-xs font-medium mt-1 sm:hidden", st.color)}>
                    <StIcon className={cn("w-3 h-3", e.status === "processing" && "animate-pulse")} />
                    {st.label} · {e.total_generated}/{e.total_prompts}
                  </div>
                </div>
                <div className="text-right hidden sm:block">
                  <div className="text-sm font-semibold">
                    {e.total_generated}/{e.total_prompts}
                  </div>
                  <div className="text-xs text-[var(--muted)]">fotos</div>
                </div>
                <div className={cn("hidden sm:flex items-center gap-1 text-xs font-medium", st.color)}>
                  <StIcon className={cn("w-3.5 h-3.5", e.status === "processing" && "animate-pulse")} />
                  {st.label}
                </div>
              </Link>
            );
          })}
        </div>
      )}
    </div>
  );
}
