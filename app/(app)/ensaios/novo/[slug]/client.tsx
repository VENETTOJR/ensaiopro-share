"use client";

import { useState, useCallback, useRef, useMemo } from "react";
import Image from "next/image";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { motion, AnimatePresence } from "framer-motion";
import {
  Upload, X, Check, Sparkles, ArrowLeft, ImageIcon,
  Loader2, AlertCircle, Plus, Coins, Lightbulb, Sun, UserCircle, Camera, Smile, Search,
  Users, Crop,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { QualityBadge } from "@/components/refs/QualityBadge";
import { FaceCropModal } from "@/components/refs/FaceCropModal";
import { FaceSelectModal } from "@/components/refs/FaceSelectModal";
import { analyzeFile } from "@/lib/face/loader";
import type { QualityResult, FaceBox } from "@/lib/face/quality";
import { CROP_CTA_TEXT, blockGenerationMessage } from "@/lib/face/messages";
import { isInfantilSlug } from "@/lib/ensaio-slugs";
import { Breadcrumb } from "@/components/Breadcrumb";

interface Tipo {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  supports_idade: boolean;
  icon: string;
  max_pessoas?: number;
}

const SUGGESTED_LABELS: Record<string, string[]> = {
  casal: ["Pessoa 1", "Pessoa 2"],
  casamento: ["Noiva", "Noivo"],
  familia: ["Pessoa 1", "Pessoa 2", "Pessoa 3", "Pessoa 4", "Pessoa 5"],
  mae: ["Mãe", "Filho(a) 1", "Filho(a) 2", "Filho(a) 3"],
  "copa-brasil": ["Você", "Companheiro(a)", "Amigo(a) 1", "Amigo(a) 2", "Amigo(a) 3"],
};

interface Prompt {
  id: string;
  numero: number;
  texto: string;
  example_image_url: string | null;
  categoria: string | null;
}

interface RefFile {
  file: File;
  url: string;
  id: string;
  isHeic: boolean;
  converting?: boolean;
  /** "loading" enquanto roda análise; depois fica green/yellow/red ou null em fallback. */
  quality?: QualityResult | "loading" | "fallback";
}

const MIN_PHOTOS = 1; // mínimo 1 — quanto mais melhor, mas não bloqueia
const MAX_PHOTOS = 10;
const MAX_SIZE_MB = 15; // HEIC do iPhone pode passar de 10MB
const IDEAL_PHOTOS = 4; // "ideal" só pra mensagem de dica

const ACCEPTED_TYPES_REGEX = /\.(jpe?g|png|webp|heic|heif)$/i;
const ACCEPTED_MIMES = new Set([
  "image/jpeg",
  "image/jpg",
  "image/png",
  "image/webp",
  "image/heic",
  "image/heif",
]);

export function NovoEnsaioClient({
  tipo,
  prompts,
  credits,
}: {
  tipo: Tipo;
  prompts: Prompt[];
  credits: number;
}) {
  const router = useRouter();
  const fileInputRef = useRef<HTMLInputElement>(null);

  const [selectedPrompts, setSelectedPrompts] = useState<Set<string>>(new Set());
  // filesByPessoa[i] = array de fotos da pessoa i (0-indexed)
  const [filesByPessoa, setFilesByPessoa] = useState<
    Array<Array<RefFile>>
  >([[]]);
  // Modal de "escolha qual rosto" (quando foto tem 2+ faces)
  const [faceSelect, setFaceSelect] = useState<{
    file: File;
    faces: FaceBox[];
    pessoaIdx: number;
    refId: string;
  } | null>(null);
  // Modal de crop manual (quando user clica "Recortar foto")
  const [cropTarget, setCropTarget] = useState<{
    file: File;
    suggested: FaceBox | null;
    pessoaIdx: number;
    refId: string;
  } | null>(null);
  const [pessoasCount, setPessoasCount] = useState(1);
  const [currentPessoaIdx, setCurrentPessoaIdx] = useState(0);
  const [dragging, setDragging] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [idade, setIdade] = useState<string>("");
  const [nome, setNome] = useState("");
  const [searchTerm, setSearchTerm] = useState("");
  const [converting, setConverting] = useState(0);

  const maxPessoas = Math.max(1, tipo.max_pessoas ?? 1);
  const isMulti = maxPessoas > 1;
  const personLabels = SUGGESTED_LABELS[tipo.slug] ?? Array.from({ length: maxPessoas }, (_, i) => `Pessoa ${i + 1}`);

  // Arrays proxy pra compatibilidade com resto do código (sumariza todas as fotos)
  const files = filesByPessoa.flat();

  // Em multi-pessoa: cada pessoa tem que ter pelo menos 1 foto
  const activePessoas = isMulti ? pessoasCount : 1;
  const allPessoasHavePhotos = Array.from({ length: activePessoas }).every(
    (_, i) => (filesByPessoa[i]?.length ?? 0) >= 1
  );
  const enoughPhotos = isMulti ? allPessoasHavePhotos : files.length >= MIN_PHOTOS;
  const enoughCredits = credits >= selectedPrompts.size;

  // AC6.8: bloqueia geração se 100% das refs de uma pessoa = vermelho.
  // Considera "red" só os labels FINAIS (loading/fallback/sem-quality não bloqueiam).
  const blockedPersons: number[] = useMemo(() => {
    const blocked: number[] = [];
    for (let i = 0; i < activePessoas; i++) {
      const refs = filesByPessoa[i] ?? [];
      if (refs.length === 0) continue;
      const final = refs.filter(
        (r) => r.quality && r.quality !== "loading" && r.quality !== "fallback"
      );
      if (final.length === 0) continue; // ainda analisando
      const allRed = final.every(
        (r) => typeof r.quality === "object" && r.quality.label === "red"
      );
      if (allRed) blocked.push(i);
    }
    return blocked;
  }, [filesByPessoa, activePessoas]);

  const isAnalyzing = useMemo(
    () =>
      filesByPessoa.some((arr) => arr.some((f) => f.quality === "loading")),
    [filesByPessoa]
  );

  // Modal de confirmação antes de gastar créditos
  const [showConfirm, setShowConfirm] = useState(false);

  // Bug 2026-04-27: bebê sem idade gerava adulto na cena infantil. Idade é
  // obrigatória pra slugs infantis (bebe, bebe-masc) — sem ela, o pipeline cai
  // em fallback "30 anos" que adultiza o sujeito.
  const isInfantil = isInfantilSlug(tipo.slug);
  const idadeRequiredAndMissing = isInfantil && !idade;

  const canSubmit =
    enoughPhotos &&
    selectedPrompts.size > 0 &&
    enoughCredits &&
    !submitting &&
    converting === 0 &&
    blockedPersons.length === 0 &&
    !idadeRequiredAndMissing;

  // Prompts com imagem primeiro, sem imagem depois — mas todos aparecem
  const allPrompts = useMemo(() => {
    const withImg = prompts.filter((p) => p.example_image_url);
    const withoutImg = prompts.filter((p) => !p.example_image_url);
    return [...withImg, ...withoutImg];
  }, [prompts]);

  const filteredPrompts = useMemo(() => {
    const q = searchTerm.trim().toLowerCase();
    if (!q) return allPrompts;
    return allPrompts.filter(
      (p) =>
        String(p.numero).includes(q) ||
        (p.categoria?.toLowerCase().includes(q) ?? false)
    );
  }, [allPrompts, searchTerm]);

  const togglePrompt = useCallback((id: string) => {
    setSelectedPrompts((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }, []);

  const selectAll = useCallback(() => {
    setSelectedPrompts(new Set(allPrompts.map((p) => p.id)));
  }, [allPrompts]);

  const clearSelection = useCallback(() => {
    setSelectedPrompts(new Set());
  }, []);

  /**
   * Converte HEIC/HEIF pra JPEG no browser via heic2any (wasm).
   * Server (sharp) não decodifica HEVC de iPhone — precisa ser feito aqui.
   */
  const convertHeic = useCallback(async (file: File): Promise<File> => {
    const heic2any = (await import("heic2any")).default;
    const blob = await heic2any({
      blob: file,
      toType: "image/jpeg",
      quality: 0.92,
    });
    const jpegBlob = Array.isArray(blob) ? blob[0] : blob;
    const newName = file.name.replace(/\.(heic|heif)$/i, ".jpg");
    return new File([jpegBlob], newName, { type: "image/jpeg" });
  }, []);

  /**
   * Roda análise de qualidade client-side em uma ref já adicionada.
   * Atualiza o estado in-place. Story 01 — AC6.2, AC6.3, AC6.5.
   */
  const runQualityAnalysis = useCallback(
    async (refId: string, file: File, pessoaIdx: number) => {
      setFilesByPessoa((prev) =>
        prev.map((arr) =>
          arr.map((f) => (f.id === refId ? { ...f, quality: "loading" as const } : f))
        )
      );
      try {
        const result = await analyzeFile(file);
        setFilesByPessoa((prev) =>
          prev.map((arr) =>
            arr.map((f) => (f.id === refId ? { ...f, quality: result } : f))
          )
        );
        // Multi-face → força user a escolher
        if (result.faces.length > 1) {
          setFaceSelect({ file, faces: result.faces, pessoaIdx, refId });
        }
      } catch (err) {
        console.error("[quality] analysis failed:", err);
        setFilesByPessoa((prev) =>
          prev.map((arr) =>
            arr.map((f) => (f.id === refId ? { ...f, quality: "fallback" as const } : f))
          )
        );
      }
    },
    []
  );

  const addFiles = useCallback(
    async (list: FileList | File[], pessoaIdx: number = currentPessoaIdx) => {
      const toProcess: Array<{ file: File; isHeic: boolean; tempId: string }> = [];
      for (const f of Array.from(list)) {
        const nameLower = f.name.toLowerCase();
        const isHeic = nameLower.endsWith(".heic") || nameLower.endsWith(".heif");
        const typeOk = ACCEPTED_MIMES.has(f.type.toLowerCase()) || ACCEPTED_TYPES_REGEX.test(nameLower);
        if (!typeOk) {
          toast.error(`${f.name}: formato não aceito (JPG, PNG, WEBP, HEIC)`);
          continue;
        }
        if (f.size > MAX_SIZE_MB * 1024 * 1024) {
          toast.error(`${f.name} ultrapassa ${MAX_SIZE_MB}MB.`);
          continue;
        }
        const tempId = `${f.name}-${f.size}-${Date.now()}-${Math.random()}`;
        toProcess.push({ file: f, isHeic, tempId });
      }

      const initial: RefFile[] = toProcess.map((p) => ({
        file: p.file,
        url: p.isHeic ? "" : URL.createObjectURL(p.file),
        id: p.tempId,
        isHeic: p.isHeic,
        converting: p.isHeic,
      }));

      setFilesByPessoa((prev) => {
        const next = [...prev];
        while (next.length <= pessoaIdx) next.push([]);
        next[pessoaIdx] = [...next[pessoaIdx], ...initial].slice(0, MAX_PHOTOS);
        return next;
      });

      // Dispara análise das fotos não-HEIC imediatamente
      for (const p of toProcess) {
        if (!p.isHeic) {
          runQualityAnalysis(p.tempId, p.file, pessoaIdx);
        }
      }

      const heics = toProcess.filter((p) => p.isHeic);
      if (heics.length > 0) {
        setConverting((c) => c + heics.length);
        await Promise.all(
          heics.map(async (p) => {
            try {
              const jpeg = await convertHeic(p.file);
              const newUrl = URL.createObjectURL(jpeg);
              setFilesByPessoa((prev) => {
                const next = prev.map((arr) =>
                  arr.map((f) =>
                    f.id === p.tempId
                      ? { ...f, file: jpeg, url: newUrl, isHeic: false, converting: false }
                      : f
                  )
                );
                return next;
              });
              // HEIC convertido → roda análise no JPEG resultante
              runQualityAnalysis(p.tempId, jpeg, pessoaIdx);
            } catch (err) {
              console.error("HEIC convert failed:", err);
              toast.error(`Falha ao converter ${p.file.name}. Use JPG/PNG.`);
              setFilesByPessoa((prev) =>
                prev.map((arr) => arr.filter((f) => f.id !== p.tempId))
              );
            } finally {
              setConverting((c) => Math.max(0, c - 1));
            }
          })
        );
      }
    },
    [convertHeic, currentPessoaIdx, runQualityAnalysis]
  );

  const removeFile = useCallback((id: string) => {
    setFilesByPessoa((prev) => {
      return prev.map((arr) => {
        const f = arr.find((x) => x.id === id);
        if (f && f.url) URL.revokeObjectURL(f.url);
        return arr.filter((x) => x.id !== id);
      });
    });
  }, []);

  async function submit() {
    if (!canSubmit) return;
    setSubmitting(true);

    try {
      const formData = new FormData();
      formData.append("ensaio_type_id", tipo.id);
      formData.append("ensaio_type_slug", tipo.slug);
      formData.append("nome", nome);
      if (idade) formData.append("idade", idade);
      formData.append("prompt_ids", JSON.stringify(Array.from(selectedPrompts)));
      formData.append("pessoas_count", String(activePessoas));

      // Envia fotos numeradas por pessoa: photos_0[], photos_1[]...
      // + quality_$i = JSON com label/metadata na MESMA ORDEM dos files
      for (let i = 0; i < activePessoas; i++) {
        const arr = filesByPessoa[i] ?? [];
        const qualities: Array<{
          label: "green" | "yellow" | "red" | null;
          metadata: unknown;
        }> = [];
        for (const f of arr) {
          formData.append(`photos_${i}`, f.file);
          if (typeof f.quality === "object" && f.quality) {
            qualities.push({ label: f.quality.label, metadata: f.quality.metadata });
          } else {
            qualities.push({ label: null, metadata: null });
          }
        }
        formData.append(`quality_${i}`, JSON.stringify(qualities));
        // Label sugerido pra IA saber quem é quem (ex: "Mãe", "Filho")
        if (personLabels[i]) formData.append(`pessoa_label_${i}`, personLabels[i]);
      }

      const res = await fetch("/api/generate", {
        method: "POST",
        body: formData,
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Erro ao criar ensaio");

      toast.success("Ensaio criado! Gerando as fotos...");
      router.push(`/ensaios/${data.ensaioId}`);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Falha ao criar ensaio");
      setSubmitting(false);
    }
  }

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-6 fade-in pb-40">
      <Link
        href="/dashboard"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-4 transition"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <Breadcrumb
        items={[
          { label: "Meus ensaios", href: "/ensaios" },
          { label: "Novo", href: "/ensaios/novo" },
          { label: tipo.name },
        ]}
      />

      <div className="mb-6 mt-4">
        <div className="inline-block px-3 py-1 rounded-full bg-[var(--primary)]/10 border border-[var(--primary)]/30 text-xs text-[var(--primary)] mb-2">
          {tipo.name}
        </div>
        <h1 className="text-3xl md:text-4xl font-bold">
          Vamos criar seu <span className="text-gradient">ensaio</span>
        </h1>
        {tipo.description && (
          <p className="text-[var(--muted)] mt-2">{tipo.description}</p>
        )}
      </div>

      {/* STEP 1: Upload */}
      <section className="mb-10">
        <SectionHeader
          num={1}
          title={isMulti ? "Fotos de cada pessoa" : "Suas fotos de referência"}
          subtitle={
            isMulti
              ? `Esse tipo aceita até ${maxPessoas} pessoas. Faça upload das fotos de cada pessoa separadamente em cada aba.`
              : `Mínimo ${MIN_PHOTOS}, ideal ${IDEAL_PHOTOS}+. Quanto mais ângulos diferentes, melhor o resultado.`
          }
        />

        <PhotoTipsCard />

        {/* Seletor "Quantas pessoas?" (só multi-pessoa) */}
        {isMulti && (
          <div className="card bg-gradient-to-br from-[var(--primary)]/5 to-[var(--accent)]/5 border-[var(--primary)]/20 mb-4">
            <div className="flex items-center gap-2 mb-3">
              <Users className="w-4 h-4 text-[var(--primary)]" />
              <h3 className="text-sm font-bold">Quantas pessoas no ensaio?</h3>
            </div>
            <div className="flex gap-2 overflow-x-auto pb-1 scrollbar-none">
              {Array.from({ length: maxPessoas }, (_, i) => i + 1).map((n) => (
                <button
                  key={n}
                  onClick={() => {
                    setPessoasCount(n);
                    if (currentPessoaIdx >= n) setCurrentPessoaIdx(0);
                  }}
                  className={cn(
                    "shrink-0 px-4 py-2 rounded-full text-sm font-medium transition border",
                    pessoasCount === n
                      ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white border-transparent shadow-md shadow-[var(--primary)]/20"
                      : "bg-[var(--background-elev)] text-[var(--muted-strong)] border-[var(--border)] hover:border-[var(--border-strong)]"
                  )}
                >
                  {n} {n === 1 ? "pessoa" : "pessoas"}
                </button>
              ))}
            </div>
          </div>
        )}

        {/* Aviso sobre fotos individuais vs em grupo (multi-pessoa com 2+) */}
        {isMulti && pessoasCount > 1 && (
          <div className="card border-amber-500/40 bg-amber-500/5 mb-4">
            <div className="flex gap-3 items-start">
              <span className="text-amber-500 text-lg leading-none">⚠️</span>
              <div className="text-sm text-[var(--muted-strong)]">
                <strong className="text-amber-600 dark:text-amber-400">Pra rosto idêntico:</strong>{" "}
                envie <strong>fotos individuais</strong> (1 pessoa por foto) em cada aba.
                <br />
                <span className="text-[var(--muted)]">
                  Se só tiver fotos juntos, pode subir nas duas abas — funciona, mas a fidelidade
                  do rosto cai (a IA pode misturar features). Sempre que possível, recorte cada
                  pessoa antes.
                </span>
              </div>
            </div>
          </div>
        )}

        {/* Tabs de pessoas (só quando pessoasCount > 1) */}
        {isMulti && pessoasCount > 1 && (
          <div className="flex gap-2 overflow-x-auto pb-2 mb-3 scrollbar-none -mx-1 px-1">
            {Array.from({ length: pessoasCount }, (_, i) => {
              const count = filesByPessoa[i]?.length ?? 0;
              const active = currentPessoaIdx === i;
              const done = count >= 1;
              return (
                <button
                  key={i}
                  onClick={() => setCurrentPessoaIdx(i)}
                  className={cn(
                    "shrink-0 px-4 py-2.5 rounded-xl text-sm font-medium transition border flex items-center gap-2",
                    active
                      ? "bg-[var(--background-elev-2)] border-[var(--primary)] text-[var(--foreground)]"
                      : "bg-[var(--background-elev)] border-[var(--border)] text-[var(--muted-strong)] hover:border-[var(--border-strong)]"
                  )}
                >
                  <span
                    className={cn(
                      "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold",
                      done ? "bg-[var(--success)] text-white" : "bg-[var(--background-elev-2)] text-[var(--muted)]"
                    )}
                  >
                    {done ? <Check className="w-3.5 h-3.5" strokeWidth={3} /> : i + 1}
                  </span>
                  <span>{personLabels[i] ?? `Pessoa ${i + 1}`}</span>
                  <span className="text-xs text-[var(--muted)]">({count})</span>
                </button>
              );
            })}
          </div>
        )}

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragging(true);
          }}
          onDragLeave={() => setDragging(false)}
          onDrop={(e) => {
            e.preventDefault();
            setDragging(false);
            if (e.dataTransfer.files.length) addFiles(e.dataTransfer.files);
          }}
          className={cn(
            "rounded-2xl border-2 border-dashed p-6 md:p-8 transition-all",
            dragging
              ? "border-[var(--primary)] bg-[var(--primary)]/5 scale-[1.005]"
              : "border-[var(--border-strong)] bg-[var(--background-elev)]/50"
          )}
        >
          <input
            ref={fileInputRef}
            type="file"
            multiple
            accept="image/jpeg,image/jpg,image/png,image/webp,image/heic,image/heif,.heic,.heif"
            className="hidden"
            onChange={(e) => {
              if (e.target.files) addFiles(e.target.files);
              e.target.value = "";
            }}
          />

          {(() => {
            const currentFiles = isMulti
              ? filesByPessoa[currentPessoaIdx] ?? []
              : files;
            return currentFiles.length === 0 ? (
            <div
              className="flex flex-col items-center justify-center text-center py-8 cursor-pointer"
              onClick={() => fileInputRef.current?.click()}
            >
              <div className="w-16 h-16 rounded-2xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent)]/20 flex items-center justify-center mb-4">
                <Upload className="w-7 h-7 text-[var(--primary)]" />
              </div>
              <div className="font-semibold text-lg mb-1">
                {isMulti && pessoasCount > 1
                  ? `Fotos de ${personLabels[currentPessoaIdx] ?? `Pessoa ${currentPessoaIdx + 1}`}`
                  : "Clique para enviar ou arraste as fotos aqui"}
              </div>
              <div className="text-sm text-[var(--muted)]">
                JPG, PNG, WEBP ou HEIC (iPhone) até {MAX_SIZE_MB}MB cada. Mínimo {MIN_PHOTOS}, ideal {IDEAL_PHOTOS}+.
              </div>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-3 md:grid-cols-5 lg:grid-cols-6 gap-3">
                <AnimatePresence mode="popLayout">
                  {currentFiles.map((f) => {
                    const q = f.quality;
                    const qualityLabel: "green" | "yellow" | "red" | "loading" | null =
                      q === "loading"
                        ? "loading"
                        : typeof q === "object"
                        ? q.label
                        : null;
                    const reason =
                      typeof q === "object" ? q.metadata.reason : undefined;
                    const suggestedFace =
                      typeof q === "object" && q.faces.length > 0 ? q.faces[0] : null;
                    const showCropCta =
                      typeof q === "object" &&
                      (q.label === "yellow" || q.label === "red") &&
                      q.metadata.reason !== "no_face";
                    return (
                      <motion.div
                        key={f.id}
                        layout
                        initial={{ opacity: 0, scale: 0.85 }}
                        animate={{ opacity: 1, scale: 1 }}
                        exit={{ opacity: 0, scale: 0.85 }}
                        transition={{ type: "spring", stiffness: 320, damping: 26 }}
                        className="relative group aspect-square rounded-xl overflow-hidden bg-[var(--background-elev-2)]"
                      >
                        {f.converting ? (
                          <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 bg-gradient-to-br from-[var(--primary)]/30 to-[var(--accent)]/30">
                            <Loader2 className="w-5 h-5 animate-spin text-[var(--primary)]" />
                            <span className="text-[10px] uppercase tracking-wider font-semibold text-[var(--primary)]">Convertendo HEIC</span>
                          </div>
                        ) : f.url ? (
                          <Image
                            src={f.url}
                            alt=""
                            fill
                            className="object-cover"
                            sizes="(max-width: 768px) 33vw, 15vw"
                            unoptimized
                          />
                        ) : (
                          <div className="absolute inset-0 flex items-center justify-center">
                            <ImageIcon className="w-6 h-6 text-[var(--muted)]" />
                          </div>
                        )}

                        {/* Badge de qualidade (canto inferior esquerdo) */}
                        {qualityLabel && (
                          <div className="absolute bottom-1.5 left-1.5 z-10">
                            <QualityBadge label={qualityLabel} reason={reason} compact />
                          </div>
                        )}

                        {/* Botão "Recortar foto" (canto inferior direito, só se yellow/red e tem face) */}
                        {showCropCta && (
                          <button
                            onClick={() =>
                              setCropTarget({
                                file: f.file,
                                suggested: suggestedFace,
                                pessoaIdx: isMulti ? currentPessoaIdx : 0,
                                refId: f.id,
                              })
                            }
                            className="absolute bottom-1.5 right-1.5 z-10 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full bg-black/65 backdrop-blur text-[10px] font-medium text-white hover:bg-[var(--primary)] transition"
                            aria-label={CROP_CTA_TEXT}
                          >
                            <Crop className="w-3 h-3" />
                            Recortar
                          </button>
                        )}

                        <button
                          onClick={() => removeFile(f.id)}
                          className="absolute top-1.5 right-1.5 w-7 h-7 rounded-full bg-black/60 backdrop-blur hover:bg-[var(--danger)] flex items-center justify-center opacity-0 group-hover:opacity-100 transition z-20"
                          aria-label="Remover"
                        >
                          <X className="w-3.5 h-3.5 text-white" />
                        </button>
                      </motion.div>
                    );
                  })}

                  {currentFiles.length < MAX_PHOTOS && (
                    <motion.button
                      layout
                      key="add-more"
                      onClick={() => fileInputRef.current?.click()}
                      className="aspect-square rounded-xl border-2 border-dashed border-[var(--border-strong)] hover:border-[var(--primary)] hover:bg-[var(--primary)]/5 flex flex-col items-center justify-center text-[var(--muted)] hover:text-[var(--primary)] transition gap-1"
                    >
                      <Plus className="w-5 h-5" />
                      <span className="text-xs">Adicionar</span>
                    </motion.button>
                  )}
                </AnimatePresence>
              </div>

              <div className="flex items-center justify-between mt-4 text-xs">
                <div
                  className={cn(
                    "flex items-center gap-1.5",
                    currentFiles.length >= IDEAL_PHOTOS
                      ? "text-[var(--success)]"
                      : currentFiles.length >= 1
                      ? "text-[var(--warning)]"
                      : "text-[var(--danger)]"
                  )}
                >
                  {currentFiles.length >= IDEAL_PHOTOS ? (
                    <Check className="w-3.5 h-3.5" />
                  ) : (
                    <AlertCircle className="w-3.5 h-3.5" />
                  )}
                  {currentFiles.length} {currentFiles.length === 1 ? "foto" : "fotos"}
                  {currentFiles.length < IDEAL_PHOTOS && currentFiles.length >= 1 && (
                    <span className="opacity-70"> (ideal: {IDEAL_PHOTOS}+)</span>
                  )}
                </div>
                <button
                  onClick={() => {
                    if (isMulti) {
                      setFilesByPessoa((prev) => {
                        const next = [...prev];
                        (next[currentPessoaIdx] ?? []).forEach((f) => {
                          if (f.url) URL.revokeObjectURL(f.url);
                        });
                        next[currentPessoaIdx] = [];
                        return next;
                      });
                    } else {
                      files.forEach((f) => {
                        if (f.url) URL.revokeObjectURL(f.url);
                      });
                      setFilesByPessoa([[]]);
                    }
                  }}
                  className="text-[var(--muted)] hover:text-[var(--danger)] transition"
                >
                  Limpar
                </button>
              </div>
            </>
          );
          })()}
        </div>

        <div className="grid md:grid-cols-2 gap-3 mt-4">
          <div>
            <label htmlFor="nome" className="form-label">Nome do ensaio (opcional)</label>
            <input
              id="nome"
              type="text"
              value={nome}
              onChange={(e) => setNome(e.target.value)}
              className="input"
              placeholder={`Ensaio ${tipo.name}`}
              maxLength={80}
            />
          </div>
          {tipo.supports_idade && (
            <div>
              <label htmlFor="idade" className="form-label">
                Idade {isInfantil ? "(obrigatório)" : "(opcional)"}
              </label>
              <input
                id="idade"
                type="number"
                min={1}
                max={120}
                value={idade}
                onChange={(e) => setIdade(e.target.value)}
                className="input"
                placeholder="Ex: 5"
                required={isInfantil}
              />
              {isInfantil && !idade && (
                <p className="text-xs text-amber-600 mt-1">
                  Informe a idade da criança — sem isso, o ensaio fica adultizado.
                </p>
              )}
            </div>
          )}
        </div>
      </section>

      {/* STEP 2: Selecionar prompts */}
      <section className="mb-10">
        <SectionHeader
          num={2}
          title="Escolha os estilos"
          subtitle="Cada estilo selecionado = 1 foto gerada. Passe o mouse pra ver o exemplo."
        />

        <div className="flex flex-col sm:flex-row sm:items-center gap-3 mb-4">
          <div className="relative flex-1">
            <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
            <input
              type="text"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              placeholder="Filtrar estilos (nº ou categoria)..."
              className="input pl-9"
            />
          </div>
          <div className="flex items-center justify-between sm:justify-end gap-2 text-sm">
            <div className="text-[var(--muted)]">
              {selectedPrompts.size} / {filteredPrompts.length}
            </div>
            <button onClick={clearSelection} className="btn btn-ghost btn-sm">Limpar</button>
            <button
              onClick={() => setSelectedPrompts(new Set(filteredPrompts.map((p) => p.id)))}
              className="btn btn-secondary btn-sm"
            >
              Selecionar {filteredPrompts.length === allPrompts.length ? "todos" : "filtrados"}
            </button>
          </div>
        </div>

        <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 lg:grid-cols-5 gap-3">
          {filteredPrompts.map((p) => {
            const selected = selectedPrompts.has(p.id);
            const hasImage = !!p.example_image_url;
            return (
              <motion.button
                key={p.id}
                onClick={() => togglePrompt(p.id)}
                whileTap={{ scale: 0.97 }}
                className={cn(
                  "group relative aspect-[3/4] rounded-xl overflow-hidden border-2 transition-all",
                  selected
                    ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/30"
                    : "border-transparent hover:border-[var(--border-strong)]"
                )}
              >
                {hasImage ? (
                  <Image
                    src={p.example_image_url!}
                    alt={`Estilo ${p.numero}`}
                    fill
                    className="object-cover transition group-hover:scale-105"
                    sizes="(max-width: 640px) 50vw, (max-width: 1024px) 25vw, 20vw"
                    unoptimized
                  />
                ) : (
                  <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/25 via-[var(--background-elev-2)] to-[var(--accent)]/25 flex flex-col items-center justify-center p-3 text-center">
                    <ImageIcon className="w-6 h-6 text-[var(--primary)] mb-2 opacity-70" />
                    <div className="text-[11px] uppercase tracking-wider text-[var(--muted)] mb-1">Estilo</div>
                    <div className="text-xs text-[var(--muted-strong)] font-medium leading-tight line-clamp-3">
                      {p.categoria ?? `#${p.numero}`}
                    </div>
                    <div className="text-[10px] text-[var(--muted)] mt-2 italic">Exemplo em breve</div>
                  </div>
                )}
                {/* Gradient overlay */}
                <div
                  className={cn(
                    "absolute inset-0 transition pointer-events-none",
                    selected
                      ? "bg-gradient-to-t from-[var(--primary)]/60 via-transparent to-transparent"
                      : hasImage
                      ? "bg-gradient-to-t from-black/50 via-transparent to-transparent opacity-70 group-hover:opacity-100"
                      : ""
                  )}
                />
                {/* Number */}
                <div className="absolute bottom-2 left-2 px-2 py-0.5 rounded-md bg-black/60 backdrop-blur text-[11px] text-white font-medium">
                  #{p.numero}
                </div>
                {/* Check badge */}
                <AnimatePresence>
                  {selected && (
                    <motion.div
                      initial={{ scale: 0, rotate: -45 }}
                      animate={{ scale: 1, rotate: 0 }}
                      exit={{ scale: 0 }}
                      transition={{ type: "spring", stiffness: 500, damping: 24 }}
                      className="absolute top-2 right-2 w-7 h-7 rounded-full bg-[var(--primary)] flex items-center justify-center shadow-lg"
                    >
                      <Check className="w-4 h-4 text-white" strokeWidth={3} />
                    </motion.div>
                  )}
                </AnimatePresence>
              </motion.button>
            );
          })}
        </div>

        {filteredPrompts.length === 0 && allPrompts.length > 0 && (
          <div className="card text-center text-[var(--muted)] py-8">
            <Search className="w-6 h-6 mx-auto mb-2 opacity-50" />
            Nenhum estilo bate com &quot;{searchTerm}&quot;.
          </div>
        )}
        {allPrompts.length === 0 && (
          <div className="card text-center text-[var(--muted)] py-12">
            <ImageIcon className="w-8 h-8 mx-auto mb-2 opacity-50" />
            Ainda não há estilos cadastrados para este tipo.
          </div>
        )}
      </section>

      {/* Avisos de bloqueio (AC6.8) — uma linha por pessoa com 100% red */}
      {blockedPersons.length > 0 && (
        <div className="card border-[var(--danger)]/40 bg-[var(--danger)]/5 mb-4">
          {blockedPersons.map((idx) => (
            <div key={idx} className="flex items-start gap-2 text-sm text-[var(--muted-strong)]">
              <AlertCircle className="w-4 h-4 text-[var(--danger)] mt-0.5 shrink-0" />
              <span>{blockGenerationMessage(personLabels[idx] ?? `Pessoa ${idx + 1}`)}</span>
            </div>
          ))}
        </div>
      )}

      {/* Floating submit bar */}
      <motion.div
        initial={{ y: 100 }}
        animate={{ y: 0 }}
        className="fixed bottom-0 left-0 md:left-64 right-0 z-30 glass border-t border-[var(--border)] pb-safe"
      >
        <div className="max-w-6xl mx-auto px-4 md:px-8 py-3 md:py-4 flex items-center gap-3 md:gap-4">
          <div className="flex-1 flex items-center gap-3 text-sm">
            <div className="hidden md:flex items-center gap-1.5 text-[var(--muted)]">
              <Coins className="w-4 h-4" />
              <span className="font-semibold text-[var(--foreground)]">{credits}</span> créditos
            </div>
            <div className="hidden md:block text-[var(--border-strong)]">·</div>
            <div className="text-[var(--muted)]">
              Custo: <span className="font-semibold text-[var(--foreground)]">{selectedPrompts.size}</span> {selectedPrompts.size === 1 ? "crédito" : "créditos"}
            </div>
          </div>

          {!enoughCredits && selectedPrompts.size > 0 ? (
            <Link href="/planos" className="btn btn-primary btn-lg">
              <Coins className="w-4 h-4" />
              Comprar créditos
            </Link>
          ) : (
            <button
              onClick={() => setShowConfirm(true)}
              disabled={!canSubmit}
              className="btn btn-primary btn-lg"
            >
              {submitting ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Criando...
                </>
              ) : isAnalyzing ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Analisando fotos...
                </>
              ) : (
                <>
                  <Sparkles className="w-4 h-4" />
                  Gerar {selectedPrompts.size > 0 ? `(${selectedPrompts.size})` : "ensaio"}
                </>
              )}
            </button>
          )}
        </div>
      </motion.div>

      {/* Modal: confirmação antes de gerar (evita gasto acidental de créditos) */}
      {showConfirm && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
          onClick={() => setShowConfirm(false)}
        >
          <div
            className="card max-w-md w-full"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex items-center gap-3 mb-4">
              <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center">
                <Sparkles className="w-5 h-5 text-[var(--primary)]" />
              </div>
              <div>
                <div className="font-semibold">Confirmar geração</div>
                <div className="text-xs text-[var(--muted)]">Revise antes de usar seus créditos</div>
              </div>
            </div>

            <div className="space-y-3 text-sm mb-6">
              <div className="flex justify-between p-3 rounded-lg bg-[var(--background-elev-2)]">
                <span className="text-[var(--muted)]">Tipo</span>
                <strong>{tipo.name}</strong>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-[var(--background-elev-2)]">
                <span className="text-[var(--muted)]">Fotos</span>
                <strong>{selectedPrompts.size}</strong>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-[var(--background-elev-2)]">
                <span className="text-[var(--muted)]">Créditos</span>
                <strong className="text-[var(--primary)]">
                  {selectedPrompts.size} {selectedPrompts.size === 1 ? "crédito" : "créditos"}
                </strong>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-[var(--background-elev-2)]">
                <span className="text-[var(--muted)]">Tempo estimado</span>
                <strong>~{Math.ceil(selectedPrompts.size * 10 / 60)} min</strong>
              </div>
              <div className="flex justify-between p-3 rounded-lg bg-[var(--background-elev-2)]">
                <span className="text-[var(--muted)]">Saldo após</span>
                <strong>{Math.max(0, credits - selectedPrompts.size)} créditos</strong>
              </div>
            </div>

            <div className="flex gap-2">
              <button
                onClick={() => setShowConfirm(false)}
                className="btn btn-ghost flex-1"
                disabled={submitting}
              >
                Voltar
              </button>
              <button
                onClick={() => {
                  setShowConfirm(false);
                  submit();
                }}
                className="btn btn-primary flex-1"
                disabled={submitting}
              >
                <Sparkles className="w-4 h-4" />
                Gerar agora
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal: foto com 2+ rostos — força user escolher (AC6.5, AC6.9) */}
      {faceSelect && (
        <FaceSelectModal
          open={!!faceSelect}
          file={faceSelect.file}
          faces={faceSelect.faces}
          personLabel={personLabels[faceSelect.pessoaIdx] ?? `Pessoa ${faceSelect.pessoaIdx + 1}`}
          onClose={() => setFaceSelect(null)}
          onConfirm={async (cropped) => {
            const target = faceSelect;
            setFaceSelect(null);
            setFilesByPessoa((prev) =>
              prev.map((arr) =>
                arr.map((f) => {
                  if (f.id !== target.refId) return f;
                  if (f.url) URL.revokeObjectURL(f.url);
                  return {
                    ...f,
                    file: cropped,
                    url: URL.createObjectURL(cropped),
                    quality: "loading",
                  };
                })
              )
            );
            await runQualityAnalysis(target.refId, cropped, target.pessoaIdx);
          }}
        />
      )}

      {/* Modal: crop manual (AC6.4) */}
      {cropTarget && (
        <FaceCropModal
          open={!!cropTarget}
          file={cropTarget.file}
          suggestedBox={cropTarget.suggested}
          onClose={() => setCropTarget(null)}
          onConfirm={async (cropped) => {
            const target = cropTarget;
            setCropTarget(null);
            setFilesByPessoa((prev) =>
              prev.map((arr) =>
                arr.map((f) => {
                  if (f.id !== target.refId) return f;
                  if (f.url) URL.revokeObjectURL(f.url);
                  return {
                    ...f,
                    file: cropped,
                    url: URL.createObjectURL(cropped),
                    quality: "loading",
                  };
                })
              )
            );
            await runQualityAnalysis(target.refId, cropped, target.pessoaIdx);
          }}
        />
      )}
    </div>
  );
}

function PhotoTipsCard() {
  const tips = [
    { icon: UserCircle, title: "Rosto bem visível", desc: "Sem óculos escuros, boné ou máscara cobrindo o rosto" },
    { icon: Camera, title: "Variedade de ângulos", desc: "Frontal, perfil, corpo inteiro e closes — mistura tudo" },
    { icon: Sun, title: "Boa iluminação", desc: "Luz natural é ideal. Evite fotos escuras ou com sombra forte no rosto" },
    { icon: Smile, title: "Expressões diferentes", desc: "Séria, sorrindo, natural — ajuda a IA entender seu estilo" },
  ];
  return (
    <div className="card bg-gradient-to-br from-[var(--primary)]/5 to-[var(--accent)]/5 border-[var(--primary)]/20 mb-4">
      <div className="flex items-center gap-2 mb-3">
        <Lightbulb className="w-4 h-4 text-[var(--primary)]" />
        <h3 className="text-sm font-bold">Pra sair igual você — atenção nisso:</h3>
      </div>
      <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
        {tips.map((t) => {
          const Icon = t.icon;
          return (
            <div key={t.title} className="flex items-start gap-2.5">
              <div className="w-7 h-7 rounded-lg bg-[var(--background-elev-2)] flex items-center justify-center shrink-0">
                <Icon className="w-3.5 h-3.5 text-[var(--primary)]" />
              </div>
              <div className="flex-1 min-w-0">
                <div className="text-sm font-semibold">{t.title}</div>
                <div className="text-xs text-[var(--muted)] leading-snug">{t.desc}</div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function SectionHeader({
  num,
  title,
  subtitle,
}: {
  num: number;
  title: string;
  subtitle: string;
}) {
  return (
    <div className="flex items-start gap-3 mb-5">
      <div className="w-8 h-8 shrink-0 rounded-lg bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-bold text-sm">
        {num}
      </div>
      <div>
        <h2 className="text-lg md:text-xl font-bold">{title}</h2>
        <p className="text-sm text-[var(--muted)]">{subtitle}</p>
      </div>
    </div>
  );
}
