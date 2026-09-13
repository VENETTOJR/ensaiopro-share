import Link from "next/link";
import { ArrowLeft } from "lucide-react";

export const metadata = {
  title: "Política de Privacidade — EnsaioPro",
  description: "Como o EnsaioPro coleta, usa e protege seus dados conforme a LGPD",
};

export default function PrivacidadePage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-10 fade-in">
      <Link href="/" className="inline-flex items-center gap-1.5 text-sm text-[var(--muted)] hover:text-[var(--foreground)] mb-6">
        <ArrowLeft className="w-4 h-4" /> Voltar
      </Link>

      <article className="prose-custom">
        <h1 className="text-3xl font-bold mb-2">Política de Privacidade</h1>
        <p className="text-sm text-[var(--muted)] mb-8">
          Última atualização: 18 de abril de 2026 · Em conformidade com a LGPD (Lei 13.709/2018)
        </p>

        <Section title="1. Quem somos">
          <p>
            EnsaioPro, operado em <code>ensaiopro.site</code>, é um serviço de geração de ensaios fotográficos com IA.
            Esta política descreve como coletamos, usamos, armazenamos e protegemos seus dados pessoais conforme
            a Lei Geral de Proteção de Dados (LGPD).
          </p>
        </Section>

        <Section title="2. Dados que coletamos">
          <p><strong>No cadastro:</strong></p>
          <ul>
            <li>Nome completo</li>
            <li>Email</li>
            <li>Senha (armazenada com criptografia irreversível)</li>
          </ul>
          <p><strong>Durante o uso:</strong></p>
          <ul>
            <li>Fotos de referência enviadas (armazenadas temporariamente em bucket privado)</li>
            <li>Imagens geradas (acessíveis apenas pelo próprio usuário via URL assinada com expiração)</li>
            <li>Histórico de ensaios gerados</li>
            <li>Dados de uso da plataforma (páginas acessadas, ações)</li>
          </ul>
          <p><strong>No checkout (via Plynx/Pagar.me):</strong></p>
          <ul>
            <li>Nome, email, telefone, CPF (obrigatório para emissão de nota)</li>
            <li>Dados de cartão são processados diretamente pelo gateway, NUNCA tocam nossos servidores</li>
          </ul>
        </Section>

        <Section title="3. Finalidade do uso">
          Seus dados são usados exclusivamente para:
          <ul>
            <li>Fornecer o serviço contratado (gerar ensaios)</li>
            <li>Processar pagamentos e emitir notas fiscais</li>
            <li>Enviar comunicações operacionais (ensaio pronto, recuperação de senha)</li>
            <li>Melhorar o serviço mediante análise anônima</li>
            <li>Cumprir obrigações legais</li>
          </ul>
          <p><strong>NÃO</strong> vendemos, alugamos ou compartilhamos seus dados com terceiros para marketing.</p>
        </Section>

        <Section title="4. Uso das suas fotos">
          <ul>
            <li>Fotos de referência são enviadas via HTTPS e armazenadas em bucket privado (Supabase)</li>
            <li>São processadas apenas pelo modelo de IA para geração do ensaio solicitado</li>
            <li>NÃO usamos suas fotos para treinar modelos de IA próprios ou de terceiros</li>
            <li>São excluídas do nosso armazenamento em até 30 dias após a geração completa, salvo se o Usuário solicitar exclusão imediata</li>
            <li>As imagens geradas ficam disponíveis via URL assinada temporária (1 hora)</li>
          </ul>
        </Section>

        <Section title="5. Processadores de dados (subprocessadores)">
          Compartilhamos dados mínimos necessários com:
          <ul>
            <li><strong>Supabase</strong> (hospedagem do banco e arquivos) — servidores em São Paulo</li>
            <li><strong>Google AI / Replicate</strong> (geração de imagens) — recebem fotos de referência temporariamente; políticas: <code>ai.google.dev/terms</code>, <code>replicate.com/privacy</code></li>
            <li><strong>Plynx/Pagar.me</strong> (pagamento) — recebem dados de cobrança</li>
            <li><strong>Caddy/VPS</strong> (servidor web) — logs de acesso anônimos</li>
          </ul>
        </Section>

        <Section title="6. Seus direitos (LGPD)">
          Você tem direito a, a qualquer momento:
          <ul>
            <li><strong>Confirmar</strong> a existência de tratamento de seus dados</li>
            <li><strong>Acessar</strong> seus dados armazenados</li>
            <li><strong>Corrigir</strong> dados incompletos ou desatualizados</li>
            <li><strong>Solicitar anonimização, bloqueio ou eliminação</strong> de dados desnecessários</li>
            <li><strong>Portabilidade</strong> dos dados para outro serviço</li>
            <li><strong>Revogar consentimento</strong> a qualquer momento</li>
            <li><strong>Deletar sua conta</strong> e todos os dados associados</li>
          </ul>
          <p>Para exercer qualquer direito, envie email para <strong>suporte@ensaiopro.site</strong>. Respondemos em até 15 dias.</p>
        </Section>

        <Section title="7. Segurança">
          <ul>
            <li>Conexão HTTPS/TLS 1.2+ em toda a plataforma</li>
            <li>Senhas armazenadas com hash bcrypt (irreversível)</li>
            <li>Isolamento por usuário via Row Level Security (RLS) no banco</li>
            <li>URLs de imagens temporárias com assinatura criptográfica</li>
            <li>Backups criptografados automáticos</li>
            <li>Monitoramento contínuo de acessos suspeitos</li>
          </ul>
        </Section>

        <Section title="8. Cookies e tracking">
          <p>Usamos cookies necessários para:</p>
          <ul>
            <li>Manter sua sessão logada</li>
            <li>Processar checkout</li>
          </ul>
          <p>
            Cookies de analytics (Google Analytics, Meta Pixel) podem ser usados para melhorar o serviço.
            Você pode desabilitá-los nas configurações do navegador.
          </p>
        </Section>

        <Section title="9. Retenção">
          <ul>
            <li>Dados de conta: enquanto a conta estiver ativa + 180 dias após exclusão (backup legal)</li>
            <li>Fotos de referência: até 30 dias após geração do ensaio</li>
            <li>Imagens geradas: enquanto o usuário as mantiver na conta</li>
            <li>Dados fiscais de compras: 5 anos (obrigação legal)</li>
          </ul>
        </Section>

        <Section title="10. Alterações">
          Esta política pode ser atualizada. Alterações serão comunicadas por email e publicadas aqui
          com a nova data de atualização.
        </Section>

        <Section title="11. Encarregado de Dados (DPO)">
          <p>
            <strong>Contato:</strong> suporte@ensaiopro.site<br/>
            <strong>Autoridade Nacional:</strong> ANPD — <code>gov.br/anpd</code>
          </p>
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
