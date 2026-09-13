"use client";

import { useMemo, useState, useEffect, useRef } from "react";
import Link from "next/link";
import Image from "next/image";
import {
  Cake, Briefcase, Heart, Camera, Users, Star, UserCircle,
  Sun, Shield, Flame, Zap, Moon, Dog,
  Car, Flower2, Egg, ArrowRight, Search, Baby, GraduationCap,
  Coffee, Sparkle, Mountain, Film, Sparkles, Dumbbell, UtensilsCrossed,
  Loader2, Image as ImageIcon, TrendingUp,
  type LucideIcon,
} from "lucide-react";
import { cn } from "@/lib/utils";
import { OnboardingModal } from "@/components/OnboardingModal";

const ICONS: Record<string, LucideIcon> = {
  cake: Cake,
  briefcase: Briefcase,
  heart: Heart,
  camera: Camera,
  users: Users,
  star: Star,
  user: UserCircle,
  sun: Sun,
  shield: Shield,
  bug: Shield,
  flame: Flame,
  zap: Zap,
  moon: Moon,
  dog: Dog,
  car: Car,
  flower: Flower2,
  sparkles: Flower2,
  egg: Egg,
  "graduation-cap": GraduationCap,
  baby: Baby,
  coffee: Coffee,
  sparkle: Sparkle,
  mountain: Mountain,
  film: Film,
  dumbbell: Dumbbell,
  utensils: UtensilsCrossed,
};

type Group =
  | "todos"
  | "celebracoes"
  | "profissional"
  | "lifestyle"
  | "artistico"
  | "romantico"
  | "familia"
  | "infantil";

const GROUPS: Array<{ value: Group; label: string; icon: LucideIcon }> = [
  { value: "todos", label: "Todos", icon: Sparkles },
  { value: "celebracoes", label: "Celebrações", icon: Cake },
  { value: "profissional", label: "Profissional", icon: Briefcase },
  { value: "lifestyle", label: "Lifestyle", icon: Coffee },
  { value: "artistico", label: "Artístico", icon: Film },
  { value: "romantico", label: "Romântico", icon: Heart },
  { value: "familia", label: "Casal / Família", icon: Users },
  { value: "infantil", label: "Infantil", icon: Baby },
];

export type EnsaioTypeView = {
  id: string;
  slug: string;
  name: string;
  description: string | null;
  icon: string;
  group: Exclude<Group, "todos">;
  cover: string | null;
};

type Recente = {
  id: string;
  name: string | null;
  status: string;
  created_at: string;
  tipo_name: string;
};

export function DashboardClient({
  types,
  recentes,
  credits = 0,
  userName = null,
  totalEnsaios = 0,
  totalFotos = 0,
  processing = null,
}: {
  types: EnsaioTypeView[];
  recentes: Recente[];
  credits?: number;
  userName?: string | null;
  totalEnsaios?: number;
  totalFotos?: number;
  processing?: {
    id: string;
    name: string;
    generated: number;
    total: number;
    failed: number;
    tipo_name: string;
  } | null;
}) {
  const [search, setSearch] = useState("");
  const [group, setGroup] = useState<Group>("todos");
  const searchRef = useRef<HTMLInputElement>(null);

  // Atalho "/" foca a busca (padrão de SaaS moderno)
  useEffect(() => {
    function onKey(e: KeyboardEvent) {
      if (e.key === "/" && document.activeElement?.tagName !== "INPUT" && document.activeElement?.tagName !== "TEXTAREA") {
        e.preventDefault();
        searchRef.current?.focus();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, []);

  const greeting = useMemo(() => {
    const h = new Date().getHours();
    if (h < 6) return "Boa madrugada";
    if (h < 12) return "Bom dia";
    if (h < 18) return "Boa tarde";
    return "Boa noite";
  }, []);

  const firstName = userName?.split(" ")[0] ?? null;

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return types.filter((t) => {
      if (group !== "todos" && t.group !== group) return false;
      if (!q) return true;
      return (
        t.name.toLowerCase().includes(q) ||
        t.description?.toLowerCase().includes(q) ||
        t.slug.toLowerCase().includes(q)
      );
    });
  }, [types, search, group]);

  return (
    <div className="max-w-6xl mx-auto px-4 md:px-8 py-8 fade-in">
      <OnboardingModal show={recentes.length === 0} credits={credits} />

      {/* Hero personalizado com stats */}
      <div
        className="relative mb-6 p-5 md:p-7 rounded-2xl overflow-hidden border border-[var(--border)]"
        style={{
          background:
            "radial-gradient(at 10% 0%, rgba(217,70,239,0.18), transparent 55%), radial-gradient(at 90% 100%, rgba(244,114,182,0.12), transparent 55%), var(--background-elev)",
        }}
      >
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
          <div>
            <div className="text-xs uppercase tracking-wider text-[var(--muted)] mb-1">
              {greeting}{firstName ? `, ${firstName}` : ""}
            </div>
            <h1 className="text-2xl md:text-3xl font-bold leading-tight">
              O que vamos <span className="text-gradient">criar</span> hoje?
            </h1>
            <p className="text-sm text-[var(--muted)] mt-1">
              Escolha um tema e envie suas fotos — a IA faz o resto.
            </p>
          </div>
          <div className="flex items-center gap-2 md:gap-3">
            <StatBadge
              icon={<Sparkles className="w-3.5 h-3.5 text-[var(--primary)]" />}
              label="Créditos"
              value={credits}
              highlight
            />
            <StatBadge
              icon={<ImageIcon className="w-3.5 h-3.5 text-[var(--accent)]" />}
              label="Ensaios"
              value={totalEnsaios}
            />
            <StatBadge
              icon={<TrendingUp className="w-3.5 h-3.5 text-[var(--success)]" />}
              label="Fotos"
              value={totalFotos}
            />
          </div>
        </div>
      </div>

      {/* Continue de onde parou — se tem ensaio processing */}
      {processing && (
        <Link
          href={`/ensaios/${processing.id}`}
          className="block mb-5 p-4 rounded-xl border border-[var(--primary)]/40 bg-[var(--primary)]/5 hover:bg-[var(--primary)]/10 transition group"
        >
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-lg bg-[var(--primary)]/15 flex items-center justify-center">
              <Loader2 className="w-5 h-5 text-[var(--primary)] animate-spin" />
            </div>
            <div className="flex-1 min-w-0">
              <div className="text-xs text-[var(--muted)] mb-0.5">
                Continue de onde parou
              </div>
              <div className="font-semibold truncate">{processing.name}</div>
              <div className="text-xs text-[var(--muted)] mt-1">
                Gerando {processing.generated} de {processing.total} · {processing.tipo_name}
              </div>
            </div>
            <ArrowRight className="w-5 h-5 text-[var(--primary)] group-hover:translate-x-1 transition-transform shrink-0" />
          </div>
          {/* Barrinha */}
          <div className="mt-3 h-1.5 rounded-full bg-[var(--background-elev-2)] overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] transition-all"
              style={{
                width: `${Math.min(100, ((processing.generated + processing.failed) / Math.max(1, processing.total)) * 100)}%`,
              }}
            />
          </div>
        </Link>
      )}

      {/* Busca + filtros com sticky header */}
      <div className="sticky top-0 z-20 -mx-4 md:-mx-8 px-4 md:px-8 py-3 mb-5 bg-[var(--background)]/90 backdrop-blur-lg border-b border-[var(--border)]">
        <div className="relative mb-3">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
          <input
            ref={searchRef}
            type="text"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Buscar (café, praia, bebê, corporativo...)"
            className="input pl-9 pr-12"
          />
          <kbd className="hidden md:inline-flex absolute right-3 top-1/2 -translate-y-1/2 items-center justify-center text-[10px] px-1.5 py-0.5 rounded border border-[var(--border)] bg-[var(--background-elev-2)] text-[var(--muted)] font-mono">
            /
          </kbd>
        </div>
        <div className="flex gap-1.5 overflow-x-auto pb-1 -mx-1 px-1 scrollbar-none">
          {GROUPS.map((g) => {
            const count = g.value === "todos" ? types.length : types.filter((t) => t.group === g.value).length;
            if (count === 0 && g.value !== "todos") return null;
            const Icon = g.icon;
            return (
              <button
                key={g.value}
                onClick={() => setGroup(g.value)}
                className={cn(
                  "shrink-0 inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full text-sm font-medium transition border whitespace-nowrap",
                  group === g.value
                    ? "bg-gradient-to-r from-[var(--primary)] to-[var(--accent)] text-white border-transparent shadow-md shadow-[var(--primary)]/20"
                    : "bg-[var(--background-elev)] text-[var(--muted-strong)] border-[var(--border)] hover:border-[var(--border-strong)] hover:text-[var(--foreground)]"
                )}
              >
                <Icon className="w-3.5 h-3.5" />
                {g.label}
                <span className={cn("text-xs", group === g.value ? "opacity-80" : "opacity-50")}>{count}</span>
              </button>
            );
          })}
        </div>
      </div>

      {/* Grid visual de tipos — com animação stagger */}
      {filtered.length > 0 ? (
        <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 md:gap-4 mb-10">
          {filtered.map((t, i) => (
            <TipoCard key={t.id} t={t} delay={i * 30} />
          ))}
        </div>
      ) : (
        <div className="card text-center py-12 text-[var(--muted)] mb-10">
          <Search className="w-7 h-7 mx-auto mb-2 opacity-50" />
          Nenhum tipo de ensaio bate com esses filtros.
        </div>
      )}

      {/* Story 06 — link discreto modo avançado */}
      <div className="text-center mb-10 -mt-4">
        <Link
          href="/ensaios/novo/freestyle"
          className="text-xs text-[var(--muted)] hover:text-[var(--text)] underline-offset-2 hover:underline"
        >
          modo avançado
        </Link>
      </div>


      {recentes.length > 0 && (
        <div>
          <div className="flex items-center justify-between mb-4">
            <h2 className="text-xl font-bold">Seus ensaios recentes</h2>
            <Link href="/ensaios" className="text-sm link flex items-center gap-1">
              Ver todos <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-3">
            {recentes.map((e) => (
              <Link
                key={e.id}
                href={`/ensaios/${e.id}`}
                className="card hover:border-[var(--primary)]/50 transition"
              >
                <div className="text-xs uppercase tracking-wider text-[var(--muted)] mb-1">
                  {e.tipo_name}
                </div>
                <div className="font-semibold">{e.name ?? "Sem nome"}</div>
                <div className="text-xs text-[var(--muted)] mt-2 capitalize">
                  Status: <span className="text-[var(--foreground)]">{e.status}</span>
                </div>
              </Link>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function TipoCard({ t, delay = 0 }: { t: EnsaioTypeView; delay?: number }) {
  const Icon = ICONS[t.icon] ?? Camera;
  return (
    <Link
      href={`/ensaios/novo/${t.slug}`}
      style={{ animationDelay: `${delay}ms` }}
      className="group relative aspect-[3/4] rounded-2xl overflow-hidden bg-[var(--background-elev)] border border-[var(--border)] hover:border-[var(--primary)]/60 transition-all fade-in-up"
    >
      {/* Cover image — se tem, ocupa o card inteiro; senão, fallback gradiente */}
      {t.cover ? (
        <Image
          src={t.cover}
          alt={t.name}
          fill
          className="object-cover transition-transform duration-500 group-hover:scale-105"
          sizes="(max-width: 768px) 50vw, 25vw"
          unoptimized
        />
      ) : (
        <div className="absolute inset-0 bg-gradient-to-br from-[var(--primary)]/20 via-[var(--background-elev-2)] to-[var(--accent)]/20 flex items-center justify-center">
          <Icon className="w-12 h-12 text-[var(--primary)] opacity-70" />
        </div>
      )}

      {/* Overlay gradiente escuro pro texto ler */}
      <div className="absolute inset-0 bg-gradient-to-t from-black/85 via-black/40 to-transparent" />

      {/* Ícone pequeno canto superior — ajuda diferenciar quando imagens se parecem */}
      <div className="absolute top-2 left-2 w-8 h-8 rounded-lg bg-black/50 backdrop-blur flex items-center justify-center">
        <Icon className="w-4 h-4 text-white" />
      </div>

      {/* Conteúdo */}
      <div className="absolute inset-x-0 bottom-0 p-3 md:p-4">
        <div className="font-bold text-sm md:text-base text-white leading-tight drop-shadow-md">
          {t.name}
        </div>
        {t.description && (
          <div className="text-xs text-white/70 mt-1 line-clamp-2 drop-shadow">
            {t.description}
          </div>
        )}
      </div>

      {/* Hover CTA */}
      <div className="absolute inset-x-0 top-1/2 -translate-y-1/2 flex justify-center opacity-0 group-hover:opacity-100 transition">
        <div className="px-3 py-1.5 rounded-full bg-white/95 text-[var(--primary)] text-xs font-bold backdrop-blur">
          Criar ensaio →
        </div>
      </div>
    </Link>
  );
}

function StatBadge({
  icon,
  label,
  value,
  highlight = false,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  highlight?: boolean;
}) {
  return (
    <div
      className={cn(
        "flex flex-col items-start gap-0.5 px-3 py-2 rounded-xl border min-w-[75px]",
        highlight
          ? "border-[var(--primary)]/40 bg-[var(--primary)]/10"
          : "border-[var(--border)] bg-[var(--background-elev-2)]",
      )}
    >
      <div className="flex items-center gap-1 text-[10px] uppercase tracking-wider text-[var(--muted)]">
        {icon}
        {label}
      </div>
      <div className="text-lg md:text-xl font-bold leading-none">{value}</div>
    </div>
  );
}
