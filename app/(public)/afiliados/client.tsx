"use client";

import { useState } from "react";
import Link from "next/link";
import {
  ArrowLeft,
  Copy,
  Check,
  ExternalLink,
  CheckCircle2,
  AlertTriangle,
  Sparkles,
} from "lucide-react";
import { toast } from "sonner";
import type { AffiliateInfo } from "@/lib/plynx/affiliate";

function formatBRL(cents: number): string {
  return (cents / 100).toLocaleString("pt-BR", {
    style: "currency",
    currency: "BRL",
  });
}

function commissionAmount(
  priceCents: number,
  type: "percent" | "fixed",
  value: number
): number {
  if (type === "percent") return Math.round((priceCents * value) / 100);
  return Math.round(value * 100);
}

interface Props {
  affiliate: AffiliateInfo;
  baseUrl: string;
}

export function AfiliadoDashboard({ affiliate, baseUrl }: Props) {
  const [copiedSlug, setCopiedSlug] = useState<string | null>(null);

  const activeProducts = affiliate.products.filter((p) => p.active);
  // Slug curto unificado entre os 3 produtos EnsaioPro (8 chars tipo "acbfb98b").
  const primaryLink = affiliate.unified_slug
    ? `${baseUrl}/?ref=${affiliate.unified_slug}`
    : null;

  const kycPending =
    affiliate.kyc_status !== "approved" && affiliate.kyc_status !== null;

  async function copy(text: string, slug: string) {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedSlug(slug);
      toast.success("Link copiado!");
      setTimeout(() => setCopiedSlug(null), 2000);
    } catch {
      toast.error("Falha ao copiar");
    }
  }

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 fade-in">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <section className="text-center mb-10">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--success)]/30 bg-[var(--success)]/10 text-xs text-[var(--success)] font-medium mb-4">
          <CheckCircle2 className="w-3.5 h-3.5" /> Você é afiliado oficial
        </div>
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          Bem-vindo ao <span className="text-gradient">programa de afiliados</span>
        </h1>
        <p className="text-[var(--muted)]">
          Compartilhe seu link e ganhe comissão a cada venda
        </p>
      </section>

      {kycPending && (
        <div className="card mb-6 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Complete seus dados bancários</h3>
              <p className="text-sm text-[var(--muted)] mb-2">
                Você já tá ativo mas ainda precisa concluir o KYC do Pagar.me pra
                receber as comissões via PIX.
              </p>
              <a
                href="https://plynxpay.com/dashboard/afiliados/conta-bancaria"
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-amber-400 font-medium inline-flex items-center gap-1 hover:underline"
              >
                Concluir cadastro <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {primaryLink && (
        <section className="card mb-6">
          <div className="flex items-center gap-2 mb-2">
            <Sparkles className="w-4 h-4 text-[var(--primary)]" />
            <h2 className="font-semibold">Seu link principal</h2>
          </div>
          <p className="text-xs text-[var(--muted)] mb-4">
            Esse link funciona pra qualquer plano — o cliente escolhe lá dentro
            e a comissão é tua.
          </p>
          <div className="flex flex-col sm:flex-row gap-2">
            <input
              readOnly
              value={primaryLink}
              className="flex-1 px-4 py-3 rounded-xl bg-[var(--background-elev-2)] border border-[var(--border)] text-sm font-mono"
              onFocus={(e) => e.currentTarget.select()}
            />
            <button
              onClick={() => copy(primaryLink, "main")}
              className="btn btn-primary inline-flex items-center justify-center gap-2 px-5"
            >
              {copiedSlug === "main" ? (
                <>
                  <Check className="w-4 h-4" /> Copiado
                </>
              ) : (
                <>
                  <Copy className="w-4 h-4" /> Copiar
                </>
              )}
            </button>
          </div>
          <div className="flex items-center gap-2 mt-3 text-xs text-[var(--muted)]">
            <span>Seu código:</span>
            <code className="px-2 py-0.5 rounded bg-[var(--background-elev-2)] text-[var(--foreground)] font-mono">
              {affiliate.unified_slug}
            </code>
          </div>
          <p className="text-xs text-[var(--muted)] mt-2">
            Vale pra <strong>todos os planos</strong> — o cliente escolhe lá
            dentro e a comissão é tua independente do plano comprado.
          </p>
        </section>
      )}

      <section className="card mb-6">
        <h2 className="font-semibold mb-1">Quanto você ganha por plano</h2>
        <p className="text-xs text-[var(--muted)] mb-4">
          O link acima vale pra todos. A comissão é calculada de acordo com o
          plano que o cliente escolher:
        </p>
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--background-elev-2)]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Plano</th>
                <th className="text-left px-4 py-3 font-semibold">Preço</th>
                <th className="text-left px-4 py-3 font-semibold">Comissão</th>
                <th className="text-right px-4 py-3 font-semibold">
                  Você ganha
                </th>
              </tr>
            </thead>
            <tbody>
              {activeProducts.map((p) => {
                const commValue = commissionAmount(
                  p.product_price_cents,
                  p.commission_type,
                  p.commission_value
                );
                return (
                  <tr
                    key={p.product_id}
                    className="border-t border-[var(--border)]"
                  >
                    <td className="px-4 py-3">{p.product_name}</td>
                    <td className="px-4 py-3">
                      {formatBRL(p.product_price_cents)}
                    </td>
                    <td className="px-4 py-3">
                      {p.commission_type === "percent"
                        ? `${p.commission_value}%`
                        : "fixo"}
                    </td>
                    <td className="px-4 py-3 text-right font-semibold text-[var(--success)]">
                      {formatBRL(commValue)}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </section>

      <section className="card mb-6">
        <h2 className="font-semibold mb-3">Acompanhe vendas e comissões</h2>
        <p className="text-sm text-[var(--muted)] mb-4">
          O dashboard completo (vendas em tempo real, comissões pagas, saldo)
          fica no painel do Plynx.
        </p>
        <a
          href="https://plynxpay.com/dashboard/affiliate-sales"
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary inline-flex items-center gap-2"
        >
          Abrir dashboard de vendas{" "}
          <ExternalLink className="w-4 h-4" />
        </a>
      </section>

      <section className="card">
        <h2 className="font-semibold mb-3">Dicas pra vender mais</h2>
        <ul className="space-y-2 text-sm text-[var(--muted)]">
          <li>
            • Mostra <strong>fotos antes/depois</strong> reais geradas no app —
            credibilidade vende
          </li>
          <li>
            • Foca no <strong>plano Entrada (R$47)</strong> — conversão maior, e
            quem volta a comprar conta como tua venda por 1 ano
          </li>
          <li>
            • Stories com bastidor &quot;como gerei essas fotos&quot; performam
            bem
          </li>
          <li>
            • Reposte os criativos oficiais com seu link — reuso autorizado
          </li>
        </ul>
      </section>
    </div>
  );
}
