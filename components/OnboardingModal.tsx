"use client";

import { useEffect, useState } from "react";
import { X, Sparkles, Camera, Wand2, Image as ImageIcon, ArrowRight } from "lucide-react";

/**
 * Modal de boas-vindas — aparece APENAS pra user sem nenhum ensaio ainda.
 * Dismiss salvo em localStorage pra não reaparecer.
 */

const STORAGE_KEY = "ensaiopro:onboarding:dismissed";

export function OnboardingModal({
  show,
  credits,
}: {
  show: boolean;
  credits: number;
}) {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (!show) return;
    if (typeof window === "undefined") return;
    const dismissed = localStorage.getItem(STORAGE_KEY) === "1";
    if (!dismissed) setVisible(true);
  }, [show]);

  function close() {
    setVisible(false);
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {}
  }

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm"
      onClick={close}
    >
      <div
        className="card max-w-lg w-full relative overflow-hidden"
        onClick={(e) => e.stopPropagation()}
      >
        {/* Glow rosa no topo */}
        <div
          className="absolute -top-24 -left-24 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(217,70,239,0.25), transparent 60%)",
          }}
        />
        <div
          className="absolute -bottom-24 -right-24 w-64 h-64 rounded-full pointer-events-none"
          style={{
            background:
              "radial-gradient(circle, rgba(244,114,182,0.2), transparent 60%)",
          }}
        />

        <button
          onClick={close}
          className="absolute top-4 right-4 p-1.5 rounded-lg hover:bg-[var(--background-elev-2)] text-[var(--muted)] transition z-10"
          aria-label="Fechar"
        >
          <X className="w-4 h-4" />
        </button>

        <div className="relative">
          <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-[var(--primary)]/15 border border-[var(--primary)]/30 text-xs font-semibold text-[var(--primary)] mb-4">
            <Sparkles className="w-3 h-3" />
            Bem-vindo ao EnsaioPro!
          </div>
          <h2 className="text-2xl font-bold mb-2">
            Seu primeiro ensaio em <span className="text-gradient">3 passos</span>
          </h2>
          <p className="text-sm text-[var(--muted)] mb-6">
            {credits > 0 ? (
              <>
                Você tem <strong className="text-[var(--foreground)]">{credits} créditos</strong>{" "}
                pra começar agora mesmo.
              </>
            ) : (
              <>Compre seus primeiros créditos e crie em minutos.</>
            )}
          </p>

          <div className="space-y-3 mb-6">
            <Step
              num={1}
              icon={Camera}
              title="Escolha um tipo"
              desc="Aniversário, corporativo, infantil, praia, gestante e mais 40 tipos."
            />
            <Step
              num={2}
              icon={ImageIcon}
              title="Envie 3 a 5 fotos suas"
              desc="Rosto grande, luz natural, sem filtro. Funciona melhor com cara nítida."
            />
            <Step
              num={3}
              icon={Wand2}
              title="Gere em 5 minutos"
              desc="A IA faz o resto. Você recebe dezenas de fotos prontas pra download."
            />
          </div>

          <button
            onClick={close}
            className="btn btn-primary w-full btn-lg group"
          >
            <Sparkles className="w-4 h-4" />
            Vamos começar
            <ArrowRight className="w-4 h-4 group-hover:translate-x-1 transition-transform" />
          </button>

          <p className="text-[11px] text-center text-[var(--muted)] mt-3">
            Você vê essa mensagem só uma vez.
          </p>
        </div>
      </div>
    </div>
  );
}

function Step({
  num,
  icon: Icon,
  title,
  desc,
}: {
  num: number;
  icon: typeof Camera;
  title: string;
  desc: string;
}) {
  return (
    <div className="flex items-start gap-3 p-3 rounded-xl bg-[var(--background-elev-2)]">
      <div className="shrink-0 w-8 h-8 rounded-lg bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center text-sm font-bold">
        {num}
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-1.5 text-sm font-semibold">
          <Icon className="w-3.5 h-3.5 text-[var(--primary)]" />
          {title}
        </div>
        <div className="text-xs text-[var(--muted)] mt-0.5">{desc}</div>
      </div>
    </div>
  );
}
