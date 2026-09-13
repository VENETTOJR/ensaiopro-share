"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import {
  Sparkles,
  LayoutDashboard,
  Camera,
  History,
  CreditCard,
  LogOut,
  Menu,
  X,
  Coins,
  Shield,
  Handshake,
} from "lucide-react";
import { useState } from "react";
import { createClient } from "@/lib/supabase/client";
import { cn } from "@/lib/utils";

export interface Profile {
  name: string | null;
  email: string | null;
  avatar_url: string | null;
  photo_credits: number;
  role?: string;
}

const NAV_USER = [
  { href: "/dashboard", label: "Início", icon: LayoutDashboard },
  { href: "/ensaios", label: "Meus ensaios", icon: Camera },
  { href: "/historico", label: "Histórico", icon: History },
  { href: "/planos", label: "Comprar créditos", icon: CreditCard },
  { href: "/afiliados", label: "Indique e ganhe", icon: Handshake },
];

export function AppShell({
  children,
  profile,
}: {
  children: React.ReactNode;
  profile: Profile;
}) {
  const pathname = usePathname();
  const router = useRouter();
  const [open, setOpen] = useState(false);

  async function logout() {
    const supabase = createClient();
    await supabase.auth.signOut();
    router.push("/login");
    router.refresh();
  }

  return (
    <div className="min-h-screen flex flex-col md:flex-row">
      {/* Mobile topbar */}
      <div className="md:hidden glass sticky top-0 z-40 flex items-center justify-between px-4 py-3 border-b">
        <Link href="/dashboard" className="flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--primary)]" />
          <span className="font-bold">Ensaio<span className="text-gradient">Pro</span></span>
        </Link>
        <button
          onClick={() => setOpen(!open)}
          className="btn btn-ghost btn-sm"
          aria-label="Menu"
        >
          {open ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
        </button>
      </div>

      {/* Sidebar */}
      <aside
        className={cn(
          "md:w-64 shrink-0 bg-[var(--background-elev)] border-r border-[var(--border)] flex-col",
          "md:sticky md:top-0 md:h-screen",
          open ? "flex fixed inset-0 z-50 pt-16" : "hidden md:flex"
        )}
      >
        <div className="hidden md:flex px-6 py-5 border-b border-[var(--border)]">
          <Link href="/dashboard" className="flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--primary)]" />
            <span className="font-bold">Ensaio<span className="text-gradient">Pro</span></span>
          </Link>
        </div>

        {/* Credits badge */}
        <div className="px-4 pt-4">
          <Link
            href="/planos"
            className="flex items-center justify-between gap-2 px-4 py-3 rounded-xl bg-gradient-to-br from-[var(--primary)]/10 to-[var(--accent)]/10 border border-[var(--primary)]/30 hover:border-[var(--primary)]/60 transition"
            onClick={() => setOpen(false)}
          >
            <div>
              <div className="text-[11px] uppercase tracking-wider text-[var(--muted)]">Créditos</div>
              <div className="text-2xl font-bold text-gradient">{profile.photo_credits}</div>
            </div>
            <Coins className="w-6 h-6 text-[var(--primary)]" />
          </Link>
        </div>

        <nav className="flex-1 px-3 py-4 space-y-1">
          {[
            ...NAV_USER,
            ...(profile.role === "admin"
              ? [{ href: "/admin", label: "Painel admin", icon: Shield }]
              : []),
          ].map((item) => {
            const active =
              pathname === item.href || pathname.startsWith(item.href + "/");
            const Icon = item.icon;
            return (
              <Link
                key={item.href}
                href={item.href}
                onClick={() => setOpen(false)}
                className={cn(
                  "flex items-center gap-3 px-4 py-2.5 rounded-lg text-sm font-medium transition",
                  active
                    ? "bg-gradient-to-r from-[var(--primary)]/15 to-transparent text-[var(--foreground)] border border-[var(--primary)]/30"
                    : "text-[var(--muted-strong)] hover:text-[var(--foreground)] hover:bg-[var(--background-elev-2)]"
                )}
              >
                <Icon className="w-4 h-4" />
                {item.label}
              </Link>
            );
          })}
        </nav>

        <div className="px-3 py-3 border-t border-[var(--border)]">
          <div className="flex items-center gap-3 px-3 py-2 rounded-lg">
            <div className="w-9 h-9 rounded-full bg-gradient-to-br from-[var(--primary)] to-[var(--accent)] flex items-center justify-center text-white font-semibold text-sm">
              {(profile.name ?? profile.email ?? "U").charAt(0).toUpperCase()}
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-sm font-medium truncate">{profile.name ?? "Usuário"}</div>
              <div className="text-xs text-[var(--muted)] truncate">{profile.email}</div>
            </div>
          </div>
          <button onClick={logout} className="btn btn-ghost btn-sm w-full justify-start mt-2">
            <LogOut className="w-4 h-4" />
            Sair
          </button>
        </div>
      </aside>

      <main className="flex-1 min-w-0 overflow-x-hidden">{children}</main>
    </div>
  );
}
