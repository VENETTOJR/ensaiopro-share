"use client";

import { useState } from "react";
import { toast } from "sonner";
import { Check, Sparkles, Loader2, Zap, Crown, Gift } from "lucide-react";
import { cn } from "@/lib/utils";

interface Plan {
  id: string;
  slug: string;
  name: string;
  quantidade: number;
  preco_cents: number;
  popular: boolean;
  preco_formatted: string;
  per_photo: string;
}

interface Profile {
  name: string | null;
  email: string | null;
  phone: string | null;
  document: string | null;
  photo_credits: number;
}

const PLAN_ICON: Record<string, typeof Gift> = {
  entrada: Gift,
  intermediario: Zap,
  popular: Crown,
};

export function PlanosClient({
  plans,
  profile,
}: {
  plans: Plan[];
  profile: Profile;
}) {
  const [loading, setLoading] = useState<string | null>(null);

  async function buy(plan: Plan) {
    setLoading(plan.id);
    try {
      const res = await fetch("/api/checkout", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ planId: plan.id }),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "Falha no checkout");
      window.location.href = data.checkoutUrl;
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "Erro ao iniciar checkout");
      setLoading(null);
    }
  }

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 fade-in">
      <div className="text-center mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-3">
          Escolha seu <span className="text-gradient">pacote</span>
        </h1>
        <p className="text-[var(--muted)] max-w-xl mx-auto">
          Quanto mais fotos, mais barato fica cada uma. Pague com Pix (instantâneo) ou cartão.
        </p>
        <div className="inline-flex items-center gap-2 mt-4 text-xs px-3 py-1.5 rounded-full bg-[var(--background-elev)] border border-[var(--border)]">
          <Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />
          Saldo atual: <span className="font-semibold text-[var(--foreground)]">{profile.photo_credits}</span> créditos
        </div>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {plans.map((p) => {
          const Icon = PLAN_ICON[p.slug] ?? Gift;
          const isPopular = p.popular;
          return (
            <div
              key={p.id}
              className={cn(
                "card relative flex flex-col transition",
                isPopular
                  ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/30 md:scale-105"
                  : "hover:border-[var(--border-strong)]"
              )}
            >
              {isPopular && (
                <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white">
                  MAIS POPULAR
                </div>
              )}

              <div className="flex items-center gap-2 mb-3">
                <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent)]/20 flex items-center justify-center">
                  <Icon className="w-5 h-5 text-[var(--primary)]" />
                </div>
                <div>
                  <div className="text-xs text-[var(--muted)] uppercase tracking-wider">Pacote</div>
                  <div className="font-semibold">{p.name}</div>
                </div>
              </div>

              <div className="my-4">
                <div className="text-4xl font-bold">{p.preco_formatted}</div>
                <div className="text-sm text-[var(--muted)] mt-1">
                  {p.per_photo} por foto
                </div>
              </div>

              <ul className="space-y-2 mb-6 text-sm flex-1">
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                  <span>{p.quantidade} créditos de fotos</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                  <span>Todos os 26 tipos de ensaio</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                  <span>Download em alta resolução</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                  <span>Créditos sem vencimento</span>
                </li>
                <li className="flex items-start gap-2">
                  <Check className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
                  <span>Pix ou cartão (parcele em 12x)</span>
                </li>
              </ul>

              <button
                onClick={() => buy(p)}
                disabled={loading !== null}
                className={cn("btn btn-lg", isPopular ? "btn-primary" : "btn-secondary")}
              >
                {loading === p.id ? (
                  <Loader2 className="w-4 h-4 animate-spin" />
                ) : (
                  "Comprar agora"
                )}
              </button>
            </div>
          );
        })}
      </div>

      <div className="mt-8 card bg-[var(--background-elev)]/50 text-center">
        <div className="text-sm text-[var(--muted)]">
          🔒 Pagamento processado com segurança. Seus créditos são liberados automaticamente após confirmação.
        </div>
      </div>
    </div>
  );
}
