"use client";

/**
 * Modal de edição de foto já gerada — user digita o que quer mudar
 * e opcionalmente anexa imagem extra (ex: arte da frase, logo) pra compor.
 * Custa 1 crédito.
 */

import { useState, useRef } from "react";
import { toast } from "sonner";
import {
  X,
  Sparkles,
  Loader2,
  Paperclip,
  Image as ImageIcon,
  Wand2,
  Info,
} from "lucide-react";

const EXAMPLES = [
  "adicione a frase 'Feliz Aniversário' em letras douradas no canto superior",
  "troque a cor do vestido por azul escuro",
  "coloque a logo anexada no canto inferior direito",
  "remova os balões do fundo",
  "adicione efeito de brilho/glitter suave",
];

export function EditPhotoModal({
  foto,
  onClose,
  onSuccess,
}: {
  foto: { id: string; url?: string | null };
  onClose: () => void;
  onSuccess: () => void | Promise<void>;
}) {
  const [editPrompt, setEditPrompt] = useState("");
  const [extras, setExtras] = useState<File[]>([]);
  const [submitting, setSubmitting] = useState(false);
  const fileRef = useRef<HTMLInputElement>(null);

  function addFiles(files: FileList | null) {
    if (!files) return;
    const arr = Array.from(files).filter((f) => f.type.startsWith("image/"));
    setExtras((prev) => [...prev, ...arr].slice(0, 3));
  }

  async function submit() {
    if (editPrompt.trim().length < 5) {
      toast.error("Descreva o que quer mudar com mais detalhe (mínimo 5 letras).");
      return;
    }
    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("foto_id", foto.id);
      fd.append("edit_prompt", editPrompt.trim());
      for (const f of extras) fd.append("extra_refs", f);
      const res = await fetch("/api/edit-photo", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(data.error ?? "Falha ao editar. Tente ser mais específico.");
        return;
      }
      toast.success("Foto editada! Aparece no ensaio em instantes.");
      await onSuccess();
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div
      className="fixed inset-0 z-[60] flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm overflow-y-auto"
      onClick={onClose}
    >
      <div
        className="card max-w-2xl w-full my-8"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center">
              <Wand2 className="w-5 h-5 text-[var(--primary)]" />
            </div>
            <div>
              <div className="font-semibold">Editar foto</div>
              <div className="text-xs text-[var(--muted)]">
                Descreva o que quer mudar — custa 1 crédito
              </div>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-1.5 rounded-lg hover:bg-[var(--background-elev-2)]"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        {/* Preview da foto original */}
        {foto.url && (
          <div className="mb-4 rounded-xl overflow-hidden max-h-[200px] flex items-center justify-center bg-[var(--background-elev-2)]">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.url}
              alt="Foto original"
              className="max-w-full max-h-[200px] object-contain"
            />
          </div>
        )}

        {/* Campo principal de edit */}
        <label className="block text-xs text-[var(--muted)] mb-1">
          O que você quer mudar?
        </label>
        <textarea
          value={editPrompt}
          onChange={(e) => setEditPrompt(e.target.value.slice(0, 500))}
          rows={3}
          placeholder="Ex: Adicione a frase 'Feliz Aniversário' em dourado no topo"
          className="input-field w-full text-sm mb-1"
        />
        <div className="text-[11px] text-[var(--muted)] text-right mb-3">
          {editPrompt.length}/500
        </div>

        {/* Exemplos clicáveis */}
        <div className="mb-4">
          <div className="text-[11px] text-[var(--muted)] mb-1.5 flex items-center gap-1">
            <Sparkles className="w-3 h-3" /> Exemplos — clica pra usar:
          </div>
          <div className="flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex}
                type="button"
                onClick={() => setEditPrompt(ex)}
                className="text-[11px] px-2 py-1 rounded-full border border-[var(--border)] bg-[var(--background-elev-2)] hover:border-[var(--primary)] hover:text-[var(--foreground)] text-[var(--muted)] transition"
              >
                {ex.length > 50 ? ex.slice(0, 50) + "..." : ex}
              </button>
            ))}
          </div>
        </div>

        {/* Upload de refs extras */}
        <div className="mb-4 p-3 rounded-xl border border-[var(--border)] bg-[var(--background-elev-2)]">
          <div className="flex items-start gap-2 text-xs text-[var(--muted)] mb-2">
            <Info className="w-3.5 h-3.5 text-[var(--primary)] shrink-0 mt-0.5" />
            <div>
              <strong className="text-[var(--foreground)]">Tem imagem pra incluir?</strong>{" "}
              (logo, arte da frase, adesivo) — anexa até 3. A IA compõe na foto.
            </div>
          </div>

          <input
            ref={fileRef}
            type="file"
            accept="image/*"
            multiple
            onChange={(e) => addFiles(e.target.files)}
            className="hidden"
          />
          <button
            type="button"
            onClick={() => fileRef.current?.click()}
            disabled={extras.length >= 3}
            className="btn btn-ghost btn-sm"
          >
            <Paperclip className="w-3.5 h-3.5" /> Anexar imagem
          </button>

          {extras.length > 0 && (
            <div className="mt-3 flex flex-wrap gap-2">
              {extras.map((f, i) => (
                <div
                  key={i}
                  className="group relative flex items-center gap-2 px-2 py-1 rounded-lg bg-[var(--background)] text-xs border border-[var(--border)]"
                >
                  <ImageIcon className="w-3 h-3 text-[var(--primary)]" />
                  <span className="max-w-[140px] truncate">{f.name}</span>
                  <button
                    type="button"
                    onClick={() => setExtras((prev) => prev.filter((_, idx) => idx !== i))}
                    className="opacity-60 group-hover:opacity-100 hover:text-[var(--danger)]"
                  >
                    <X className="w-3 h-3" />
                  </button>
                </div>
              ))}
            </div>
          )}
        </div>

        <div className="flex gap-2 justify-end pt-2 border-t border-[var(--border)]">
          <button
            onClick={onClose}
            disabled={submitting}
            className="btn btn-ghost"
          >
            Cancelar
          </button>
          <button
            onClick={submit}
            disabled={submitting || editPrompt.trim().length < 5}
            className="btn btn-primary"
          >
            {submitting ? (
              <>
                <Loader2 className="w-4 h-4 animate-spin" />
                Editando...
              </>
            ) : (
              <>
                <Wand2 className="w-4 h-4" />
                Editar (1 crédito)
              </>
            )}
          </button>
        </div>
      </div>
    </div>
  );
}
