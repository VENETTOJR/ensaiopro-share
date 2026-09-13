"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, User, Lock, ArrowRight, Sparkles } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SmokeyBackground } from "@/components/auth/SmokeyBackground";

export default function LoginPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");

    const supabase = createClient();
    const { error } = await supabase.auth.signInWithPassword({ email, password });

    if (error) {
      toast.error(
        error.message === "Invalid login credentials"
          ? "Email ou senha incorretos"
          : error.message,
      );
      setLoading(false);
      return;
    }

    toast.success("Bem-vindo de volta!");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden">
      <SmokeyBackground />

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4">
        <Link
          href="/"
          className="absolute top-6 left-6 inline-flex items-center gap-2 text-white/90 hover:text-white"
        >
          <Sparkles className="w-5 h-5 text-[var(--primary)]" />
          <span className="font-bold">
            Ensaio<span className="text-[var(--primary)]">Pro</span>
          </span>
        </Link>

        <div className="w-full max-w-sm p-8 space-y-6 bg-white/5 backdrop-blur-xl rounded-2xl border border-white/10 shadow-2xl">
          <div className="text-center">
            <h2 className="text-3xl font-bold text-white">Bem-vindo de volta</h2>
            <p className="mt-2 text-sm text-white/60">Faça login para acessar seus ensaios</p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {/* Email */}
            <div>
              <label htmlFor="email" className="flex items-center gap-2 text-xs font-medium text-white/70 mb-2">
                <User size={14} />
                Email
              </label>
              <input
                id="email"
                name="email"
                type="email"
                required
                autoComplete="email"
                placeholder="seu@email.com"
                className="w-full py-3 px-4 text-sm text-white bg-white/5 border border-white/15 rounded-lg placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition"
              />
            </div>

            {/* Senha */}
            <div>
              <label htmlFor="password" className="flex items-center gap-2 text-xs font-medium text-white/70 mb-2">
                <Lock size={14} />
                Senha
              </label>
              <input
                id="password"
                name="password"
                type="password"
                required
                autoComplete="current-password"
                minLength={6}
                placeholder="••••••••"
                className="w-full py-3 px-4 text-sm text-white bg-white/5 border border-white/15 rounded-lg placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition"
              />
            </div>

            <div className="flex items-center justify-end">
              <a href="#" className="text-xs text-white/60 hover:text-white transition">
                Esqueceu a senha?
              </a>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="group w-full flex items-center justify-center gap-2 py-3 px-4 bg-[var(--primary)] hover:bg-[var(--primary-hover)] rounded-lg text-white font-semibold focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-offset-transparent focus:ring-[var(--primary)] transition-all duration-300 disabled:opacity-60 disabled:cursor-not-allowed"
            >
              {loading ? (
                <Loader2 className="w-5 h-5 animate-spin" />
              ) : (
                <>
                  Entrar
                  <ArrowRight className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-white/60">
            Não tem conta?{" "}
            <Link
              href="/cadastro"
              className="font-semibold text-[var(--primary)] hover:text-[var(--accent)] transition"
            >
              Criar conta
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
