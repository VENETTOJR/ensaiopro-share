"use client";

import { useEffect, useState, useCallback, useRef } from "react";
import Image from "next/image";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft, Loader2, Download, CheckCircle2, XCircle,
  Clock, Sparkles, Package, RefreshCw, AlertTriangle,
  ChevronLeft, ChevronRight, X as XIcon, Check as CheckIcon,
  SquareCheck,
} from "lucide-react";
import JSZip from "jszip";
import { saveAs } from "file-saver";
import { createClient } from "@/lib/supabase/client";
import { formatDate, cn } from "@/lib/utils";
import { EditPhotoModal } from "@/components/ensaio/EditPhotoModal";

interface EnsaioStatus {
  id: string;
  name: string | null;
  status: "pending" | "processing" | "completed" | "failed";
  total_prompts: number;
  total_generated: number;
  total_failed: number;
  created_at: string;
  ensaio_types: { name?: string; slug?: string } | null;
}

interface Foto {
  id: string;
  storage_path: string;
  status: string;
  prompt_numero: number | null;
  prompt_id?: string | null;
  signedUrl?: string;
}

export function EnsaioDetailClient({
  ensaioId,
  initialEnsaio,
}: {
  ensaioId: string;
  initialEnsaio: EnsaioStatus;
}) {
  const [ensaio, setEnsaio] = useState<EnsaioStatus>(initialEnsaio);
  const [fotos, setFotos] = useState<Foto[]>([]);
  const [downloading, setDownloading] = useState(false);
  const [downloadProgress, setDownloadProgress] = useState(0);
  const [regeneratingId, setRegeneratingId] = useState<string | null>(null);
  const [retrying, setRetrying] = useState(false);
  const [lightboxIdx, setLightboxIdx] = useState<number | null>(null);
  const [selectMode, setSelectMode] = useState(false);
  const [selectedIds, setSelectedIds] = useState<Set<string>>(new Set());
  const [downloadingId, setDownloadingId] = useState<string | null>(null);
  const [editingFoto, setEditingFoto] = useState<Foto | null>(null);

  const toggleSelected = useCallback((id: string) => {
    setSelectedIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const clearSelection = useCallback(() => {
    setSelectedIds(new Set());
  }, []);

  // Slug amigável pra nome de arquivo: remove acentos, espaços e caracteres proibidos
  const slugFilename = useCallback((s: string | null | undefined) => {
    if (!s) return "";
    return s
      .normalize("NFD")
      .replace(/[\u0300-\u036f]/g, "")
      .replace(/[^a-zA-Z0-9\- ]/g, "")
      .trim()
      .replace(/\s+/g, "-");
  }, []);

  const filenameBase = useCallback(() => {
    const cliente = slugFilename(ensaio.name) || "ensaio";
    const tipo = slugFilename(ensaio.ensaio_types?.name);
    return tipo ? `${cliente}_${tipo}` : cliente;
  }, [ensaio.name, ensaio.ensaio_types?.name, slugFilename]);

  // Download 1 foto individualmente — 1 clique
  const downloadOne = useCallback(async (foto: Foto) => {
    if (!foto.signedUrl) return;
    setDownloadingId(foto.id);
    try {
      const res = await fetch(foto.signedUrl);
      const blob = await res.blob();
      const ext = foto.storage_path.split(".").pop() ?? "jpg";
      const num = foto.prompt_numero ?? "foto";
      saveAs(blob, `${filenameBase()}_${num}.${ext}`);
    } catch {
      toast.error("Falha ao baixar foto");
    } finally {
      setDownloadingId(null);
    }
  }, [filenameBase]);

  // Navegação por teclado no lightbox
  useEffect(() => {
    if (lightboxIdx === null) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightboxIdx(null);
      else if (e.key === "ArrowLeft") setLightboxIdx((i) => (i === null ? null : Math.max(0, i - 1)));
      else if (e.key === "ArrowRight") setLightboxIdx((i) => (i === null ? null : Math.min(fotos.length - 1, i + 1)));
      else if (e.key === "d" || e.key === "D") {
        const foto = lightboxIdx !== null ? fotos[lightboxIdx] : null;
        if (foto) downloadOne(foto);
      }
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [lightboxIdx, fotos, downloadOne]);

  async function retryEnsaio() {
    const failedCount = ensaio.total_failed;
    const missingCount = Math.max(0, ensaio.total_prompts - ensaio.total_generated - ensaio.total_failed);
    const toRetry = failedCount + missingCount;
    if (toRetry === 0) return;
    if (!confirm(`Refazer ${toRetry} ${toRetry === 1 ? "foto" : "fotos"} que não deram certo? Vai consumir ${toRetry} ${toRetry === 1 ? "crédito" : "créditos"}.`)) return;
    setRetrying(true);
    try {
      const res = await fetch("/api/retry-ensaio", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ensaioId }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "falha ao refazer");
      toast.success("Refazendo ensaio...");
      setEnsaio((e) => ({ ...e, status: "processing", total_failed: 0 }));
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "erro");
    } finally {
      setRetrying(false);
    }
  }

  const loadFotos = useCallback(async () => {
    const supabase = createClient();
    const { data } = await supabase
      .from("fotos_geradas")
      .select("id, storage_path, status, prompt_numero, prompt_id")
      .eq("ensaio_id", ensaioId)
      .eq("status", "completed")
      .order("prompt_numero", { ascending: true });

    if (!data) return;

    // signed URLs em lote
    const paths = data.map((d) => d.storage_path);
    if (paths.length === 0) {
      setFotos([]);
      return;
    }
    const { data: signed } = await supabase.storage
      .from("generated")
      .createSignedUrls(paths, 3600);

    const urlByPath = new Map(
      (signed ?? []).map((s) => [s.path, s.signedUrl])
    );

    setFotos(
      data.map((d) => ({
        ...d,
        signedUrl: urlByPath.get(d.storage_path) ?? undefined,
      }))
    );
  }, [ensaioId]);

  // Polling enquanto processing
  useEffect(() => {
    if (ensaio.status === "completed" || ensaio.status === "failed") return;

    const supabase = createClient();
    const int = setInterval(async () => {
      const { data } = await supabase
        .from("ensaios")
        .select("id, name, status, total_prompts, total_generated, total_failed, created_at, ensaio_types(name, slug)")
        .eq("id", ensaioId)
        .maybeSingle();
      if (data) {
        // Normaliza ensaio_types: Supabase retorna array na join — esperamos object
        const rawTypes = (data as { ensaio_types?: unknown }).ensaio_types;
        const ensaio_types = Array.isArray(rawTypes)
          ? (rawTypes[0] as { name?: string; slug?: string } | undefined) ?? null
          : (rawTypes as { name?: string; slug?: string } | null) ?? null;
        setEnsaio({ ...(data as EnsaioStatus), ensaio_types });
        loadFotos();
        if (data.status === "completed" || data.status === "failed") {
          clearInterval(int);
        }
      }
    }, 3000);
    return () => clearInterval(int);
  }, [ensaioId, ensaio.status, loadFotos]);

  // Carrega fotos ao montar
  useEffect(() => {
    loadFotos();
  }, [loadFotos]);

  const progress =
    ensaio.total_prompts > 0
      ? Math.round(((ensaio.total_generated + ensaio.total_failed) / ensaio.total_prompts) * 100)
      : 0;

  async function regenerateFoto(foto: Foto) {
    if (!foto.prompt_id) return;
    if (!confirm("Refazer esta foto? Vai consumir 1 crédito.")) return;
    setRegeneratingId(foto.id);
    try {
      const res = await fetch("/api/regenerate-photo", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          ensaioId,
          promptId: foto.prompt_id,
          fotoGeradaId: foto.id,
        }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "falha");
      toast.success("Foto refeita!");
      await loadFotos();
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "erro");
    } finally {
      setRegeneratingId(null);
    }
  }

  async function downloadZip(items: Foto[], filenameSuffix = "") {
    if (items.length === 0) return;
    setDownloading(true);
    setDownloadProgress(0);
    try {
      const zip = new JSZip();
      const base = filenameBase();
      let done = 0;
      await Promise.all(
        items.map(async (f) => {
          if (!f.signedUrl) return;
          const res = await fetch(f.signedUrl);
          const blob = await res.blob();
          const ext = f.storage_path.split(".").pop() ?? "jpg";
          const num = f.prompt_numero ?? done + 1;
          zip.file(`${base}_${num}.${ext}`, blob);
          done++;
          setDownloadProgress(Math.round((done / items.length) * 100));
        })
      );
      const blob = await zip.generateAsync({ type: "blob" });
      const date = new Date().toISOString().slice(0, 10);
      saveAs(blob, `${base}${filenameSuffix}_${date}.zip`);
      toast.success(
        `Download iniciado! (${items.length} ${items.length === 1 ? "foto" : "fotos"})`
      );
    } catch (err) {
      toast.error("Falha ao gerar zip");
      console.error(err);
    } finally {
      setDownloading(false);
      setDownloadProgress(0);
    }
  }

  async function downloadAll() {
    await downloadZip(fotos);
  }

  async function downloadSelected() {
    const picked = fotos.filter((f) => selectedIds.has(f.id));
    await downloadZip(picked, `_selecao${picked.length}`);
    clearSelection();
    setSelectMode(false);
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 fade-in">
      <Link
        href="/ensaios"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-4"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar para meus ensaios
      </Link>

      <div className="flex items-start justify-between gap-4 mb-6 flex-wrap">
        <div>
          <div className="text-sm text-[var(--muted)]">
            {ensaio.ensaio_types?.name} · {formatDate(ensaio.created_at)}
          </div>
          <h1 className="text-2xl md:text-3xl font-bold mt-1">{ensaio.name}</h1>
        </div>
        {ensaio.status === "completed" && fotos.length > 0 && (
          <div className="flex items-center gap-2 flex-wrap">
            {!selectMode && (
              <button
                onClick={() => setSelectMode(true)}
                className="btn btn-secondary btn-sm"
                title="Escolher fotos específicas pra baixar"
              >
                <SquareCheck className="w-4 h-4" />
                Selecionar
              </button>
            )}
            <button
              onClick={downloadAll}
              disabled={downloading}
              className="btn btn-primary"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {downloadProgress > 0 && `${downloadProgress}%`}
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Baixar todas (.zip)
                </>
              )}
            </button>
          </div>
        )}
      </div>

      {/* Status card */}
      <StatusBanner
        status={ensaio.status}
        generated={ensaio.total_generated}
        failed={ensaio.total_failed}
        total={ensaio.total_prompts}
        progress={progress}
      />

      {/* Retry banner — aparece quando falhou total OU parcial */}
      {(ensaio.status === "failed" ||
        (ensaio.status === "completed" && ensaio.total_failed > 0)) && (
        <div className="card mt-4 bg-gradient-to-br from-[var(--danger)]/10 to-[var(--warning)]/10 border-[var(--danger)]/30 flex flex-col sm:flex-row items-start sm:items-center gap-3">
          <div className="w-10 h-10 rounded-lg bg-[var(--danger)]/15 flex items-center justify-center shrink-0">
            <AlertTriangle className="w-5 h-5 text-[var(--danger)]" />
          </div>
          <div className="flex-1">
            <div className="font-semibold">
              {ensaio.status === "failed"
                ? "Ensaio falhou"
                : `${ensaio.total_failed} ${ensaio.total_failed === 1 ? "foto falhou" : "fotos falharam"}`}
            </div>
            <div className="text-sm text-[var(--muted)] mt-0.5">
              Pode tentar de novo. Só vai gastar crédito pelas que faltam.
            </div>
          </div>
          <button
            onClick={retryEnsaio}
            disabled={retrying}
            className="btn btn-primary w-full sm:w-auto"
          >
            {retrying ? (
              <Loader2 className="w-4 h-4 animate-spin" />
            ) : (
              <>
                <RefreshCw className="w-4 h-4" />
                Tentar novamente
              </>
            )}
          </button>
        </div>
      )}

      {/* Galeria */}
      {fotos.length > 0 && (
        <div className="mt-8 pb-24">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-2">
            <h2 className="text-lg font-bold">
              {fotos.length} {fotos.length === 1 ? "foto gerada" : "fotos geradas"}
            </h2>
            <div className="text-xs text-[var(--muted)] hidden md:block">
              💡 Dica: passe o mouse e clique no ⬇ pra baixar sem abrir. No lightbox, atalho <kbd className="px-1.5 py-0.5 rounded bg-[var(--background-elev)] border border-[var(--border)] text-[10px]">D</kbd> baixa, <kbd className="px-1.5 py-0.5 rounded bg-[var(--background-elev)] border border-[var(--border)] text-[10px]">←→</kbd> navega
            </div>
          </div>
          <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3">
            {fotos.map((f, idx) => {
              const busy = regeneratingId === f.id;
              const dlBusy = downloadingId === f.id;
              const selected = selectedIds.has(f.id);
              return (
                <div
                  key={f.id}
                  className={cn(
                    "group relative aspect-square rounded-xl overflow-hidden bg-[var(--background-elev-2)] cursor-pointer transition-all",
                    selected && "ring-4 ring-[var(--primary)] ring-offset-2 ring-offset-[var(--background)]"
                  )}
                  onClick={() => {
                    if (selectMode) toggleSelected(f.id);
                    else setLightboxIdx(idx);
                  }}
                >
                  {f.signedUrl && (
                    <Image
                      src={f.signedUrl}
                      alt={`Foto ${f.prompt_numero}`}
                      fill
                      loading={idx < 8 ? "eager" : "lazy"}
                      className="object-cover transition group-hover:scale-105"
                      sizes="(max-width: 768px) 50vw, 25vw"
                      unoptimized
                    />
                  )}
                  {busy && (
                    <div className="absolute inset-0 bg-black/60 backdrop-blur-sm flex items-center justify-center">
                      <Loader2 className="w-6 h-6 animate-spin text-white" />
                    </div>
                  )}

                  {/* Checkbox no modo seleção */}
                  {selectMode && (
                    <div
                      className={cn(
                        "absolute top-2 left-2 w-7 h-7 rounded-full border-2 flex items-center justify-center transition-all",
                        selected
                          ? "bg-[var(--primary)] border-[var(--primary)]"
                          : "bg-black/40 border-white/60 backdrop-blur"
                      )}
                    >
                      {selected && <CheckIcon className="w-4 h-4 text-white" strokeWidth={3} />}
                    </div>
                  )}

                  {/* Número + botão download direto (aparece no hover) */}
                  <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-black/80 via-black/30 to-transparent p-2 flex items-end justify-between gap-1 opacity-0 group-hover:opacity-100 transition md:opacity-100 md:bg-transparent">
                    <span className="text-[11px] font-medium text-white drop-shadow bg-black/40 backdrop-blur px-1.5 py-0.5 rounded">
                      #{f.prompt_numero}
                    </span>
                    {!selectMode && (
                      <button
                        onClick={(e) => {
                          e.stopPropagation();
                          downloadOne(f);
                        }}
                        disabled={dlBusy}
                        className="w-8 h-8 rounded-full bg-black/60 backdrop-blur hover:bg-[var(--primary)] text-white flex items-center justify-center transition shadow-lg"
                        title="Baixar esta foto"
                      >
                        {dlBusy ? (
                          <Loader2 className="w-4 h-4 animate-spin" />
                        ) : (
                          <Download className="w-4 h-4" />
                        )}
                      </button>
                    )}
                  </div>
                </div>
              );
            })}
            {/* Placeholders enquanto processa */}
            {ensaio.status === "processing" &&
              Array.from({
                length: Math.max(0, ensaio.total_prompts - fotos.length - ensaio.total_failed),
              }).map((_, i) => (
                <div
                  key={`placeholder-${i}`}
                  className="aspect-square rounded-xl skeleton flex items-center justify-center"
                >
                  <Loader2 className="w-5 h-5 animate-spin text-[var(--muted)]" />
                </div>
              ))}
          </div>
        </div>
      )}

      {fotos.length === 0 && ensaio.status !== "processing" && ensaio.status !== "pending" && (
        <div className="card text-center mt-6 py-12 text-[var(--muted)]">
          Nenhuma foto foi gerada com sucesso.
        </div>
      )}

      {/* Barra inferior flutuante quando modo seleção tá ativo */}
      {selectMode && (
        <div className="fixed bottom-0 left-0 md:left-64 right-0 z-30 glass border-t border-[var(--border)] pb-safe">
          <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 flex items-center gap-3">
            <button
              onClick={() => {
                setSelectMode(false);
                clearSelection();
              }}
              className="btn btn-ghost btn-sm"
            >
              <XIcon className="w-4 h-4" />
              <span className="hidden sm:inline">Cancelar</span>
            </button>
            <button
              onClick={() => setSelectedIds(new Set(fotos.map((f) => f.id)))}
              className="btn btn-secondary btn-sm"
            >
              Todas ({fotos.length})
            </button>
            <div className="flex-1 text-sm text-center">
              <span className="font-semibold text-gradient">{selectedIds.size}</span>
              <span className="text-[var(--muted)]"> selecionadas</span>
            </div>
            <button
              onClick={downloadSelected}
              disabled={selectedIds.size === 0 || downloading}
              className="btn btn-primary"
            >
              {downloading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  {downloadProgress > 0 && `${downloadProgress}%`}
                </>
              ) : (
                <>
                  <Package className="w-4 h-4" />
                  Baixar ({selectedIds.size})
                </>
              )}
            </button>
          </div>
        </div>
      )}

      {/* Lightbox — visualização fullscreen com setas */}
      {lightboxIdx !== null && fotos[lightboxIdx] && (
        <Lightbox
          foto={fotos[lightboxIdx]}
          currentIdx={lightboxIdx}
          total={fotos.length}
          onClose={() => setLightboxIdx(null)}
          onPrev={() => setLightboxIdx((i) => (i === null ? null : Math.max(0, i - 1)))}
          onNext={() => setLightboxIdx((i) => (i === null ? null : Math.min(fotos.length - 1, i + 1)))}
          onRegenerate={() => {
            const f = fotos[lightboxIdx];
            setLightboxIdx(null);
            regenerateFoto(f);
          }}
          onEdit={() => {
            setEditingFoto(fotos[lightboxIdx]);
            setLightboxIdx(null);
          }}
          onDownload={() => downloadOne(fotos[lightboxIdx])}
          downloading={downloadingId === fotos[lightboxIdx]?.id}
          regenerating={regeneratingId === fotos[lightboxIdx]?.id}
        />
      )}

      {/* Modal: editar foto com prompt curto */}
      {editingFoto && (
        <EditPhotoModal
          foto={{ id: editingFoto.id, url: editingFoto.signedUrl ?? null }}
          onClose={() => setEditingFoto(null)}
          onSuccess={async () => {
            setEditingFoto(null);
            await loadFotos();
          }}
        />
      )}
    </div>
  );
}

function Lightbox({
  foto,
  currentIdx,
  total,
  onClose,
  onPrev,
  onNext,
  onRegenerate,
  onEdit,
  onDownload,
  downloading,
  regenerating,
}: {
  foto: Foto;
  currentIdx: number;
  total: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
  onRegenerate: () => void;
  onEdit: () => void;
  onDownload: () => void;
  downloading: boolean;
  regenerating: boolean;
}) {
  const touchStartX = useRef<number | null>(null);

  function onTouchStart(e: React.TouchEvent) {
    touchStartX.current = e.touches[0].clientX;
  }
  function onTouchEnd(e: React.TouchEvent) {
    if (touchStartX.current === null) return;
    const diff = e.changedTouches[0].clientX - touchStartX.current;
    if (Math.abs(diff) > 50) {
      if (diff > 0) onPrev();
      else onNext();
    }
    touchStartX.current = null;
  }

  return (
    <div
      className="fixed inset-0 z-50 bg-black/95 backdrop-blur flex items-center justify-center"
      onClick={onClose}
      onTouchStart={onTouchStart}
      onTouchEnd={onTouchEnd}
    >
      {/* Contador topo */}
      <div className="absolute top-4 left-4 z-10 px-3 py-1.5 rounded-full bg-black/60 backdrop-blur text-white text-sm font-medium">
        {currentIdx + 1} / {total} · #{foto.prompt_numero}
      </div>

      {/* Fechar */}
      <button
        onClick={(e) => { e.stopPropagation(); onClose(); }}
        className="absolute top-4 right-4 z-10 w-10 h-10 rounded-full bg-black/60 backdrop-blur hover:bg-black/80 flex items-center justify-center transition"
        aria-label="Fechar"
      >
        <XIcon className="w-5 h-5 text-white" />
      </button>

      {/* Setas */}
      {currentIdx > 0 && (
        <button
          onClick={(e) => { e.stopPropagation(); onPrev(); }}
          className="absolute left-2 md:left-4 z-10 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/60 backdrop-blur hover:bg-black/80 flex items-center justify-center transition"
          aria-label="Anterior"
        >
          <ChevronLeft className="w-6 h-6 md:w-7 md:h-7 text-white" />
        </button>
      )}
      {currentIdx < total - 1 && (
        <button
          onClick={(e) => { e.stopPropagation(); onNext(); }}
          className="absolute right-2 md:right-4 z-10 w-12 h-12 md:w-14 md:h-14 rounded-full bg-black/60 backdrop-blur hover:bg-black/80 flex items-center justify-center transition"
          aria-label="Próxima"
        >
          <ChevronRight className="w-6 h-6 md:w-7 md:h-7 text-white" />
        </button>
      )}

      {/* Imagem */}
      <div
        className="relative max-w-[95vw] max-h-[85vh] w-auto h-auto"
        onClick={(e) => e.stopPropagation()}
      >
        {foto.signedUrl && (
          <img
            src={foto.signedUrl}
            alt={`Foto ${foto.prompt_numero}`}
            className="max-w-[95vw] max-h-[85vh] object-contain rounded-lg"
          />
        )}
      </div>

      {/* Ações na base */}
      <div
        className="absolute bottom-4 left-1/2 -translate-x-1/2 flex items-center gap-2 z-10"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onDownload}
          disabled={downloading || !foto.signedUrl}
          className="btn btn-secondary btn-sm"
        >
          {downloading ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <Download className="w-3.5 h-3.5" />
              Baixar
            </>
          )}
        </button>
        <button
          onClick={onEdit}
          className="btn btn-ghost btn-sm"
          title="Editar com prompt (ex: adicionar frase, trocar cor)"
        >
          <Sparkles className="w-3.5 h-3.5" /> Editar
        </button>
        <button
          onClick={onRegenerate}
          disabled={regenerating || !foto.prompt_id}
          className="btn btn-primary btn-sm"
        >
          {regenerating ? (
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
          ) : (
            <>
              <RefreshCw className="w-3.5 h-3.5" /> Refazer
            </>
          )}
        </button>
      </div>
    </div>
  );
}

function StatusBanner({
  status,
  generated,
  failed,
  total,
  progress,
}: {
  status: string;
  generated: number;
  failed: number;
  total: number;
  progress: number;
}) {
  const items = [
    { k: "pending", icon: Clock, color: "text-[var(--warning)]", label: "Aguardando..." },
    { k: "processing", icon: Sparkles, color: "text-[var(--primary)]", label: "Gerando suas fotos..." },
    { k: "completed", icon: CheckCircle2, color: "text-[var(--success)]", label: "Ensaio pronto!" },
    { k: "failed", icon: XCircle, color: "text-[var(--danger)]", label: "Falha na geração" },
  ];
  const cur = items.find((i) => i.k === status) ?? items[0];
  const Icon = cur.icon;

  return (
    <div className="card">
      <div className="flex items-center gap-3 mb-3">
        <div className={cn("w-10 h-10 rounded-lg bg-[var(--background-elev-2)] flex items-center justify-center", cur.color)}>
          <Icon className={cn("w-5 h-5", status === "processing" && "animate-pulse")} />
        </div>
        <div className="flex-1">
          <div className="font-semibold">{cur.label}</div>
          <div className="text-sm text-[var(--muted)]">
            {generated} de {total} geradas
            {failed > 0 && <span className="text-[var(--danger)]"> · {failed} falhou</span>}
          </div>
        </div>
        <div className="text-2xl font-bold text-gradient">{progress}%</div>
      </div>
      <div className="h-2 rounded-full bg-[var(--background-elev-2)] overflow-hidden">
        <div
          className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-all"
          style={{ width: `${progress}%` }}
        />
      </div>
    </div>
  );
}
