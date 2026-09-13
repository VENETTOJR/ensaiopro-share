"use client";

/**
 * Página de sucesso pós-Plynx. Faz polling do saldo até o webhook confirmar.
 * Se créditos não subirem em 60s, mostra CTA "contatar suporte".
 */

import { useEffect, useState } from "react";
import Link from "next/link";
import { CheckCircle2, Sparkles, ArrowRight, Loader2, Clock, MessageCircle } from "lucide-react";
import { createClient } from "@/lib/supabase/client";

export function SucessoClient() {
  const [credits, setCredits] = useState<number | null>(null);
  const [initialCredits, setInitialCredits] = useState<number | null>(null);
  const [secondsElapsed, setSecondsElapsed] = useState(0);
  const [creditsArrived, setCreditsArrived] = useState(false);

  useEffect(() => {
    let cancelled = false;
    const supabase = createClient();

    async function tick() {
      if (cancelled) return;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (!user) return;
      const { data } = await supabase
        .from("profiles")
        .select("photo_credits")
        .eq("id", user.id)
        .single();
      if (!data) return;
      if (initialCredits === null) {
        setInitialCredits(data.photo_credits);
      } else if (data.photo_credits > initialCredits) {
        setCreditsArrived(true);
      }
      setCredits(data.photo_credits);
    }

    tick();
    const iv = setInterval(() => {
      setSecondsElapsed((s) => s + 1);
      tick();
    }, 3000);

    return () => {
      cancelled = true;
      clearInterval(iv);
    };
  }, [initialCredits]);

  const showTimeout = secondsElapsed > 20 && !creditsArrived;

  return (
    <div className="min-h-[70vh] flex items-center justify-center px-4 py-10">
      <div className="card max-w-md w-full text-center">
        <div className="w-16 h-16 mx-auto rounded-full bg-[var(--success)]/15 flex items-center justify-center mb-4">
          {creditsArrived ? (
            <CheckCircle2 className="w-8 h-8 text-[var(--success)]" />
          ) : (
            <Loader2 className="w-8 h-8 text-[var(--primary)] animate-spin" />
          )}
        </div>

        <h1 className="text-2xl font-bold mb-2">
          {creditsArrived ? "Pagamento confirmado!" : "Processando pagamento..."}
        </h1>
        <p className="text-sm text-[var(--muted)] mb-6">
          {creditsArrived
            ? "Seus créditos foram liberados. Aproveite!"
            : "Aguardando confirmação do sistema. Isso leva alguns segundos."}
        </p>

        <div className="p-4 rounded-xl bg-[var(--background-elev-2)] mb-6">
          <div className="flex items-center justify-between text-sm mb-2">
            <span className="text-[var(--muted)]">Saldo atual</span>
            <span className="flex items-center gap-1.5 font-semibold text-lg">
              <Sparkles className="w-4 h-4 text-[var(--primary)]" />
              {credits ?? "..."} créditos
            </span>
          </div>
          {initialCredits !== null && credits !== null && credits > initialCredits && (
            <div className="text-xs text-[var(--success)] font-medium">
              +{credits - initialCredits} adicionados
            </div>
          )}
        </div>

        {showTimeout && !creditsArrived && (
          <div className="p-3 rounded-lg border border-amber-500/30 bg-amber-500/5 mb-4 text-left">
            <div className="flex items-center gap-2 text-sm text-amber-400 font-medium mb-1">
              <Clock className="w-4 h-4" />
              Demorando mais que o normal
            </div>
            <p className="text-xs text-[var(--muted)] mb-2">
              Se o pagamento foi aprovado mas os créditos não aparecerem em 5 min,
              nos avise.
            </p>
            <a
              href="https://wa.me/5524981411957?text=Paguei%20mas%20os%20cr%C3%A9ditos%20n%C3%A3o%20apareceram"
              target="_blank"
              rel="noopener noreferrer"
              className="inline-flex items-center gap-1.5 text-xs text-[var(--primary)] hover:underline"
            >
              <MessageCircle className="w-3 h-3" /> Falar no WhatsApp
            </a>
          </div>
        )}

        <div className="flex flex-col gap-2">
          <Link href="/dashboard" className="btn btn-primary w-full">
            Ir para o dashboard <ArrowRight className="w-4 h-4" />
          </Link>
          <Link href="/ensaios/novo" className="btn btn-ghost w-full">
            Criar meu ensaio
          </Link>
        </div>
      </div>
    </div>
  );
}
