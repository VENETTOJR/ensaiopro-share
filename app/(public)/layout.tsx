import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function PublicLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5 border-b border-[var(--border)]">
        <div className="max-w-6xl mx-auto flex items-center justify-between">
          <Link href="/" className="inline-flex items-center gap-2">
            <Sparkles className="w-5 h-5 text-[var(--primary)]" />
            <span className="font-bold">Ensaio<span className="text-gradient">Pro</span></span>
          </Link>
          <nav className="flex gap-4 text-sm items-center">
            <Link href="/afiliados" className="hidden sm:inline text-[var(--muted)] hover:text-[var(--foreground)]">Afiliados</Link>
            <Link href="/login" className="text-[var(--muted)] hover:text-[var(--foreground)]">Entrar</Link>
            <Link href="/cadastro" className="text-[var(--primary)] font-semibold">Criar conta</Link>
          </nav>
        </div>
      </header>
      <main className="flex-1">{children}</main>
      <footer className="border-t border-[var(--border)] py-6 px-6">
        <div className="max-w-6xl mx-auto flex flex-col sm:flex-row items-center justify-between gap-3 text-sm text-[var(--muted)]">
          <div>© 2026 EnsaioPro</div>
          <div className="flex gap-4">
            <Link href="/afiliados" className="hover:text-[var(--foreground)]">Afiliados</Link>
            <Link href="/termos" className="hover:text-[var(--foreground)]">Termos</Link>
            <Link href="/privacidade" className="hover:text-[var(--foreground)]">Privacidade</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
