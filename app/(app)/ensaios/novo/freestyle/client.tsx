"use client";

/**
 * Story 06 — Modo avançado (freestyle).
 * Layout premium tipo "Ruixen AI": título central grande + caixa glassmorphism
 * + quick actions em pills. Smokey bg de fundo.
 */

import { useState, useRef, useEffect, useCallback } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import {
  ArrowLeft,
  Sparkles,
  AlertTriangle,
  Zap,
  Gem,
  Paperclip,
  ArrowUp,
  X,
  Camera,
  Palette,
  Crown,
  Heart,
  Flower2,
  Cake,
  Image as ImageIcon,
} from "lucide-react";
import { SmokeyBackground } from "@/components/auth/SmokeyBackground";

const MIN_CHARS = 20;
const MAX_CHARS = 2000; // antes era 500 — prompts descritivos precisam espaço
const MAX_REFS = 8;
const MIN_HEIGHT = 56;
const MAX_HEIGHT = 240;

type Tier = "fast" | "detailed";
const TIER_COST: Record<Tier, number> = { fast: 1, detailed: 4 };

const QUICK_EXAMPLES: Array<{ icon: React.ReactNode; label: string; prompt: string }> = [
  {
    icon: <Cake className="w-3.5 h-3.5" />,
    label: "Aniversário luxo",
    prompt:
      "Ensaio aniversário de luxo em studio, vestido preto longo elegante, balões dourados e pretos, bolo sofisticado branco com detalhes dourados, iluminação profissional estilo editorial.",
  },
  {
    icon: <Heart className="w-3.5 h-3.5" />,
    label: "Quarto romântico",
    prompt:
      "Ensaio romântico em quarto branco com cama de lençol branco, robe de seda rosé, balões rose gold, luz natural suave pela janela, tom intimista delicado.",
  },
  {
    icon: <Flower2 className="w-3.5 h-3.5" />,
    label: "Jardim florido",
    prompt:
      "Ensaio outdoor em jardim florido ao amanhecer, vestido branco longo esvoaçante, luz dourada atravessando as árvores, estilo fine art com bokeh suave.",
  },
  {
    icon: <Crown className="w-3.5 h-3.5" />,
    label: "Princesa infantil",
    prompt:
      "Ensaio infantil estilo princesa, vestido azul claro com tulle e detalhes brilhantes, balões prata e pastéis, cenário de studio cream, luz suave e flattering.",
  },
  {
    icon: <Camera className="w-3.5 h-3.5" />,
    label: "Retrato corporativo",
    prompt:
      "Retrato corporativo feminino profissional, blazer bege neutro, fundo cinza claro de studio, iluminação soft box, expressão confiante e acessível.",
  },
  {
    icon: <Palette className="w-3.5 h-3.5" />,
    label: "Editorial colorido",
    prompt:
      "Ensaio editorial com fundo colorido vibrante, vestido de festa com sequins, pose dinâmica, iluminação dramática com contraste forte estilo revista de moda.",
  },
];

function useAutoResize(minHeight: number, maxHeight: number) {
  const ref = useRef<HTMLTextAreaElement>(null);
  const adjust = useCallback(() => {
    const ta = ref.current;
    if (!ta) return;
    ta.style.height = `${minHeight}px`;
    const newH = Math.max(minHeight, Math.min(ta.scrollHeight, maxHeight));
    ta.style.height = `${newH}px`;
  }, [minHeight, maxHeight]);
  useEffect(() => {
    if (ref.current) ref.current.style.height = `${minHeight}px`;
  }, [minHeight]);
  return { ref, adjust };
}

export function FreestyleClient({
  credits,
  detailedEnabled = false,
}: {
  credits: number;
  detailedEnabled?: boolean;
}) {
  const router = useRouter();
  const [prompt, setPrompt] = useState("");
  const [refs, setRefs] = useState<File[]>([]);
  const [tier, setTier] = useState<Tier>("fast");
  const [submitting, setSubmitting] = useState(false);
  const [warnedOnce, setWarnedOnce] = useState(false);
  const { ref: textareaRef, adjust } = useAutoResize(MIN_HEIGHT, MAX_HEIGHT);
  const fileRef = useRef<HTMLInputElement>(null);

  const promptOk = prompt.trim().length >= MIN_CHARS;
  const refsOk = refs.length >= 1;
  const cost = TIER_COST[tier];
  const enoughCredits = credits >= cost;
  const canSubmit = promptOk && refsOk && enoughCredits && !submitting;

  function handleRefs(e: React.ChangeEvent<HTMLInputElement>) {
    const files = Array.from(e.target.files ?? []);
    const valid = files.filter((f) => f.type.startsWith("image/")).slice(0, MAX_REFS);
    setRefs((prev) => [...prev, ...valid].slice(0, MAX_REFS));
    if (e.target) e.target.value = "";
  }

  function removeRef(idx: number) {
    setRefs((prev) => prev.filter((_, i) => i !== idx));
  }

  /** Mapeia erros técnicos → mensagem amigável pro user (princípio §1.bis do PRD). */
  function humanizeError(raw: string): string {
    const s = (raw ?? "").toLowerCase();
    if (s.includes("openai_api_key missing")) return "Modo Detalhado temporariamente indisponível. Use o modo Rápido.";
    if (s.includes("payment required") || s.includes("insufficient credit") || s.includes("402"))
      return "Serviço sobrecarregado agora. Tente novamente em alguns minutos.";
    if (s.includes("quota") || s.includes("resource_exhausted") || s.includes("rate limit"))
      return "Limite de geração atingido. Aguarde um instante e tente de novo.";
    if (s.includes("timeout") || s.includes("deadline")) return "Demorou demais pra responder. Tente novamente.";
    if (s.includes("safety") || s.includes("blocked") || s.includes("moderation"))
      return "Conteúdo bloqueado por segurança. Reescreva o pedido.";
    // Mensagens já específicas vindas do backend (filtro infantil, prompt longo, etc) — passa direto
    if (
      s.includes("filtro de proteção") ||
      s.includes("filtro de conteúdo") ||
      s.includes("celebridades") ||
      s.includes("marca registrada") ||
      s.includes("prompt longo") ||
      s.includes("prompt muito") ||
      s.includes("não pode ser gerado") ||
      s.includes("nao pode ser gerado")
    ) {
      return raw;
    }
    if (s.includes("limite diário") || s.includes("limite diario"))
      return "Você atingiu o limite diário do modo avançado (5 ensaios). Tente amanhã.";
    if (s.includes("network") || s.includes("fetch failed")) return "Falha de rede. Verifique sua conexão.";
    if (s.includes("créditos insuficientes")) return "Créditos insuficientes.";
    return "Não foi possível gerar agora. Tente novamente.";
  }

  /** Checa se prompt parece vago (pouca descrição visual). Retorna aviso ou null.
   *  Aceita PT-BR e EN — prompts longos em inglês (templates avançados) são válidos. */
  function promptVaguenessHint(p: string): string | null {
    const lower = p.toLowerCase();
    const words = lower.split(/\s+/).filter((w) => w.length > 2);
    const hasVisualKeywords =
      /\b(vestido|camis|blusa|terno|blazer|saia|calça|short|sapato|tenis|jeans|seda|cetim|tule|renda|linho|algodão|malha|chiffon|veludo)\b/.test(lower) ||
      /\b(studio|quarto|praia|jardim|parque|cafe|rua|cozinha|sala|escritório|outdoor|indoor)\b/.test(lower) ||
      /\b(iluminação|luz|natural|dourada|quente|fria|sombra|dramática|editorial|cinematográfica|bokeh)\b/.test(lower) ||
      /\b(rosa|vermelho|preto|branco|azul|verde|dourado|prata|bege|nude|champagne)\b/.test(lower) ||
      /\b(dress|shirt|jacket|suit|blazer|skirt|pants|shorts|shoes|sneakers|jeans|silk|satin|tulle|lace|linen|cotton|velvet|gown|outfit)\b/.test(lower) ||
      /\b(studio|bedroom|beach|garden|park|cafe|street|kitchen|stage|office|outdoor|indoor|background|backdrop|setting|scene|stage)\b/.test(lower) ||
      /\b(lighting|light|natural|golden|warm|cool|shadow|dramatic|editorial|cinematic|cinematographic|bokeh|softbox|rim|key|fill)\b/.test(lower) ||
      /\b(pink|red|black|white|blue|green|gold|silver|beige|nude|champagne|neon|magenta|purple|teal)\b/.test(lower) ||
      /\b(portrait|photo|photography|ultra-realistic|8k|4k|dslr|prime lens|85mm)\b/.test(lower);

    if (words.length < 5) return "Descreva com mais detalhe: roupa, cenário e iluminação.";
    if (!hasVisualKeywords && words.length < 25)
      return "Inclua detalhes visuais: roupa, cor, cenário, luz.";
    return null;
  }

  async function submit() {
    if (!canSubmit) return;

    // Sanity check client-side — avisa no 1º clique, gera no 2º.
    // Evita gastar crédito em prompt vago, mas não bloqueia quem sabe o que faz.
    const hint = promptVaguenessHint(prompt.trim());
    if (hint && !warnedOnce) {
      toast.warning(`${hint} (Clique em gerar de novo se quiser continuar mesmo assim.)`, {
        duration: 6000,
      });
      setWarnedOnce(true);
      return;
    }

    setSubmitting(true);
    try {
      const fd = new FormData();
      fd.append("source", "freestyle");
      fd.append("freestyle_text", prompt.trim());
      fd.append("pessoas_count", "1");
      fd.append("generation_tier", tier);
      for (const f of refs) fd.append("photos_0", f);
      const res = await fetch("/api/generate", { method: "POST", body: fd });
      const data = await res.json();
      if (!res.ok) {
        toast.error(humanizeError(data.error ?? ""));
        return;
      }
      toast.success("Pronto! Suas fotos estão sendo geradas.");
      router.push(`/ensaios/${data.ensaio_id}`);
    } catch {
      toast.error("Erro inesperado. Tente novamente.");
    } finally {
      setSubmitting(false);
    }
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden">
      <SmokeyBackground />

      <div className="relative z-10 w-full h-full flex flex-col items-center overflow-y-auto">
        <Link
          href="/ensaios/novo"
          className="absolute top-5 left-5 inline-flex items-center gap-1.5 text-sm text-white/80 hover:text-white z-20"
        >
          <ArrowLeft className="w-4 h-4" /> Voltar
        </Link>

        <div className="absolute top-5 right-5 z-20 flex items-center gap-2">
          <div className="flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-xs text-white">
            <Sparkles className="w-3 h-3 text-[var(--primary)]" />
            <strong>{credits}</strong> créditos
          </div>
        </div>

        {/* Título central grande */}
        <div className="flex-1 w-full flex flex-col items-center justify-center min-h-[40vh] py-10 px-4">
          <div className="text-center max-w-3xl">
            <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-white/20 bg-white/5 backdrop-blur-md text-xs text-white/80 mb-5">
              <span className="w-1.5 h-1.5 rounded-full bg-[var(--primary)] animate-pulse" />
              Modo Avançado · Experimental
            </div>
            <h1 className="text-5xl md:text-7xl font-bold text-white drop-shadow-sm tracking-tight">
              Ensa<span className="text-[var(--primary)]">.IA</span>
            </h1>
            <p className="mt-4 text-base md:text-lg text-white/70">
              Descreva o ensaio dos seus sonhos — a IA faz o resto.
            </p>
          </div>
        </div>

        {/* Caixa de input no meio-baixo */}
        <div className="w-full max-w-3xl px-4 pb-20 md:pb-[15vh] space-y-4">
          <div className="relative bg-black/50 backdrop-blur-xl rounded-2xl border border-white/15 shadow-2xl overflow-hidden">
            <textarea
              ref={textareaRef}
              value={prompt}
              onChange={(e) => {
                setPrompt(e.target.value.slice(0, MAX_CHARS));
                if (warnedOnce) setWarnedOnce(false);
                adjust();
              }}
              placeholder="Ex: Mulher tomando café numa janela ensolarada de Paris, blusa branca, luz dourada da manhã, estilo editorial cinematográfico..."
              className="w-full px-5 pt-4 pb-2 bg-transparent text-white text-sm resize-none focus:outline-none placeholder:text-white/40"
              style={{ minHeight: MIN_HEIGHT, overflow: "hidden" }}
            />

            {refs.length > 0 && (
              <div className="px-5 py-2 flex flex-wrap gap-2 border-t border-white/10">
                {refs.map((f, i) => (
                  <div
                    key={i}
                    className="group relative flex items-center gap-2 px-2.5 py-1 rounded-lg bg-white/10 text-xs text-white border border-white/15"
                  >
                    <ImageIcon className="w-3 h-3 text-[var(--primary)]" />
                    <span className="max-w-[140px] truncate">{f.name}</span>
                    <button
                      type="button"
                      onClick={() => removeRef(i)}
                      className="opacity-60 group-hover:opacity-100 hover:text-[var(--danger)]"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  </div>
                ))}
              </div>
            )}

            <div className="flex items-center justify-between px-3 py-2 border-t border-white/10">
              <div className="flex items-center gap-1">
                <input
                  ref={fileRef}
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleRefs}
                  className="hidden"
                />
                <button
                  type="button"
                  onClick={() => fileRef.current?.click()}
                  title="Adicionar foto de referência"
                  className="p-2 rounded-lg hover:bg-white/10 text-white/70 hover:text-white transition"
                >
                  <Paperclip className="w-4 h-4" />
                </button>
                <span className="text-xs text-white/50 ml-1">
                  {refs.length > 0
                    ? `${refs.length} foto${refs.length > 1 ? "s" : ""}`
                    : "Suas fotos"}
                </span>
              </div>

              <div className="flex items-center gap-3">
                {/* Tier inline — só mostra "Detalhado" se backend tem OpenAI configurado */}
                <div className="flex items-center gap-1 text-xs">
                  <button
                    type="button"
                    onClick={() => setTier("fast")}
                    className={`px-2.5 py-1 rounded-md transition ${
                      tier === "fast"
                        ? "bg-[var(--primary)] text-white"
                        : "text-white/60 hover:text-white"
                    }`}
                    title="Rápido — 1 crédito. Ótima fidelidade na maioria dos casos."
                  >
                    <Zap className="w-3 h-3 inline mr-1" /> Rápido
                  </button>
                  {detailedEnabled && (
                    <button
                      type="button"
                      onClick={() => setTier("detailed")}
                      className={`px-2.5 py-1 rounded-md transition ${
                        tier === "detailed"
                          ? "bg-[var(--accent)] text-white"
                          : "text-white/60 hover:text-white"
                      }`}
                      title="Detalhado — 4 créditos. Modelo premium com mais detalhe facial."
                    >
                      <Gem className="w-3 h-3 inline mr-1" /> Detalhado
                    </button>
                  )}
                </div>

                <span
                  className={`text-xs ${
                    prompt.length > MAX_CHARS - 100
                      ? "text-amber-400"
                      : "text-white/40"
                  }`}
                >
                  {prompt.length}/{MAX_CHARS}
                </span>

                <button
                  type="button"
                  onClick={submit}
                  disabled={!canSubmit}
                  className="p-2 rounded-lg bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white disabled:opacity-30 disabled:cursor-not-allowed transition"
                  title={
                    !promptOk
                      ? `Escreva mínimo ${MIN_CHARS} caracteres`
                      : !refsOk
                        ? "Envie ao menos 1 foto"
                        : !enoughCredits
                          ? "Créditos insuficientes"
                          : `Gerar (${cost} crédito${cost > 1 ? "s" : ""})`
                  }
                >
                  {submitting ? (
                    <Sparkles className="w-4 h-4 animate-pulse" />
                  ) : (
                    <ArrowUp className="w-4 h-4" />
                  )}
                </button>
              </div>
            </div>
          </div>

          {!enoughCredits && (
            <div className="flex items-center gap-2 p-3 rounded-xl border border-red-500/40 bg-red-500/10 text-sm text-white/90">
              <AlertTriangle className="w-4 h-4 text-red-400 shrink-0" />
              <span>
                Saldo insuficiente. Esse ensaio custa {cost} crédito{cost > 1 ? "s" : ""}.{" "}
                <Link href="/planos" className="text-[var(--primary)] underline">
                  Comprar créditos
                </Link>
              </span>
            </div>
          )}

          {/* Quick actions em pills */}
          <div className="flex items-center justify-center flex-wrap gap-2 pt-2">
            {QUICK_EXAMPLES.map((q) => (
              <button
                key={q.label}
                type="button"
                onClick={() => {
                  setPrompt(q.prompt);
                  setTimeout(adjust, 0);
                }}
                className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full border border-white/15 bg-white/5 backdrop-blur-md text-xs text-white/80 hover:text-white hover:border-[var(--primary)]/60 hover:bg-white/10 transition"
              >
                {q.icon}
                {q.label}
              </button>
            ))}
          </div>

          <p className="text-[11px] text-white/40 text-center pt-2">
            Algumas palavras podem ser bloqueadas por segurança. Em caso de bloqueio, nenhum
            crédito é cobrado.
          </p>
        </div>
      </div>
    </div>
  );
}
