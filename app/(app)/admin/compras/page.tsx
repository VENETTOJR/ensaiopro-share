import { createAdminClient } from "@/lib/supabase/server";
import { formatBRL } from "@/lib/utils";
import { ComprasTable } from "./client";

export const dynamic = "force-dynamic";

export default async function AdminComprasPage() {
  const admin = await createAdminClient();

  const [{ data: compras }, { data: stats }] = await Promise.all([
    admin
      .from("compras")
      .select("id, user_id, valor_cents, quantidade, status, metodo, paid_at, created_at, plans(name, slug), profiles!inner(id, email, name)")
      .order("created_at", { ascending: false })
      .limit(200),
    admin.from("admin_stats").select("total_revenue_cents, total_paid_purchases").single(),
  ]);

  const total = stats?.total_revenue_cents ?? 0;
  const count = stats?.total_paid_purchases ?? 0;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 fade-in">
      <div className="flex items-baseline gap-4 mb-6 flex-wrap">
        <h1 className="text-3xl font-bold">Compras</h1>
        <div className="text-sm text-[var(--muted)]">
          <span className="font-semibold text-[var(--success)]">{formatBRL(total / 100)}</span>{" "}
          em {count} compras pagas
        </div>
      </div>

      <ComprasTable compras={(compras ?? []) as unknown as Parameters<typeof ComprasTable>[0]["compras"]} />
    </div>
  );
}
