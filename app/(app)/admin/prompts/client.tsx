"use client";

import { useEffect, useMemo, useState, useRef, type DragEvent } from "react";
import { toast } from "sonner";
import { PROMPT_TEMPLATES } from "@/lib/prompt-templates";
import { FileText } from "lucide-react";

interface Prompt {
  id: string;
  ensaio_type_id: string;
  numero: number;
  categoria: string;
  texto: string;
  example_image_url: string | null;
  active: boolean;
  sort_order: number;
  created_at: string;
  updated_at: string;
}
interface Tipo {
  id: string;
  slug: string;
  name: string;
}

export function PromptsAdminClient() {
  const [rows, setRows] = useState<Prompt[]>([]);
  const [categorias, setCategorias] = useState<string[]>([]);
  const [tipos, setTipos] = useState<Tipo[]>([]);
  const [loading, setLoading] = useState(true);

  const [fCategoria, setFCategoria] = useState("");
  const [fActive, setFActive] = useState<"" | "true" | "false">("true");
  const [fSearch, setFSearch] = useState("");

  const [editing, setEditing] = useState<Prompt | null>(null);
  const [creating, setCreating] = useState(false);

  async function load() {
    setLoading(true);
    const params = new URLSearchParams();
    if (fCategoria) params.set("categoria", fCategoria);
    if (fActive) params.set("active", fActive);
    if (fSearch) params.set("search", fSearch);
    const res = await fetch(`/api/admin/prompts?${params}`, { cache: "no-store" });
    if (!res.ok) {
      toast.error("Falha ao carregar prompts");
      setLoading(false);
      return;
    }
    const json = await res.json();
    setRows(json.rows ?? []);
    setCategorias(json.categorias ?? []);
    setTipos(json.tipos ?? []);
    setLoading(false);
  }

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const filteredRows = useMemo(() => rows, [rows]);

  async function toggleActive(p: Prompt) {
    const res = await fetch(`/api/admin/prompts/${p.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ active: !p.active }),
    });
    if (!res.ok) {
      toast.error("Falha ao atualizar");
      return;
    }
    toast.success(p.active ? "Desativado" : "Ativado");
    await load();
  }

  async function saveEdit(patch: Partial<Prompt>) {
    if (!editing) return;
    const res = await fetch(`/api/admin/prompts/${editing.id}`, {
      method: "PATCH",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(patch),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Falha ao salvar");
      return;
    }
    toast.success("Salvo");
    setEditing(null);
    await load();
  }

  async function createNew(payload: {
    texto: string;
    categoria: string;
    ensaio_type_id: string;
    example_image_url?: string | null;
  }) {
    const res = await fetch(`/api/admin/prompts`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Falha ao criar");
      return;
    }
    toast.success("Prompt criado");
    setCreating(false);
    await load();
  }

  // Agrupa por categoria pra nav rápida
  const byCategoria = useMemo(() => {
    const map = new Map<string, Prompt[]>();
    for (const p of filteredRows) {
      const k = p.categoria;
      if (!map.has(k)) map.set(k, []);
      map.get(k)!.push(p);
    }
    return map;
  }, [filteredRows]);

  return (
    <div className="space-y-4">
      {/* Filtros */}
      <div className="card p-4 flex flex-wrap gap-3 items-end">
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">Categoria</label>
          <select
            value={fCategoria}
            onChange={(e) => setFCategoria(e.target.value)}
            className="input-field"
          >
            <option value="">Todas</option>
            {categorias.map((c) => (
              <option key={c} value={c}>{c}</option>
            ))}
          </select>
        </div>
        <div>
          <label className="text-xs text-[var(--muted)] block mb-1">Status</label>
          <select
            value={fActive}
            onChange={(e) => setFActive(e.target.value as "" | "true" | "false")}
            className="input-field"
          >
            <option value="">Todos</option>
            <option value="true">Ativos</option>
            <option value="false">Inativos</option>
          </select>
        </div>
        <div className="flex-1 min-w-[200px]">
          <label className="text-xs text-[var(--muted)] block mb-1">Buscar no texto</label>
          <input
            type="text"
            value={fSearch}
            onChange={(e) => setFSearch(e.target.value)}
            onKeyDown={(e) => e.key === "Enter" && load()}
            placeholder="ex: vestido azul, balão..."
            className="input-field w-full"
          />
        </div>
        <button className="btn btn-primary" onClick={load}>Filtrar</button>
        <button className="btn btn-ghost" onClick={() => setCreating(true)}>+ Novo</button>
      </div>

      {/* Stats */}
      <div className="text-xs text-[var(--muted)]">
        {loading ? "Carregando..." : `${filteredRows.length} prompts`}
        {byCategoria.size > 1 && ` em ${byCategoria.size} categorias`}
      </div>

      {/* Grid de cards — mais visual */}
      {loading ? (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {Array.from({ length: 10 }).map((_, i) => (
            <div key={i} className="card overflow-hidden">
              <div className="aspect-square skeleton" />
              <div className="p-3 space-y-2">
                <div className="h-3 skeleton rounded w-1/2" />
                <div className="h-2 skeleton rounded w-full" />
                <div className="h-2 skeleton rounded w-3/4" />
              </div>
            </div>
          ))}
        </div>
      ) : filteredRows.length === 0 ? (
        <div className="text-center py-12 text-[var(--muted)]">Nenhum prompt encontrado.</div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-4">
          {filteredRows.map((p) => (
            <div
              key={p.id}
              className={`card overflow-hidden cursor-pointer hover:ring-2 hover:ring-[var(--primary)] transition ${
                !p.active ? "opacity-50" : ""
              }`}
              onClick={() => setEditing(p)}
            >
              <div className="aspect-square bg-[var(--background-elev)] relative">
                {p.example_image_url ? (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img src={p.example_image_url} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-xs text-[var(--muted)]">
                    sem imagem
                  </div>
                )}
                <div className="absolute top-2 left-2 bg-black/60 text-white text-xs px-2 py-0.5 rounded">
                  #{p.numero}
                </div>
                {!p.active && (
                  <div className="absolute top-2 right-2 bg-red-500/90 text-white text-xs px-2 py-0.5 rounded">
                    inativo
                  </div>
                )}
              </div>
              <div className="p-3 text-xs">
                <div className="font-semibold capitalize">{p.categoria}</div>
                <div className="text-[var(--muted)] mt-1 line-clamp-2">
                  {p.texto.slice(0, 100)}
                </div>
                <div className="flex gap-1 mt-2">
                  <button
                    className="btn btn-sm btn-ghost flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      setEditing(p);
                    }}
                  >
                    Editar
                  </button>
                  <button
                    className="btn btn-sm btn-ghost flex-1"
                    onClick={(e) => {
                      e.stopPropagation();
                      toggleActive(p);
                    }}
                  >
                    {p.active ? "Desativar" : "Ativar"}
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {editing && (
        <EditModal
          prompt={editing}
          categorias={categorias}
          tipos={tipos}
          onClose={() => setEditing(null)}
          onSave={saveEdit}
          onReload={load}
        />
      )}
      {creating && (
        <CreateModal
          categorias={categorias}
          tipos={tipos}
          onClose={() => setCreating(false)}
          onCreate={createNew}
        />
      )}
    </div>
  );
}

function ImageUploader({
  promptId,
  currentUrl,
  onUpdated,
}: {
  promptId: string;
  currentUrl: string | null;
  onUpdated: (newUrl: string) => void;
}) {
  const [dragging, setDragging] = useState(false);
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  async function handleFile(f: File) {
    if (!f.type.startsWith("image/")) {
      toast.error("Só imagens");
      return;
    }
    if (f.size > 15 * 1024 * 1024) {
      toast.error("Máximo 15MB");
      return;
    }
    setUploading(true);
    const form = new FormData();
    form.append("file", f);
    form.append("prompt_id", promptId);
    const res = await fetch("/api/admin/prompts/upload-example", { method: "POST", body: form });
    setUploading(false);
    if (!res.ok) {
      const err = await res.json().catch(() => ({}));
      toast.error(err.error ?? "Upload falhou");
      return;
    }
    const json = await res.json();
    toast.success("Imagem carregada!");
    onUpdated(json.public_url);
  }

  function onDrop(e: DragEvent<HTMLDivElement>) {
    e.preventDefault();
    setDragging(false);
    const f = e.dataTransfer.files?.[0];
    if (f) handleFile(f);
  }

  return (
    <div
      onDragOver={(e) => {
        e.preventDefault();
        setDragging(true);
      }}
      onDragLeave={() => setDragging(false)}
      onDrop={onDrop}
      onClick={() => fileRef.current?.click()}
      className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition ${
        dragging ? "border-[var(--primary)] bg-[var(--primary)]/10" : "border-[var(--border)]"
      }`}
    >
      <input
        ref={fileRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) handleFile(f);
        }}
      />
      {currentUrl ? (
        <div className="space-y-2">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={currentUrl} alt="" className="mx-auto max-h-40 rounded" />
          <div className="text-xs text-[var(--muted)]">
            Arraste nova imagem ou clique pra trocar
          </div>
        </div>
      ) : (
        <div className="py-6 text-sm text-[var(--muted)]">
          {uploading ? "Enviando..." : "📷 Arraste uma imagem aqui ou clique pra escolher"}
        </div>
      )}
    </div>
  );
}

function EditModal({
  prompt,
  categorias,
  tipos,
  onClose,
  onSave,
  onReload,
}: {
  prompt: Prompt;
  categorias: string[];
  tipos: Tipo[];
  onClose: () => void;
  onSave: (patch: Partial<Prompt>) => Promise<void>;
  onReload: () => Promise<void>;
}) {
  const [texto, setTexto] = useState(prompt.texto);
  const [categoria, setCategoria] = useState(prompt.categoria);
  const [ensaioTypeId, setEnsaioTypeId] = useState(prompt.ensaio_type_id);
  const [exampleUrl, setExampleUrl] = useState(prompt.example_image_url ?? "");
  const [saving, setSaving] = useState(false);

  async function handle() {
    setSaving(true);
    await onSave({
      texto,
      categoria,
      ensaio_type_id: ensaioTypeId,
      example_image_url: exampleUrl.trim() || null,
    });
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">
              Editar prompt #{prompt.numero} · {prompt.categoria}
            </h2>
            <button onClick={onClose} className="btn btn-ghost btn-sm">✕</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">Categoria</label>
              <select
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                className="input-field w-full"
              >
                {categorias.map((c) => (
                  <option key={c} value={c}>{c}</option>
                ))}
              </select>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">Tipo de ensaio</label>
              <select
                value={ensaioTypeId}
                onChange={(e) => setEnsaioTypeId(e.target.value)}
                className="input-field w-full"
              >
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">Imagem de exemplo</label>
            <ImageUploader
              promptId={prompt.id}
              currentUrl={exampleUrl || null}
              onUpdated={(url) => {
                setExampleUrl(url);
                onReload();
              }}
            />
            <div className="text-xs text-[var(--muted)] mt-2">
              Ou cole uma URL:
            </div>
            <input
              type="text"
              value={exampleUrl}
              onChange={(e) => setExampleUrl(e.target.value)}
              placeholder="https://..."
              className="input-field w-full mt-1"
            />
          </div>

          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">
              Texto ({texto.length} chars)
            </label>
            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={20}
              className="input-field w-full font-mono text-xs"
            />
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
            <button className="btn btn-primary" onClick={handle} disabled={saving}>
              {saving ? "Salvando…" : "Salvar"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

function CreateModal({
  categorias,
  tipos,
  onClose,
  onCreate,
}: {
  categorias: string[];
  tipos: Tipo[];
  onClose: () => void;
  onCreate: (payload: {
    texto: string;
    categoria: string;
    ensaio_type_id: string;
    example_image_url?: string | null;
  }) => Promise<void>;
}) {
  const [texto, setTexto] = useState("");
  const [categoria, setCategoria] = useState(categorias[0] ?? "aniversario");
  const [ensaioTypeId, setEnsaioTypeId] = useState(tipos[0]?.id ?? "");
  const [exampleUrl, setExampleUrl] = useState("");
  const [saving, setSaving] = useState(false);

  async function handle() {
    if (!texto.trim() || texto.trim().length < 30) {
      toast.error("Texto muito curto (mínimo 30 chars)");
      return;
    }
    if (!ensaioTypeId) {
      toast.error("Selecione o tipo de ensaio");
      return;
    }
    setSaving(true);
    await onCreate({
      texto,
      categoria,
      ensaio_type_id: ensaioTypeId,
      example_image_url: exampleUrl.trim() || null,
    });
    setSaving(false);
  }

  return (
    <div
      className="fixed inset-0 bg-black/60 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="card max-w-4xl w-full max-h-[90vh] overflow-y-auto"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="p-6 space-y-4">
          <div className="flex items-center justify-between">
            <h2 className="text-xl font-bold">Novo prompt</h2>
            <button onClick={onClose} className="btn btn-ghost btn-sm">✕</button>
          </div>

          <div className="grid grid-cols-2 gap-4">
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">Categoria</label>
              <input
                type="text"
                value={categoria}
                onChange={(e) => setCategoria(e.target.value)}
                placeholder="ex: aniversario"
                className="input-field w-full"
                list="categorias-existentes"
              />
              <datalist id="categorias-existentes">
                {categorias.map((c) => (
                  <option key={c} value={c} />
                ))}
              </datalist>
            </div>
            <div>
              <label className="text-xs text-[var(--muted)] block mb-1">Tipo de ensaio</label>
              <select
                value={ensaioTypeId}
                onChange={(e) => setEnsaioTypeId(e.target.value)}
                className="input-field w-full"
              >
                {tipos.map((t) => (
                  <option key={t.id} value={t.id}>{t.name} ({t.slug})</option>
                ))}
              </select>
            </div>
          </div>

          <div>
            <label className="text-xs text-[var(--muted)] block mb-1">
              URL da imagem de exemplo (opcional — dá pra adicionar depois)
            </label>
            <input
              type="text"
              value={exampleUrl}
              onChange={(e) => setExampleUrl(e.target.value)}
              placeholder="https://..."
              className="input-field w-full"
            />
          </div>

          <div>
            <div className="flex items-center justify-between mb-2">
              <label className="text-xs text-[var(--muted)]">
                Texto do prompt ({texto.length} chars · {"{idade}"} vira a idade do ensaio)
              </label>
            </div>

            {/* Moldes prontos — user escolhe e o textarea vem preenchido */}
            {!texto && (
              <div className="mb-3 p-3 rounded-xl border border-[var(--primary)]/30 bg-[var(--primary)]/5">
                <div className="flex items-center gap-1.5 text-xs font-semibold text-[var(--primary)] mb-2">
                  <FileText className="w-3.5 h-3.5" />
                  Comece com um molde pronto
                </div>
                <div className="text-xs text-[var(--muted)] mb-3">
                  Clique no tipo do ensaio. O texto vem no formato certo — você só substitui os{" "}
                  <code className="text-[var(--primary)]">[COLCHETES]</code> com a descrição
                  da cena, roupa, decoração.
                </div>
                <div className="grid grid-cols-1 md:grid-cols-3 gap-2">
                  {PROMPT_TEMPLATES.map((t) => (
                    <button
                      key={t.id}
                      type="button"
                      onClick={() => setTexto(t.texto)}
                      className="text-left p-2.5 rounded-lg border border-[var(--border)] bg-[var(--background-elev-2)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/10 transition"
                    >
                      <div className="text-sm font-semibold">{t.label}</div>
                      <div className="text-[11px] text-[var(--muted)] mt-0.5">{t.description}</div>
                    </button>
                  ))}
                </div>
              </div>
            )}

            <textarea
              value={texto}
              onChange={(e) => setTexto(e.target.value)}
              rows={20}
              placeholder="Ultra-realistic photo in 8K resolution of..."
              className="input-field w-full font-mono text-xs"
            />

            <div className="mt-2 p-2 rounded-lg bg-[var(--background-elev-2)] text-[11px] text-[var(--muted)]">
              <strong className="text-[var(--foreground)]">Ordem dos blocos:</strong>{" "}
              abertura 8K → sujeito/pose → preservação facial (fixo) → roupa (tecido+cor+corte) →
              cenário/objetos → iluminação (key/fill/rim) → câmera (lente/DOF) → realismo
            </div>
          </div>

          <div className="flex gap-2 justify-end pt-2">
            <button className="btn btn-ghost" onClick={onClose} disabled={saving}>Cancelar</button>
            <button className="btn btn-primary" onClick={handle} disabled={saving}>
              {saving ? "Criando…" : "Criar prompt"}
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}
