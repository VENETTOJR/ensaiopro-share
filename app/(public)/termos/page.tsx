import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Termos de Uso — EnsaioPro",
  description: "Termos de uso da plataforma EnsaioPro para geração de ensaios fotográficos com IA",
};

export default function TermosPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-10 fade-in">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <article className="prose-custom">
        <h1 className="text-3xl font-bold mb-2">Termos de Uso</h1>
        <p className="text-sm text-[var(--muted)] mb-8">Última atualização: 18 de abril de 2026</p>

        <Section title="1. Aceitação dos Termos">
          Ao se cadastrar, acessar ou utilizar a plataforma EnsaioPro (&quot;Plataforma&quot;, &quot;Serviço&quot;),
          disponível em <code>ensaiopro.site</code>, você (&quot;Usuário&quot;) concorda com estes Termos de Uso
          e com a nossa Política de Privacidade. Caso não concorde, deve parar imediatamente de usar o serviço.
        </Section>

        <Section title="2. Descrição do Serviço">
          O EnsaioPro é um serviço de geração de ensaios fotográficos utilizando inteligência artificial.
          O Usuário envia fotos pessoais de referência e seleciona estilos pré-definidos, e a plataforma gera
          novas imagens combinando essas informações. Cada imagem gerada consome 1 crédito do saldo do Usuário.
        </Section>

        <Section title="3. Cadastro e Conta">
          Para usar o serviço, o Usuário deve:
          <ul>
            <li>Ter no mínimo 18 anos completos, ou estar acompanhado de responsável legal</li>
            <li>Fornecer informações verdadeiras, precisas e atualizadas</li>
            <li>Manter a senha em sigilo — é o único responsável pelas atividades em sua conta</li>
            <li>Notificar imediatamente qualquer uso não autorizado</li>
          </ul>
        </Section>

        <Section title="4. Uso Permitido">
          O Usuário pode enviar somente:
          <ul>
            <li>Fotos de si mesmo, ou</li>
            <li>Fotos de terceiros com autorização expressa e escrita dessas pessoas</li>
            <li>Fotos de menores de idade somente com autorização dos responsáveis legais</li>
          </ul>
          É <strong>PROIBIDO</strong>:
          <ul>
            <li>Enviar fotos de pessoas sem autorização</li>
            <li>Usar o serviço para gerar conteúdo ilegal, difamatório, sexual envolvendo menores, violento ou ofensivo</li>
            <li>Fazer deepfakes não autorizados de figuras públicas</li>
            <li>Usar para assédio, fraude ou suplantação de identidade</li>
            <li>Revender ou redistribuir os créditos adquiridos</li>
            <li>Tentar burlar limites técnicos, fazer engenharia reversa ou atacar a plataforma</li>
          </ul>
          <p>A violação dessas regras resulta em suspensão imediata da conta sem reembolso e possível comunicação às autoridades.</p>
        </Section>

        <Section title="5. Créditos e Pagamentos">
          <ul>
            <li>Os créditos são adquiridos via pacotes pagos processados por gateway de pagamento de terceiros (Plynx/Pagar.me)</li>
            <li>Aceitamos cartão de crédito e PIX</li>
            <li>Cada foto gerada consome 1 crédito</li>
            <li>Créditos não expiram, mas não são transferíveis</li>
            <li>Em caso de falha técnica na geração, os créditos são devolvidos automaticamente</li>
            <li>Reembolsos de créditos não utilizados podem ser solicitados em até 7 dias da compra, conforme Código de Defesa do Consumidor</li>
          </ul>
        </Section>

        <Section title="6. Propriedade Intelectual">
          <ul>
            <li>O Usuário mantém a propriedade das fotos que envia como referência</li>
            <li>Ao enviar fotos, o Usuário concede à EnsaioPro licença não-exclusiva e temporária para processá-las exclusivamente para geração do ensaio solicitado</li>
            <li>As imagens geradas são do Usuário, que pode usá-las livremente para fins pessoais e comerciais</li>
            <li>As fotos de referência são excluídas do armazenamento em prazo razoável após a geração</li>
            <li>A plataforma, código, marca e prompts são propriedade exclusiva da EnsaioPro</li>
          </ul>
        </Section>

        <Section title="7. Disponibilidade e Limitações">
          <ul>
            <li>A plataforma é fornecida &quot;no estado em que se encontra&quot;, sem garantias de disponibilidade ininterrupta</li>
            <li>A qualidade do resultado depende da qualidade das fotos de referência enviadas</li>
            <li>A EnsaioPro não garante que todas as gerações atenderão às expectativas subjetivas do Usuário</li>
            <li>Em caso de indisponibilidade técnica prolongada, créditos não consumidos permanecem no saldo do Usuário</li>
          </ul>
        </Section>

        <Section title="8. Limitação de Responsabilidade">
          A EnsaioPro não se responsabiliza por:
          <ul>
            <li>Uso indevido do serviço pelo Usuário ou terceiros</li>
            <li>Conteúdo gerado que o Usuário escolha publicar ou distribuir</li>
            <li>Perdas de lucros, danos indiretos ou consequenciais</li>
            <li>Problemas decorrentes da conexão de internet ou dispositivos do Usuário</li>
          </ul>
          A responsabilidade máxima da EnsaioPro em qualquer caso é limitada ao valor pago pelo Usuário nos últimos 12 meses.
        </Section>

        <Section title="9. Alterações">
          Estes Termos podem ser atualizados a qualquer momento. Alterações materiais serão comunicadas por email
          ou aviso na plataforma. O uso continuado após alteração implica aceitação.
        </Section>

        <Section title="10. Rescisão">
          O Usuário pode cancelar a conta a qualquer momento pelo painel. A EnsaioPro pode suspender ou encerrar
          contas que violem estes Termos, sem aviso prévio em casos graves.
        </Section>

        <Section title="11. Lei Aplicável e Foro">
          Estes Termos são regidos pela legislação brasileira. Fica eleito o foro da comarca de residência do Usuário
          consumidor para dirimir quaisquer controvérsias.
        </Section>

        <Section title="12. Contato">
          Dúvidas, solicitações ou denúncias podem ser enviadas para <strong>suporte@ensaiopro.site</strong>.
        </Section>
      </article>
    </div>
  );
}

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <section className="mb-8">
      <h2 className="text-xl font-bold mb-3 mt-6">{title}</h2>
      <div className="text-[var(--muted-strong)] leading-relaxed space-y-2">{children}</div>
    </section>
  );
}
