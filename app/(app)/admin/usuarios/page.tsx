import { createAdminClient } from "@/lib/supabase/server";
import { formatDate } from "@/lib/utils";
import { AdminUsuariosTable } from "./table";

export default async function AdminUsuariosPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string }>;
}) {
  const { q } = await searchParams;
  const admin = await createAdminClient();

  let query = admin
    .from("profiles")
    .select("id, email, name, photo_credits, role, phone, document, created_at")
    .order("created_at", { ascending: false })
    .limit(200);

  if (q) {
    query = query.or(`email.ilike.%${q}%,name.ilike.%${q}%`);
  }

  const { data: users } = await query;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 fade-in">
      <h1 className="text-3xl font-bold mb-1">Usuários</h1>
      <p className="text-[var(--muted)] mb-6">
        {users?.length ?? 0} usuários cadastrados
      </p>
      <AdminUsuariosTable
        users={(users ?? []).map((u) => ({
          ...u,
          created_at_formatted: formatDate(u.created_at),
        }))}
        initialQuery={q ?? ""}
      />
    </div>
  );
}
