import Link from "next/link";
import { Sparkles } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex flex-col">
      <header className="px-6 py-5">
        <Link href="/" className="inline-flex items-center gap-2">
          <Sparkles className="w-5 h-5 text-[var(--primary)]" />
          <span className="font-bold">Ensaio<span className="text-gradient">Pro</span></span>
        </Link>
      </header>
      <main className="flex-1 flex items-center justify-center px-6 py-8">
        <div className="w-full max-w-md">{children}</div>
      </main>
    </div>
  );
}
