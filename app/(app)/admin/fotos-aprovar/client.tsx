"use client";

import { useEffect, useState, useMemo } from "react";
import { toast } from "sonner";

interface FotoRow {
  id: string;
  user_id: string;
  ensaio_id: string;
  prompt_id: string | null;
  prompt_categoria: string | null;
  prompt_numero: number | null;
  storage_path: string;
  public_url: string;
  created_at: string;
  prompt_has_example: boolean;
  prompt_current_example: string | null;
}
interface PromptOpt {
  id: string;
  numero: number;
  categoria: string;
  example_image_url: string | null;
}

export function FotosAprovarClient() {
  const [rows, setRows] = useState<FotoRow[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [prompts, setPrompts] = useState<PromptOpt[]>([]);
  const [loading, setLoading] = useState(true);

  const [fCategoria, setFCategoria] = useState("");
  const [fPromptId, setFPromptId] = useState("");
  const [fOnlyMissing, setFOnlyMissing] = useState(false); // default: mostra TODAS
  const [limit, setLimit] = useState(60);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (fCategoria) params.set("categoria", fCategoria);
    if (fPromptId) params.set("prompt_id", fPromptId);
    if (fOnlyMissing) params.set("only_missing", "true");
    params.set("limit", String(limit));
    const res = await fetch(`/api/admin/fotos-aprovar?${params}`, { cache: "no-store" });
    if (!res.ok) {
      toast.error("Falha ao carregar");
      setLoading(false);
      return;
    }
    const json = await res.json();
    setRows(json.rows ?? []);
    setCategorias(json.categorias ?? []);
    setPrompts(json.prompts ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  async function approve(foto: FotoRow, promptId?: string) {
    const body: Record<string, string> = { foto_id: foto.id };
    if (promptId) body.prompt_id = promptId;
    const res = await fetch(`/api/admin/fotos-aprovar/approve`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(body),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Falha ao aprovar");
      return;
    }
    toast.success("Aprovada como exemplo ⭐");
    await load();
  }

  const promptOptions = useMemo(
    () => prompts.filter((p) => (fCategoria ? p.categoria === fCategoria : true)),
    [prompts, fCategoria],
  );

  return (
    <div className="space-y-4">
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">Categoria</label>
          <select
            value={fCategoria}
            onChange={(e) => {
              setFCategoria(e.target.value);
              setFPromptId("");
            }}
            className="input-field"
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">Prompt específico</label>
          <select
            value={fPromptId}
            onChange={(e) => setFPromptId(e.target.value)}
            className="input-field"
          >
            <option value="">Todos</option>
            {promptOptions.map((p) => (
              <option key={p.id} value={p.id}>
                #{p.numero} · {p.categoria} {p.example_image_url ? "⭐" : ""}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">Limite</label>
          <select
            value={limit}
            onChange={(e) => setLimit(Number(e.target.value))}
            className="input-field"
          >
            <option value={60}>60</option>
            <option value={120}>120</option>
            <option value={200}>200</option>
          </select>
        </div>
        <label className="flex items-center gap-2 text-sm cursor-pointer select-none">
          <input
            type="checkbox"
            checked={fOnlyMissing}
            onChange={(e) => setFOnlyMissing(e.target.checked)}
          />
          Só prompts sem preview
        </label>
        <button className="btn btn-primary" onClick={load}>Filtrar</button>
      </div>

      <div className="text-xs text-[var(--muted)]">
        {loading ? "Carregando..." : `${rows.length} fotos`}
      </div>

      {loading ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="aspect-square skeleton" />
              <div className="p-3 space-y-2">
                <div className="h-6 skeleton rounded" />
                <div className="h-8 skeleton rounded" />
              </div>
            </div>
          ))}
        </div>
      ) : rows.length === 0 ? (
        <div className="card py-12 text-center">
          <div className="w-12 h-12 mx-auto rounded-full bg-[var(--background-elev-2)] flex items-center justify-center mb-3">
            <span className="text-2xl">📷</span>
          </div>
          <div className="font-semibold mb-1">Nenhuma foto disponível</div>
          <div className="text-sm text-[var(--muted)]">
            Fotos geradas pelos clientes aparecem aqui pra você aprovar como exemplo.
          </div>
        </div>
      ) : (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {rows.map((f) => (
            <FotoCard key={f.id} foto={f} prompts={prompts} onApprove={approve} />
          ))}
        </div>
      )}
    </div>
  );
}

function FotoCard({
  foto,
  prompts,
  onApprove,
}: {
  foto: FotoRow;
  prompts: PromptOpt[];
  onApprove: (foto: FotoRow, promptId?: string) => Promise<void>;
}) {
  const [targetPromptId, setTargetPromptId] = useState(foto.prompt_id ?? "");
  const [approving, setApproving] = useState(false);

  const samplePrompts = useMemo(
    () =>
      prompts.filter((p) =>
        foto.prompt_categoria ? p.categoria === foto.prompt_categoria : true,
      ),
    [prompts, foto.prompt_categoria],
  );

  async function handle() {
    setApproving(true);
    await onApprove(foto, targetPromptId || undefined);
    setApproving(false);
  }

  return (
    <div className="card overflow-hidden">
      <div className="aspect-square bg-[var(--background-elev)] relative">
        {foto.public_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={foto.public_url} alt="" className="w-full h-full object-cover" />
        ) : (
          <div className="w-full h-full flex items-center justify-center text-xs text-[var(--muted)]">
            sem preview
          </div>
        )}
        <div className="absolute top-2 left-2 bg-black/70 text-white text-xs px-2 py-0.5 rounded">
          {foto.prompt_categoria ?? "free"} · #{foto.prompt_numero ?? "-"}
        </div>
        {foto.prompt_has_example && (
          <div className="absolute top-2 right-2 bg-amber-500/90 text-white text-xs px-2 py-0.5 rounded">
            ⭐ tem ex.
          </div>
        )}
      </div>
      <div className="p-3 space-y-2 text-xs">
        <select
          value={targetPromptId}
          onChange={(e) => setTargetPromptId(e.target.value)}
          className="input-field w-full text-xs"
        >
          <option value="">— prompt da foto —</option>
          {samplePrompts.map((p) => (
            <option key={p.id} value={p.id}>
              #{p.numero} {p.categoria} {p.example_image_url ? "⭐" : ""}
            </option>
          ))}
        </select>
        <button
          className="btn btn-primary btn-sm w-full"
          onClick={handle}
          disabled={approving}
        >
          {approving ? "Aprovando..." : "⭐ Usar como exemplo"}
        </button>
      </div>
    </div>
  );
}
