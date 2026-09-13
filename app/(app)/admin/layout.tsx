import { redirect } from "next/navigation";
import Link from "next/link";
import { createClient } from "@/lib/supabase/server";
import { LayoutDashboard, Users, Receipt, Coins, ArrowLeft, TrendingUp, FileText, Star, Zap } from "lucide-react";

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const supabase = await createClient();
  let user;
  try {
    const { data } = await supabase.auth.getUser();
    user = data.user;
  } catch {
    redirect("/login");
  }
  if (!user) redirect("/login");

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  if (profile?.role !== "admin") redirect("/dashboard");

  return (
    <div className="min-h-screen">
      <div className="border-b border-[var(--border)] bg-[var(--background-elev)]">
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-4 flex items-center gap-6 overflow-x-auto">
          <Link href="/dashboard" className="text-sm text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1.5 shrink-0">
            <ArrowLeft className="w-4 h-4" /> Voltar
          </Link>
          <div className="text-sm font-semibold px-2 py-0.5 rounded-md bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white shrink-0">
            ADMIN
          </div>
          <nav className="flex gap-1 ml-auto">
            <Link href="/admin" className="btn btn-ghost btn-sm">
              <LayoutDashboard className="w-4 h-4" /> Visão geral
            </Link>
            <Link href="/admin/usuarios" className="btn btn-ghost btn-sm">
              <Users className="w-4 h-4" /> Usuários
            </Link>
            <Link href="/admin/compras" className="btn btn-ghost btn-sm">
              <Receipt className="w-4 h-4" /> Compras
            </Link>
            <Link href="/admin/creditos" className="btn btn-ghost btn-sm">
              <Coins className="w-4 h-4" /> Créditos
            </Link>
            <Link href="/admin/gastos" className="btn btn-ghost btn-sm">
              <TrendingUp className="w-4 h-4" /> Gastos
            </Link>
            <Link href="/admin/prompts" className="btn btn-ghost btn-sm">
              <FileText className="w-4 h-4" /> Prompts
            </Link>
            <Link href="/admin/fotos-aprovar" className="btn btn-ghost btn-sm">
              <Star className="w-4 h-4" /> Aprovar fotos
            </Link>
            <Link href="/admin/viral-lab" className="btn btn-ghost btn-sm text-[var(--primary)]">
              <Zap className="w-4 h-4" /> Viral Lab
            </Link>
          </nav>
        </div>
      </div>
      {children}
    </div>
  );
}
