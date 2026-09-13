import Link from "next/link";
import Image from "next/image";
import {
  Sparkles, Camera, Zap, ShieldCheck, Check, Clock, ImageIcon,
  CreditCard, ArrowRight, Star, Upload, Wand2, Download,
} from "lucide-react";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import { redirect } from "next/navigation";
import { GalaxyHero } from "@/components/landing/GalaxyHero";

const FEATURED_CATEGORIES = [
  "aniversario", "corporativo", "gestante", "bebe", "bebe-masc",
  "praia", "15anosestudio", "sensual", "familia",
];

export default async function LandingPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();
  if (user) redirect("/dashboard");

  // Pega fotos exemplo pra mostrar na landing (provas visuais)
  const admin = await createAdminClient();
  const { data: samples } = await admin
    .from("prompts")
    .select("example_image_url, categoria")
    .in("categoria", FEATURED_CATEGORIES)
    .not("example_image_url", "is", null)
    .eq("active", true)
    .limit(12);

  const showcaseImages = (samples ?? []).slice(0, 8);

  return (
    <main className="min-h-screen flex flex-col overflow-x-hidden bg-[var(--background)]">
      {/* GALAXY HERO SECTION — Spline 3D + navbar + hero à esquerda */}
      <GalaxyHero />

      {/* Resto da landing — conteúdo antigo preservado após hero galaxy */}
      <div style={{ marginTop: "-8vh" }} className="relative z-10 bg-[var(--background)]">

      {/* HERO extra — fallback centralizado abaixo do galaxy */}
      <section className="relative z-10 px-6 py-10 md:py-16 text-center max-w-5xl mx-auto w-full hidden">
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full border border-[var(--border)] bg-[var(--background-elev)] text-xs mb-6 fade-in">
          <span className="w-2 h-2 rounded-full bg-[var(--success)] animate-pulse" />
          IA de última geração · 40+ tipos de ensaio · Pix e cartão
        </div>

        <h1 className="text-4xl md:text-6xl font-bold tracking-tight mb-5 fade-in">
          Seu ensaio fotográfico{" "}
          <span className="text-gradient">profissional</span><br className="hidden md:inline"/>
          {" "}em 5 minutos
        </h1>
        <p className="text-lg md:text-xl text-[var(--muted-strong)] max-w-2xl mx-auto mb-8 fade-in">
          Envie <strong>4 a 10 fotos</strong> suas e receba <strong>dezenas de imagens prontas</strong> para
          Instagram, currículo ou impressão. Sem estúdio. Sem fotógrafo. Sem make.
        </p>

        <div className="flex flex-col sm:flex-row gap-3 justify-center mb-10 fade-in">
          <Link href="/cadastro" className="btn btn-primary btn-lg pulse-glow">
            <Sparkles className="w-4 h-4" />
            Criar meu primeiro ensaio
          </Link>
          <a href="#como-funciona" className="btn btn-secondary btn-lg">
            Ver como funciona
          </a>
        </div>

        <div className="flex items-center justify-center gap-6 text-sm text-[var(--muted)] flex-wrap">
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-[var(--success)]" /> Sem mensalidade
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-[var(--success)]" /> Pix instantâneo
          </div>
          <div className="flex items-center gap-1.5">
            <Check className="w-4 h-4 text-[var(--success)]" /> A partir de R$47
          </div>
        </div>
      </section>

      {/* SHOWCASE */}
      {showcaseImages.length > 0 && (
        <section className="px-6 py-8 max-w-6xl mx-auto w-full">
          <div className="grid grid-cols-2 md:grid-cols-4 gap-2 md:gap-3">
            {showcaseImages.map((s, i) => (
              <div
                key={i}
                className="relative aspect-[3/4] rounded-xl overflow-hidden bg-[var(--background-elev)]"
              >
                {s.example_image_url && (
                  <Image
                    src={s.example_image_url}
                    alt={`Exemplo ${s.categoria}`}
                    fill
                    className="object-cover"
                    sizes="(max-width: 768px) 50vw, 25vw"
                    unoptimized
                  />
                )}
                <div className="absolute inset-0 bg-gradient-to-t from-black/60 via-transparent to-transparent" />
              </div>
            ))}
          </div>
        </section>
      )}

      {/* COMO FUNCIONA */}
      <section id="como-funciona" className="px-6 py-14 max-w-5xl mx-auto w-full">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
          Em <span className="text-gradient">3 passos</span>
        </h2>
        <p className="text-center text-[var(--muted)] mb-10">
          Do celular pra galeria em minutos
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <StepCard
            num={1}
            icon={Upload}
            title="Envie suas fotos"
            desc="De 4 a 10 fotos suas com rosto visível. Qualquer celular serve. Aceitamos HEIC (iPhone)."
          />
          <StepCard
            num={2}
            icon={Wand2}
            title="Escolha os estilos"
            desc="40+ tipos: aniversário, gestante, corporativo, praia, lifestyle. Clica nos que curtiu."
          />
          <StepCard
            num={3}
            icon={Download}
            title="Baixe as fotos"
            desc="Em 2-5 min as imagens aparecem na sua galeria. Baixa individual ou tudo em zip."
          />
        </div>
      </section>

      {/* PLANOS */}
      <section className="px-6 py-14 max-w-5xl mx-auto w-full">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-3">
          Preços <span className="text-gradient">honestos</span>
        </h2>
        <p className="text-center text-[var(--muted)] mb-10">
          Pague só pelo que usar. Sem mensalidade. Créditos não expiram.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          <PlanCard
            name="Entrada"
            price="R$47"
            fotos={60}
            popular={false}
            features={[
              "60 fotos geradas",
              "Todos os 40+ estilos",
              "Pix ou cartão",
              "Download HD",
            ]}
          />
          <PlanCard
            name="Intermediário"
            price="R$97"
            fotos={150}
            popular={false}
            features={[
              "150 fotos geradas",
              "Melhor custo-benefício",
              "Parcele em 10x",
              "Download HD",
            ]}
          />
          <PlanCard
            name="Popular"
            price="R$147"
            fotos={250}
            popular={true}
            features={[
              "250 fotos geradas",
              "Ideal pra portfólio",
              "Parcele em 12x",
              "Download HD",
            ]}
          />
        </div>
      </section>

      {/* DIFERENCIAIS */}
      <section className="px-6 py-14 max-w-5xl mx-auto w-full">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">
          Por que o <span className="text-gradient">EnsaioPro</span>
        </h2>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <DifferentialCard
            icon={Camera}
            title="40+ tipos de ensaio"
            desc="De aniversário 30 anos a café urbano, passando por corporativo, gestante, infantil, super-heróis, boudoir, fitness e mais."
          />
          <DifferentialCard
            icon={Zap}
            title="Rápido como nunca"
            desc="Até 10 fotos geradas em paralelo. Um ensaio completo de 60 fotos sai em ~10 minutos."
          />
          <DifferentialCard
            icon={ShieldCheck}
            title="Fotos privadas e seguras"
            desc="Uploads armazenados em bucket privado. URLs de download expiram em 1h. Suas fotos não são usadas pra treinar IA."
          />
          <DifferentialCard
            icon={CreditCard}
            title="Sem pegadinha de mensalidade"
            desc="Compra créditos quando precisa. Não tem assinatura, não tem cobrança recorrente. Créditos nunca expiram."
          />
          <DifferentialCard
            icon={Clock}
            title="Histórico completo"
            desc="Dashboard mostra tudo que você já gastou, quantas fotos gerou e quanto cada uma saiu. Transparência total."
          />
          <DifferentialCard
            icon={Star}
            title="Refaz a foto que não curtir"
            desc="Gerou uma foto que não ficou boa? Clica em 'Refazer' e geramos de novo com 1 crédito."
          />
        </div>
      </section>

      {/* FAQ */}
      <section className="px-6 py-14 max-w-3xl mx-auto w-full">
        <h2 className="text-3xl md:text-4xl font-bold text-center mb-10">
          Perguntas <span className="text-gradient">frequentes</span>
        </h2>

        <div className="space-y-3">
          <FAQItem
            q="Quantas fotos preciso mandar?"
            a="De 4 a 10 fotos suas. Quanto mais variedade de ângulos (frontal, perfil, corpo inteiro), melhor a qualidade do resultado. Fotos em boa iluminação com rosto bem visível são ideais."
          />
          <FAQItem
            q="Quanto tempo demora?"
            a="Entre 2 e 10 minutos, dependendo do plano. 60 fotos = 10min, 250 fotos = 30min. Você pode fechar a aba — quando voltar, as fotos estão lá."
          />
          <FAQItem
            q="Minhas fotos ficam iguais a mim mesma?"
            a="Sim. A IA usa suas fotos de referência pra preservar rosto, cabelo, corpo, pele, tatuagens e marcas. Se tiver tatuagem, ela aparece. Se não tiver, não aparece."
          />
          <FAQItem
            q="Posso imprimir as fotos?"
            a="Pode. Todas as fotos são geradas em HD (1024px). Ideais pra Instagram, WhatsApp, currículo e impressão pequena/média. Pra impressão gigante (lona, banner), recomendamos usar um upscaler depois."
          />
          <FAQItem
            q="E se eu não gostar de alguma foto?"
            a="Tem botão 'Refazer' em cada foto individual. Consome 1 crédito e gera de novo com variação."
          />
          <FAQItem
            q="Meus dados estão seguros?"
            a="Sim. Conexão HTTPS, armazenamento em bucket privado, isolamento por usuário. Não vendemos seus dados, não usamos suas fotos pra treinar IA. Conforme LGPD. Detalhes na nossa Política de Privacidade."
          />
          <FAQItem
            q="Como funciona o pagamento?"
            a="Via Pix (instantâneo) ou cartão de crédito (parcele até 12x). Processado por gateway seguro. Créditos liberados automaticamente após confirmação."
          />
          <FAQItem
            q="Tem reembolso?"
            a="Créditos não utilizados podem ser reembolsados em até 7 dias da compra, conforme Código de Defesa do Consumidor. Basta enviar email para suporte."
          />
        </div>
      </section>

      {/* CTA FINAL */}
      <section className="px-6 py-16 text-center max-w-3xl mx-auto w-full">
        <h2 className="text-3xl md:text-5xl font-bold mb-5">
          Pronto pra <span className="text-gradient">brilhar</span>?
        </h2>
        <p className="text-lg text-[var(--muted-strong)] mb-8">
          Comece agora com 0 fotos grátis. Pague só quando gostar dos estilos que escolheu.
        </p>
        <Link href="/cadastro" className="btn btn-primary btn-lg pulse-glow">
          <Sparkles className="w-4 h-4" />
          Criar minha conta grátis
          <ArrowRight className="w-4 h-4" />
        </Link>
      </section>

      <footer className="border-t border-[var(--border)] py-8 px-6 mt-auto">
        <div className="max-w-6xl mx-auto flex flex-col md:flex-row items-center justify-between gap-3 text-sm text-[var(--muted)]">
          <div className="flex items-center gap-2">
            <Sparkles className="w-4 h-4 text-[var(--primary)]" />
            <span className="font-semibold text-[var(--foreground)]">EnsaioPro</span>
            <span>© 2026</span>
          </div>
          <div className="flex gap-5">
            <Link href="/termos" className="hover:text-[var(--foreground)]">Termos</Link>
            <Link href="/privacidade" className="hover:text-[var(--foreground)]">Privacidade</Link>
            <Link href="/cadastro" className="hover:text-[var(--foreground)]">Criar conta</Link>
          </div>
        </div>
      </footer>
      </div>
      {/* Fim wrapper landing pós-galaxy */}
    </main>
  );
}

function StepCard({
  num, icon: Icon, title, desc,
}: {
  num: number;
  icon: typeof Upload;
  title: string;
  desc: string;
}) {
  return (
    <div className="card relative overflow-hidden">
      <div className="absolute -top-4 -right-4 text-8xl font-bold text-[var(--primary)]/5 select-none">
        {num}
      </div>
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)]/20 to-[var(--accent)]/20 flex items-center justify-center mb-3">
        <Icon className="w-5 h-5 text-[var(--primary)]" />
      </div>
      <h3 className="font-bold text-lg mb-1">{title}</h3>
      <p className="text-sm text-[var(--muted)]">{desc}</p>
    </div>
  );
}

function PlanCard({
  name, price, fotos, popular, features,
}: {
  name: string;
  price: string;
  fotos: number;
  popular: boolean;
  features: string[];
}) {
  return (
    <div className={`card relative flex flex-col ${popular ? "border-[var(--primary)] ring-2 ring-[var(--primary)]/30 md:scale-105" : ""}`}>
      {popular && (
        <div className="absolute -top-3 left-1/2 -translate-x-1/2 px-3 py-1 rounded-full text-xs font-semibold bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white whitespace-nowrap">
          MAIS POPULAR
        </div>
      )}
      <div className="text-xs uppercase tracking-wider text-[var(--muted)] mb-1">{name}</div>
      <div className="text-4xl font-bold">{price}</div>
      <div className="text-sm text-[var(--muted)] mb-4">{fotos} fotos · R${(parseFloat(price.replace("R$","")) / fotos).toFixed(2)}/foto</div>
      <ul className="space-y-2 mb-5 flex-1 text-sm">
        {features.map((f) => (
          <li key={f} className="flex items-start gap-2">
            <Check className="w-4 h-4 text-[var(--success)] mt-0.5 shrink-0" />
            <span>{f}</span>
          </li>
        ))}
      </ul>
      <Link href="/cadastro" className={`btn ${popular ? "btn-primary" : "btn-secondary"}`}>
        Começar
      </Link>
    </div>
  );
}

function DifferentialCard({
  icon: Icon, title, desc,
}: {
  icon: typeof Camera;
  title: string;
  desc: string;
}) {
  return (
    <div className="card flex items-start gap-3">
      <div className="w-10 h-10 rounded-xl bg-gradient-to-br from-[var(--primary)]/15 to-[var(--accent)]/15 flex items-center justify-center shrink-0">
        <Icon className="w-5 h-5 text-[var(--primary)]" />
      </div>
      <div>
        <h3 className="font-bold mb-1">{title}</h3>
        <p className="text-sm text-[var(--muted)]">{desc}</p>
      </div>
    </div>
  );
}

function FAQItem({ q, a }: { q: string; a: string }) {
  return (
    <details className="card group cursor-pointer">
      <summary className="list-none font-semibold flex items-center justify-between">
        {q}
        <span className="text-[var(--muted)] group-open:rotate-45 transition">+</span>
      </summary>
      <p className="text-sm text-[var(--muted-strong)] mt-3 leading-relaxed">{a}</p>
    </details>
  );
}
