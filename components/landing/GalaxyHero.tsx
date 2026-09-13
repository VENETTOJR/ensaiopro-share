"use client";

/**
 * Hero galaxy com Spline 3D background + navbar flutuante + hero à esquerda.
 * Adaptado pras cores magenta/rosa do EnsaioPro.
 */

import { useEffect, useState, Suspense, lazy } from "react";
import Link from "next/link";
import { Sparkles, Play, Menu, X } from "lucide-react";

const Spline = lazy(() => import("@splinetool/react-spline"));

function HeroSplineBackground() {
  return (
    <div className="relative w-full h-screen overflow-hidden">
      <Suspense
        fallback={
          <div className="w-full h-full bg-[var(--background)]" />
        }
      >
        <Spline
          style={{ width: "100%", height: "100vh", pointerEvents: "auto" }}
          scene="https://prod.spline.design/us3ALejTXl6usHZ7/scene.splinecode"
        />
      </Suspense>
      {/* Overlay gradiente magenta */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background: `
            linear-gradient(to right, rgba(10, 10, 15, 0.9), transparent 30%, transparent 70%, rgba(10, 10, 15, 0.9)),
            linear-gradient(to bottom, transparent 40%, rgba(10, 10, 15, 0.95)),
            radial-gradient(circle at 20% 50%, rgba(217, 70, 239, 0.15), transparent 50%),
            radial-gradient(circle at 80% 30%, rgba(244, 114, 182, 0.12), transparent 50%)
          `,
        }}
      />
    </div>
  );
}

function Navbar() {
  const [hovered, setHovered] = useState<string | null>(null);
  const [mobileOpen, setMobileOpen] = useState(false);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth >= 1024 && mobileOpen) setMobileOpen(false);
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [mobileOpen]);

  const linkClass = (item: string) => {
    const isHover = hovered === item;
    const isOther = hovered !== null && !isHover;
    return `text-sm transition duration-150 ${
      isHover ? "text-white" : isOther ? "text-white/40" : "text-white/80"
    }`;
  };

  return (
    <nav
      className="fixed top-0 left-0 right-0 z-30"
      style={{
        backgroundColor: "rgba(10, 10, 15, 0.6)",
        backdropFilter: "blur(14px)",
        WebkitBackdropFilter: "blur(14px)",
        borderBottom: "1px solid rgba(217, 70, 239, 0.15)",
      }}
    >
      <div className="container mx-auto px-4 py-4 md:px-6 lg:px-8 flex items-center justify-between">
        <div className="flex items-center space-x-6 lg:space-x-8">
          <Link href="/" className="flex items-center gap-2 shrink-0">
            <Sparkles className="w-6 h-6 text-[var(--primary)]" />
            <span className="font-bold text-lg text-white">
              Ensaio<span className="text-[var(--primary)]">Pro</span>
            </span>
          </Link>

          <div className="hidden lg:flex items-center space-x-6">
            <a
              href="#como-funciona"
              className={linkClass("como")}
              onMouseEnter={() => setHovered("como")}
              onMouseLeave={() => setHovered(null)}
            >
              Como funciona
            </a>
            <a
              href="#tipos"
              className={linkClass("tipos")}
              onMouseEnter={() => setHovered("tipos")}
              onMouseLeave={() => setHovered(null)}
            >
              Tipos de ensaio
            </a>
            <a
              href="#planos"
              className={linkClass("planos")}
              onMouseEnter={() => setHovered("planos")}
              onMouseLeave={() => setHovered(null)}
            >
              Planos
            </a>
            <a
              href="#faq"
              className={linkClass("faq")}
              onMouseEnter={() => setHovered("faq")}
              onMouseLeave={() => setHovered(null)}
            >
              FAQ
            </a>
          </div>
        </div>

        <div className="flex items-center space-x-3">
          <Link href="/login" className="hidden sm:block text-white/80 hover:text-white text-sm">
            Entrar
          </Link>
          <Link
            href="/cadastro"
            className="bg-[var(--primary)]/20 hover:bg-[var(--primary)]/40 text-white font-semibold py-2 px-5 rounded-full text-sm border border-[var(--primary)]/50 transition"
            style={{ backdropFilter: "blur(8px)" }}
          >
            Criar conta
          </Link>
          <button
            className="lg:hidden text-white p-2"
            onClick={() => setMobileOpen(!mobileOpen)}
            aria-label="Menu"
          >
            {mobileOpen ? <X className="w-5 h-5" /> : <Menu className="w-5 h-5" />}
          </button>
        </div>
      </div>

      {/* Mobile menu */}
      <div
        className={`lg:hidden absolute top-full left-0 right-0 bg-black/80 border-t border-white/10 overflow-hidden transition-all duration-300 ${
          mobileOpen ? "max-h-screen opacity-100" : "max-h-0 opacity-0 pointer-events-none"
        }`}
        style={{ backdropFilter: "blur(14px)" }}
      >
        <div className="px-4 py-5 flex flex-col space-y-3">
          <a href="#como-funciona" className="text-white/80 hover:text-white text-sm py-1" onClick={() => setMobileOpen(false)}>
            Como funciona
          </a>
          <a href="#tipos" className="text-white/80 hover:text-white text-sm py-1" onClick={() => setMobileOpen(false)}>
            Tipos de ensaio
          </a>
          <a href="#planos" className="text-white/80 hover:text-white text-sm py-1" onClick={() => setMobileOpen(false)}>
            Planos
          </a>
          <a href="#faq" className="text-white/80 hover:text-white text-sm py-1" onClick={() => setMobileOpen(false)}>
            FAQ
          </a>
          <Link href="/login" className="text-white/80 hover:text-white text-sm py-1" onClick={() => setMobileOpen(false)}>
            Entrar
          </Link>
        </div>
      </div>
    </nav>
  );
}

function HeroContent() {
  return (
    <div className="text-left text-white pt-20 sm:pt-24 md:pt-32 px-4 md:px-6 lg:px-8 max-w-3xl">
      <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full border border-[var(--primary)]/40 bg-[var(--primary)]/10 text-xs mb-6">
        <span className="w-1.5 h-1.5 rounded-full bg-[var(--success)] animate-pulse" />
        IA de última geração · 40+ tipos de ensaio · Pix na hora
      </div>

      <h1 className="text-4xl sm:text-5xl md:text-7xl font-bold mb-5 leading-[1.05] tracking-tight">
        Seu ensaio fotográfico <br className="hidden sm:block" />
        <span className="bg-gradient-to-r from-[var(--primary)] via-[var(--accent)] to-white bg-clip-text text-transparent">
          profissional
        </span>{" "}
        em 5 minutos.
      </h1>

      <p className="text-base sm:text-lg md:text-xl mb-7 sm:mb-8 text-white/70 max-w-xl">
        Envie <strong className="text-white">4 a 10 fotos</strong> suas e receba{" "}
        <strong className="text-white">dezenas de imagens prontas</strong> pra Instagram, currículo ou
        impressão. Sem estúdio. Sem fotógrafo. Sem make.
      </p>

      <div className="pointer-events-auto flex flex-col sm:flex-row items-start gap-3">
        <Link
          href="/cadastro"
          className="bg-[var(--primary)] hover:bg-[var(--primary-hover)] text-white font-semibold py-3 px-7 rounded-full transition duration-300 w-full sm:w-auto text-center inline-flex items-center justify-center gap-2"
        >
          <Sparkles className="w-4 h-4" />
          Criar meu primeiro ensaio
        </Link>
        <a
          href="#como-funciona"
          className="bg-white/10 hover:bg-white/20 border border-white/30 hover:border-white/50 text-white font-medium py-3 px-7 rounded-full transition duration-300 inline-flex items-center justify-center gap-2 w-full sm:w-auto"
          style={{ backdropFilter: "blur(8px)" }}
        >
          <Play className="w-4 h-4" fill="currentColor" />
          Ver como funciona
        </a>
      </div>

      <div className="flex items-center gap-4 sm:gap-6 mt-10 text-sm text-white/60 flex-wrap">
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--success)]">✓</span> Sem mensalidade
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--success)]">✓</span> Pix instantâneo
        </div>
        <div className="flex items-center gap-1.5">
          <span className="text-[var(--success)]">✓</span> A partir de R$47
        </div>
      </div>
    </div>
  );
}

export function GalaxyHero() {
  return (
    <>
      <Navbar />
      <div className="relative min-h-screen">
        <div className="absolute inset-0 z-0 pointer-events-auto">
          <HeroSplineBackground />
        </div>
        <div
          className="absolute top-0 left-0 w-full h-screen flex items-center z-10"
          style={{ pointerEvents: "none" }}
        >
          <div className="container mx-auto">
            <HeroContent />
          </div>
        </div>
      </div>
    </>
  );
}
