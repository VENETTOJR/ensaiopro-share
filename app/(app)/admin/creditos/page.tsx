import Link from "next/link";
import { ArrowRight, Coins, Users } from "lucide-react";

export default function AdminCreditosPage() {
  return (
    <div className="max-w-3xl mx-auto px-4 md:px-8 py-8 fade-in">
      <h1 className="text-3xl font-bold mb-1">Créditos</h1>
      <p className="text-[var(--muted)] mb-6">
        Para adicionar créditos manualmente a um usuário, abra a página de Usuários e
        clique em &quot;Editar&quot; na linha dele.
      </p>

      <Link href="/admin/usuarios" className="card hover:border-[var(--primary)]/40 transition flex items-center gap-3">
        <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center">
          <Users className="w-5 h-5 text-[var(--primary)]" />
        </div>
        <div className="flex-1">
          <div className="font-semibold">Gerenciar usuários + créditos</div>
          <div className="text-sm text-[var(--muted)]">Busque, adicione/remova créditos, promova admin</div>
        </div>
        <ArrowRight className="w-4 h-4 text-[var(--muted)]" />
      </Link>

      <div className="card mt-4 bg-[var(--background-elev)]/50">
        <h2 className="font-semibold mb-2 flex items-center gap-2">
          <Coins className="w-4 h-4 text-[var(--primary)]" />
          Como funciona
        </h2>
        <ul className="text-sm text-[var(--muted-strong)] space-y-1.5 list-disc pl-5">
          <li>Créditos são creditados automaticamente quando o pagamento é confirmado pelo Plynx</li>
          <li>Cada ensaio gerado consome 1 crédito por foto</li>
          <li>Admin pode adicionar créditos manuais (ex: reembolso, bônus, teste)</li>
          <li>Formato pra editar: <code className="text-[var(--foreground)]">+60</code> adiciona, <code className="text-[var(--foreground)]">-10</code> remove, <code className="text-[var(--foreground)]">100</code> seta pra esse valor</li>
        </ul>
      </div>
    </div>
  );
}
