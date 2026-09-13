import Link from "next/link";
import {
  ArrowLeft,
  Sparkles,
  CheckCircle2,
  Wallet,
  Share2,
  Clock,
  ArrowRight,
  AlertTriangle,
} from "lucide-react";
import { createClient } from "@/lib/supabase/server";
import { getAffiliateInfo } from "@/lib/plynx/affiliate";
import { AfiliadoDashboard } from "./client";

export const metadata = {
  title: "Programa de Afiliados — EnsaioPro",
  description:
    "Ganhe 30% de comissão recorrente indicando o EnsaioPro. Pagamento direto na sua conta via Pagar.me.",
};

export const dynamic = "force-dynamic";

const PLYNX_AFFILIATE_URL =
  "https://plynxpay.com/afiliado/produto/3edbb2cf-3d28-49a5-8d55-6d3bc2ec6aa4";

const planos = [
  { nome: "Entrada", preco: "R$ 47", fotos: 60, comissao: 14.1 },
  { nome: "Intermediário", preco: "R$ 97", fotos: 150, comissao: 29.1 },
  { nome: "Popular", preco: "R$ 147", fotos: 250, comissao: 44.1 },
];

export default async function AfiliadosPage() {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();

  const affiliate = user?.email ? await getAffiliateInfo(user.email) : null;
  const hasActiveProducts =
    affiliate?.products.some((p) => p.active) ?? false;

  if (hasActiveProducts && affiliate) {
    return (
      <AfiliadoDashboard
        affiliate={affiliate}
        baseUrl={process.env.NEXT_PUBLIC_APP_URL ?? "https://ensaiopro.site"}
      />
    );
  }

  const hasPendingRequest =
    affiliate && affiliate.products.length === 0 && affiliate.status === "active";

  return (
    <div className="max-w-4xl mx-auto px-4 md:px-8 py-10 fade-in">
      <Link
        href="/"
        className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-6"
      >
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <section className="text-center mb-12">
        <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--primary)]/30 bg-[var(--primary)]/10 text-xs text-[var(--primary)] font-medium mb-4">
          <Sparkles className="w-3.5 h-3.5" /> Programa de afiliados
        </div>
        <h1 className="text-4xl md:text-5xl font-bold mb-4">
          Ganhe <span className="text-gradient">30%</span> por venda indicada
        </h1>
        <p className="text-lg text-[var(--muted)] max-w-2xl mx-auto">
          Indique o EnsaioPro pra galera, receba comissão direto na sua conta no
          mesmo dia da venda. Sem letra miúda, sem espera de saque.
        </p>
      </section>

      {hasPendingRequest && (
        <div className="card mb-8 border-amber-500/30 bg-amber-500/5">
          <div className="flex items-start gap-3">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <h3 className="font-semibold mb-1">Sua solicitação está em análise</h3>
              <p className="text-sm text-[var(--muted)]">
                Você já tem conta no Plynx mas ainda não foi aprovado em nenhum
                produto do EnsaioPro. Se já solicitou, aguarde aprovação. Se ainda
                não solicitou, clique no botão abaixo.
              </p>
            </div>
          </div>
        </div>
      )}

      <section className="grid sm:grid-cols-3 gap-4 mb-12">
        <Step
          icon={<Share2 className="w-5 h-5" />}
          step="1"
          title="Solicite afiliação"
          text="Crie sua conta no Plynx (nosso parceiro de pagamento) e envie o pedido. Aprovamos manualmente em até 48h."
        />
        <Step
          icon={<CheckCircle2 className="w-5 h-5" />}
          step="2"
          title="Pegue seu link"
          text="Depois de aprovado, o link com seu código aparece aqui mesmo nesta página."
        />
        <Step
          icon={<Wallet className="w-5 h-5" />}
          step="3"
          title="Receba via PIX"
          text="A cada venda, sua comissão cai automaticamente na sua conta cadastrada — sem clicar em saque."
        />
      </section>

      <section className="card mb-12">
        <h2 className="text-2xl font-bold mb-2 text-center">Quanto você ganha</h2>
        <p className="text-sm text-[var(--muted)] text-center mb-6">
          Comissão de 30% sobre o valor pago, em qualquer plano:
        </p>
        <div className="overflow-hidden rounded-xl border border-[var(--border)]">
          <table className="w-full text-sm">
            <thead className="bg-[var(--background-elev-2)]">
              <tr>
                <th className="text-left px-4 py-3 font-semibold">Plano</th>
                <th className="text-left px-4 py-3 font-semibold">Preço</th>
                <th className="text-left px-4 py-3 font-semibold">Fotos</th>
                <th className="text-right px-4 py-3 font-semibold">
                  Sua comissão
                </th>
              </tr>
            </thead>
            <tbody>
              {planos.map((p) => (
                <tr key={p.nome} className="border-t border-[var(--border)]">
                  <td className="px-4 py-3">{p.nome}</td>
                  <td className="px-4 py-3">{p.preco}</td>
                  <td className="px-4 py-3">{p.fotos}</td>
                  <td className="px-4 py-3 text-right font-semibold text-[var(--success)]">
                    R$ {p.comissao.toFixed(2).replace(".", ",")}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        <p className="text-xs text-[var(--muted)] text-center mt-4">
          <Clock className="inline w-3.5 h-3.5 mr-1" />
          Cookie de atribuição válido por 365 dias — quem clicar no seu link
          conta como sua venda durante 1 ano inteiro.
        </p>
      </section>

      <section className="text-center mb-12">
        <a
          href={PLYNX_AFFILIATE_URL}
          target="_blank"
          rel="noopener noreferrer"
          className="btn btn-primary inline-flex items-center gap-2 text-base px-6 py-3"
        >
          {hasPendingRequest
            ? "Ver minha solicitação no Plynx"
            : "Quero me afiliar"}{" "}
          <ArrowRight className="w-4 h-4" />
        </a>
        <p className="text-xs text-[var(--muted)] mt-3">
          {user?.email ? (
            <>
              Você está logado como <strong>{user.email}</strong>. Use o mesmo
              email no Plynx pra o link aparecer aqui automaticamente.
            </>
          ) : (
            <>Você vai ser redirecionado pro Plynx pra concluir o cadastro.</>
          )}
        </p>
      </section>

      <section className="space-y-4 mb-12">
        <h2 className="text-2xl font-bold text-center mb-6">
          Perguntas frequentes
        </h2>
        <Faq q="Preciso ter CNPJ?">
          Não. Pessoa física com PIX cadastrado já recebe.
        </Faq>
        <Faq q="Quando recebo a comissão?">
          No mesmo dia da venda. O pagamento já cai direto na sua conta via split
          do Pagar.me — você não precisa pedir saque.
        </Faq>
        <Faq q="A comissão vale só pra primeira compra?">
          Não. Toda venda que vier do seu link conta — até mesmo recompras de
          quem comprou pela sua indicação dentro de 365 dias.
        </Faq>
        <Faq q="Como sei se a venda foi minha?">
          Pelo dashboard do Plynx (plynxpay.com/dashboard) — você vê todas as
          vendas atribuídas a você em tempo real.
        </Faq>
        <Faq q="Posso me afiliar mesmo sendo cliente?">
          Pode. Quem usa o EnsaioPro vende melhor — recomendamos.
        </Faq>
      </section>
    </div>
  );
}

function Step({
  icon,
  step,
  title,
  text,
}: {
  icon: React.ReactNode;
  step: string;
  title: string;
  text: string;
}) {
  return (
    <div className="card text-center">
      <div className="w-10 h-10 mx-auto rounded-full bg-[var(--primary)]/15 text-[var(--primary)] flex items-center justify-center mb-3">
        {icon}
      </div>
      <div className="text-xs text-[var(--muted)] mb-1">Passo {step}</div>
      <h3 className="font-semibold mb-2">{title}</h3>
      <p className="text-sm text-[var(--muted)] leading-relaxed">{text}</p>
    </div>
  );
}

function Faq({ q, children }: { q: string; children: React.ReactNode }) {
  return (
    <details className="card group">
      <summary className="cursor-pointer font-semibold flex items-center justify-between list-none">
        {q}
        <ArrowRight className="w-4 h-4 text-[var(--muted)] group-open:rotate-90 transition-transform" />
      </summary>
      <p className="mt-3 text-sm text-[var(--muted)] leading-relaxed">
        {children}
      </p>
    </details>
  );
}
