import { createClient } from "@/lib/supabase/server";
import { formatBRL, formatDate, cn } from "@/lib/utils";
import {
  Coins, TrendingUp, Camera, Receipt, CheckCircle2, Clock, XCircle, RefreshCw,
} from "lucide-react";

const STATUS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Aguardando", color: "text-[var(--warning)]", icon: Clock },
  paid: { label: "Pago", color: "text-[var(--success)]", icon: CheckCircle2 },
  failed: { label: "Falhou", color: "text-[var(--danger)]", icon: XCircle },
  cancelled: { label: "Cancelada", color: "text-[var(--muted)]", icon: XCircle },
  refunded: { label: "Reembolsada", color: "text-[var(--muted)]", icon: RefreshCw },
};

export default async function HistoricoPage() {
  const supabase = await createClient();
  const { data: { user } } = await supabase.auth.getUser();

  const [{ data: stats }, { data: compras }] = await Promise.all([
    supabase
      .from("user_purchase_stats")
      // Story 03 AC4.10: select explícito, NÃO usar "*" em rotas user-facing.
      .select(
        "user_id, total_invested_cents, total_credits_purchased, total_purchases, total_photos_generated, current_credits",
      )
      .eq("user_id", user!.id)
      .maybeSingle(),
    supabase
      .from("compras")
      .select("id, valor_cents, quantidade, status, metodo, paid_at, created_at, plans(name)")
      .eq("user_id", user!.id)
      .order("created_at", { ascending: false }),
  ]);

  const totalInvested = stats?.total_invested_cents ?? 0;
  const totalPhotos = stats?.total_photos_generated ?? 0;
  const totalPurchases = stats?.total_purchases ?? 0;
  const currentCredits = stats?.current_credits ?? 0;
  const avgCostPerPhoto =
    totalPhotos > 0 ? totalInvested / totalPhotos / 100 : 0;

  return (
    <div className="max-w-5xl mx-auto px-4 md:px-8 py-8 fade-in">
      <div className="mb-6">
        <h1 className="text-3xl font-bold">Histórico de compras</h1>
        <p className="text-[var(--muted)] mt-1">
          Acompanhe tudo que você investiu e o que gerou
        </p>
      </div>

      {/* Stats grid */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <StatCard
          icon={TrendingUp}
          label="Total investido"
          value={formatBRL(totalInvested / 100)}
          accent="primary"
        />
        <StatCard
          icon={Coins}
          label="Créditos restantes"
          value={String(currentCredits)}
          accent="accent"
        />
        <StatCard
          icon={Camera}
          label="Fotos geradas"
          value={String(totalPhotos)}
          accent="success"
        />
        <StatCard
          icon={Receipt}
          label="Compras realizadas"
          value={String(totalPurchases)}
          accent="warning"
        />
      </div>

      {avgCostPerPhoto > 0 && (
        <div className="card mb-6 flex items-center gap-3 bg-gradient-to-br from-[var(--primary)]/5 to-[var(--accent)]/5 border-[var(--primary)]/20">
          <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-[var(--primary)]" />
          </div>
          <div className="flex-1">
            <div className="text-sm text-[var(--muted)]">
              Seu custo médio real por foto
            </div>
            <div className="font-bold text-lg">{formatBRL(avgCostPerPhoto)}</div>
          </div>
        </div>
      )}

      {/* Lista de compras */}
      <h2 className="text-lg font-bold mb-3">Todas as compras</h2>
      {!compras || compras.length === 0 ? (
        <div className="card text-center py-12 text-[var(--muted)]">
          Você ainda não fez nenhuma compra.
        </div>
      ) : (
        <div className="space-y-2">
          {compras.map((c) => {
            const st = STATUS[c.status] ?? STATUS.pending;
            const Icon = st.icon;
            return (
              <div
                key={c.id}
                className="card flex items-center gap-4 hover:border-[var(--border-strong)] transition"
              >
                <div
                  className={cn(
                    "w-10 h-10 rounded-xl flex items-center justify-center shrink-0",
                    c.status === "paid"
                      ? "bg-[var(--success)]/15"
                      : "bg-[var(--background-elev-2)]"
                  )}
                >
                  <Icon className={cn("w-5 h-5", st.color)} />
                </div>
                <div className="flex-1 min-w-0">
                  <div className="font-semibold">
                    {(c.plans as { name?: string } | null)?.name ?? `${c.quantidade} créditos`}
                  </div>
                  <div className="text-xs text-[var(--muted)] mt-0.5">
                    {formatDate(c.paid_at ?? c.created_at)}
                    {c.metodo && ` · ${c.metodo === "pix" ? "Pix" : "Cartão"}`}
                  </div>
                </div>
                <div className="text-right">
                  <div className="font-bold">{formatBRL(c.valor_cents / 100)}</div>
                  <div className={cn("text-xs font-medium", st.color)}>{st.label}</div>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}

function StatCard({
  icon: Icon,
  label,
  value,
  accent,
}: {
  icon: typeof Coins;
  label: string;
  value: string;
  accent: "primary" | "accent" | "success" | "warning";
}) {
  const colorVar = {
    primary: "var(--primary)",
    accent: "var(--accent)",
    success: "var(--success)",
    warning: "var(--warning)",
  }[accent];

  return (
    <div className="card">
      <div
        className="w-8 h-8 rounded-lg flex items-center justify-center mb-2"
        style={{ background: `color-mix(in srgb, ${colorVar} 15%, transparent)` }}
      >
        <Icon className="w-4 h-4" style={{ color: colorVar }} />
      </div>
      <div className="text-xs text-[var(--muted)] uppercase tracking-wider">{label}</div>
      <div className="text-xl md:text-2xl font-bold mt-0.5">{value}</div>
    </div>
  );
}
