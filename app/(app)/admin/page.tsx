import { createAdminClient } from "@/lib/supabase/server";
import { formatBRL, formatDate } from "@/lib/utils";
import {
  Users as UsersIcon, Receipt, Camera, Coins, TrendingUp, Activity,
} from "lucide-react";

export default async function AdminHomePage() {
  const admin = await createAdminClient();

  const [
    { data: stats },
    { data: recentCompras },
    { data: recentUsers },
  ] = await Promise.all([
    admin.from("admin_stats").select("*").single(),
    admin
      .from("compras")
      .select("id, valor_cents, status, created_at, profiles!inner(email, name)")
      .order("created_at", { ascending: false })
      .limit(5),
    admin
      .from("profiles")
      .select("id, email, name, photo_credits, role, created_at")
      .order("created_at", { ascending: false })
      .limit(5),
  ]);

  const totalUsers = stats?.total_users ?? 0;
  const totalRevenue = stats?.total_revenue_cents ?? 0;
  const paidCount = stats?.total_paid_purchases ?? 0;
  const totalPhotos = stats?.total_photos ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 fade-in">
      <h1 className="text-3xl font-bold mb-1">Painel admin</h1>
      <p className="text-[var(--muted)] mb-8">Visão geral de toda a plataforma</p>

      <div className="grid grid-cols-2 md:grid-cols-4 gap-3 mb-8">
        <AdminStat icon={UsersIcon} label="Usuários" value={totalUsers} color="primary" />
        <AdminStat icon={Receipt} label="Compras pagas" value={paidCount} color="success" />
        <AdminStat icon={TrendingUp} label="Receita total" value={formatBRL(totalRevenue / 100)} color="accent" />
        <AdminStat icon={Camera} label="Fotos geradas" value={totalPhotos} color="warning" />
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <div className="card">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <Activity className="w-4 h-4 text-[var(--primary)]" />
            Compras recentes
          </h2>
          {!recentCompras || recentCompras.length === 0 ? (
            <div className="text-sm text-[var(--muted)] py-3">Nenhuma compra ainda.</div>
          ) : (
            <div className="divide-y divide-[var(--border)]">
              {recentCompras.map((c) => {
                const email = (c.profiles as { email?: string } | null)?.email ?? "-";
                return (
                  <div key={c.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                    <div className="flex-1 min-w-0">
                      <div className="truncate">{email}</div>
                      <div className="text-xs text-[var(--muted)]">{formatDate(c.created_at)}</div>
                    </div>
                    <div className="text-right">
                      <div className="font-semibold">{formatBRL(c.valor_cents / 100)}</div>
                      <div className="text-xs capitalize text-[var(--muted)]">{c.status}</div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        <div className="card">
          <h2 className="font-bold mb-3 flex items-center gap-2">
            <UsersIcon className="w-4 h-4 text-[var(--primary)]" />
            Usuários recentes
          </h2>
          <div className="divide-y divide-[var(--border)]">
            {(recentUsers ?? []).map((u) => (
              <div key={u.id} className="py-2 flex items-center justify-between gap-3 text-sm">
                <div className="flex-1 min-w-0">
                  <div className="truncate font-medium">{u.name ?? "—"}</div>
                  <div className="text-xs text-[var(--muted)] truncate">{u.email}</div>
                </div>
                <div className="text-right">
                  <div className="text-xs"><Coins className="w-3 h-3 inline" /> {u.photo_credits}</div>
                  {u.role === "admin" && (
                    <div className="text-[10px] text-[var(--primary)] uppercase">admin</div>
                  )}
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </div>
  );
}

function AdminStat({
  icon: Icon,
  label,
  value,
  color,
}: {
  icon: typeof UsersIcon;
  label: string;
  value: string | number;
  color: "primary" | "accent" | "success" | "warning";
}) {
  const colorVar = {
    primary: "var(--primary)",
    accent: "var(--accent)",
    success: "var(--success)",
    warning: "var(--warning)",
  }[color];

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
