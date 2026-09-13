"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Loader2, User, Lock, Mail, ArrowRight, Sparkles, UserPlus } from "lucide-react";
import { createClient } from "@/lib/supabase/client";
import { SmokeyBackground } from "@/components/auth/SmokeyBackground";

export default function CadastroPage() {
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    const formData = new FormData(e.currentTarget);
    const name = String(formData.get("name") ?? "").trim();
    const email = String(formData.get("email") ?? "").trim();
    const password = String(formData.get("password") ?? "");
    const passwordConfirm = String(formData.get("password_confirm") ?? "");

    if (password.length < 6) {
      toast.error("Senha precisa ter no mínimo 6 caracteres");
      setLoading(false);
      return;
    }

    if (password !== passwordConfirm) {
      toast.error("Senhas não conferem");
      setLoading(false);
      return;
    }

    const supabase = createClient();
    const { error } = await supabase.auth.signUp({
      email,
      password,
      options: {
        data: { name, partner_slug: "ensaiopro" },
        emailRedirectTo: `${window.location.origin}/auth/callback`,
      },
    });

    if (error) {
      toast.error(error.message);
      setLoading(false);
      return;
    }

    toast.success("Conta criada! Entrando...");
    router.push("/dashboard");
    router.refresh();
  }

  return (
    <div className="fixed inset-0 w-screen h-screen overflow-hidden">
      <SmokeyBackground />

      <div className="relative z-10 w-full h-full flex flex-col items-center justify-center p-4 overflow-y-auto py-10">
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
            <h2 className="text-3xl font-bold text-white">Criar sua conta</h2>
            <p className="mt-2 text-sm text-white/60">
              Comece a gerar seus ensaios em poucos minutos
            </p>
          </div>

          <form onSubmit={onSubmit} className="space-y-5">
            {/* Nome */}
            <div>
              <label htmlFor="name" className="flex items-center gap-2 text-xs font-medium text-white/70 mb-2">
                <User size={14} />
                Nome completo
              </label>
              <input
                id="name"
                name="name"
                type="text"
                required
                autoComplete="name"
                placeholder="Seu nome"
                className="w-full py-3 px-4 text-sm text-white bg-white/5 border border-white/15 rounded-lg placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition"
              />
            </div>

            {/* Email */}
            <div>
              <label htmlFor="email" className="flex items-center gap-2 text-xs font-medium text-white/70 mb-2">
                <Mail size={14} />
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
                autoComplete="new-password"
                minLength={6}
                placeholder="Mínimo 6 caracteres"
                className="w-full py-3 px-4 text-sm text-white bg-white/5 border border-white/15 rounded-lg placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition"
              />
            </div>

            {/* Confirmar senha */}
            <div>
              <label htmlFor="password_confirm" className="flex items-center gap-2 text-xs font-medium text-white/70 mb-2">
                <Lock size={14} />
                Confirmar senha
              </label>
              <input
                id="password_confirm"
                name="password_confirm"
                type="password"
                required
                autoComplete="new-password"
                minLength={6}
                placeholder="Repita a senha"
                className="w-full py-3 px-4 text-sm text-white bg-white/5 border border-white/15 rounded-lg placeholder:text-white/30 focus:outline-none focus:ring-2 focus:ring-[var(--primary)] focus:border-transparent transition"
              />
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
                  <UserPlus className="h-5 w-5" />
                  Criar conta
                  <ArrowRight className="h-5 w-5 transform group-hover:translate-x-1 transition-transform" />
                </>
              )}
            </button>
          </form>

          <p className="text-center text-xs text-white/60">
            Já tem conta?{" "}
            <Link
              href="/login"
              className="font-semibold text-[var(--primary)] hover:text-[var(--accent)] transition"
            >
              Fazer login
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
