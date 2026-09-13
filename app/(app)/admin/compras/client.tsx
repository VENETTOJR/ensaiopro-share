"use client";

import { useState, useEffect } from "react";
import { CheckCircle2, Clock, XCircle, RefreshCw, ChevronDown, ChevronUp, Images } from "lucide-react";
import { formatBRL, formatDate, cn } from "@/lib/utils";

const STATUS: Record<string, { label: string; color: string; icon: typeof Clock }> = {
  pending: { label: "Pendente", color: "text-[var(--warning)]", icon: Clock },
  paid: { label: "Pago", color: "text-[var(--success)]", icon: CheckCircle2 },
  failed: { label: "Falhou", color: "text-[var(--danger)]", icon: XCircle },
  cancelled: { label: "Cancelada", color: "text-[var(--muted)]", icon: XCircle },
  refunded: { label: "Reembolsada", color: "text-[var(--muted)]", icon: RefreshCw },
};

interface Compra {
  id: string;
  valor_cents: number;
  quantidade: number;
  status: string;
  metodo: string | null;
  paid_at: string | null;
  created_at: string;
  plans: { name?: string } | null;
  profiles: { id: string; email?: string; name?: string } | null;
}

interface FotoItem {
  id: string;
  storage_path: string;
  signed_url: string;
  prompt_categoria: string | null;
  prompt_numero: number | null;
}

interface EnsaioItem {
  id: string;
  name: string | null;
  status: string;
  total_generated: number;
  total_failed: number;
  created_at: string;
  ensaio_type: { name: string; slug: string } | null;
  fotos: FotoItem[];
}

function FotosPanel({ userId }: { userId: string }) {
  const [loading, setLoading] = useState(true);
  const [loaded, setLoaded] = useState(false);
  const [ensaios, setEnsaios] = useState<EnsaioItem[]>([]);
  const [error, setError] = useState("");

  useEffect(() => {
    let cancelled = false;
    setLoading(true);
    fetch(`/api/admin/fotos-usuario?user_id=${userId}`, { cache: "no-store" })
      .then((res) => res.json().then((json) => ({ ok: res.ok, json })))
      .then(({ ok, json }) => {
        if (cancelled) return;
        if (!ok) throw new Error(json.error ?? "Erro");
        setEnsaios(json.ensaios ?? []);
        setLoaded(true);
      })
      .catch((e) => {
        if (!cancelled) setError(e instanceof Error ? e.message : "Erro ao carregar fotos");
      })
      .finally(() => {
        if (!cancelled) setLoading(false);
      });
    return () => { cancelled = true; };
  }, [userId]);

  if (loading) {
    return (
      <div className="px-6 py-4 text-sm text-[var(--muted)]">Carregando fotos...</div>
    );
  }

  if (error) {
    return (
      <div className="px-6 py-4 text-sm text-[var(--danger)]">{error}</div>
    );
  }

  if (ensaios.length === 0) {
    return (
      <div className="px-6 py-4 text-sm text-[var(--muted)]">Nenhum ensaio gerado por este cliente.</div>
    );
  }

  return (
    <div className="px-6 py-4 space-y-5 bg-[var(--background-elev-1)]">
      {ensaios.map((e) => (
        <div key={e.id}>
          <div className="flex items-center gap-2 mb-2">
            <span className="text-xs font-semibold text-[var(--foreground)]">
              {e.ensaio_type?.name ?? e.name ?? "Ensaio"}
            </span>
            {e.name && e.ensaio_type && (
              <span className="text-xs text-[var(--muted)]">· {e.name}</span>
            )}
            <span className="text-xs text-[var(--muted)]">
              · {formatDate(e.created_at)}
            </span>
            <span className={cn(
              "ml-auto text-xs font-medium",
              e.status === "completed" ? "text-[var(--success)]" : "text-[var(--muted)]"
            )}>
              {e.total_generated} fotos
              {e.total_failed > 0 && (
                <span className="text-[var(--danger)] ml-1">({e.total_failed} falhas)</span>
              )}
            </span>
          </div>

          {e.fotos.length === 0 ? (
            <p className="text-xs text-[var(--muted)]">Sem fotos completas neste ensaio.</p>
          ) : (
            <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
              {e.fotos.map((f) => (
                <a
                  key={f.id}
                  href={f.signed_url}
                  target="_blank"
                  rel="noopener noreferrer"
                  title={f.prompt_categoria ? `${f.prompt_categoria} #${f.prompt_numero}` : f.id}
                  className="block aspect-square overflow-hidden rounded-lg border border-[var(--border)] hover:border-[var(--primary)] transition"
                >
                  {/* eslint-disable-next-line @next/next/no-img-element */}
                  <img
                    src={f.signed_url}
                    alt={f.prompt_categoria ?? "foto"}
                    className="w-full h-full object-cover"
                    loading="lazy"
                  />
                </a>
              ))}
            </div>
          )}
        </div>
      ))}
    </div>
  );
}

function CompraRow({ c }: { c: Compra }) {
  const [expanded, setExpanded] = useState(false);
  const st = STATUS[c.status] ?? STATUS.pending;
  const Icon = st.icon;
  const profile = c.profiles;
  const plan = c.plans;
  const userId = c.profiles?.id;

  return (
    <>
      <tr className="border-b border-[var(--border)] hover:bg-[var(--background-elev-2)]/30">
        <td className="px-4 py-3">
          <div className="font-medium">{profile?.name ?? "—"}</div>
          <div className="text-xs text-[var(--muted)] truncate max-w-[200px]">{profile?.email}</div>
        </td>
        <td className="px-4 py-3">{plan?.name ?? `${c.quantidade} créditos`}</td>
        <td className="px-4 py-3 text-right font-bold">{formatBRL(c.valor_cents / 100)}</td>
        <td className="px-4 py-3 text-center text-xs capitalize text-[var(--muted)]">
          {c.metodo === "pix" ? "Pix" : c.metodo === "credit_card" ? "Cartão" : c.metodo ?? "—"}
        </td>
        <td className="px-4 py-3 text-center">
          <span className={cn("inline-flex items-center gap-1 text-xs font-medium", st.color)}>
            <Icon className="w-3 h-3" />
            {st.label}
          </span>
        </td>
        <td className="px-4 py-3 text-xs text-[var(--muted)] hidden md:table-cell">
          {formatDate(c.paid_at ?? c.created_at)}
        </td>
        <td className="px-4 py-3 text-center">
          <button
            onClick={() => setExpanded((v) => !v)}
            className="inline-flex items-center gap-1 text-xs text-[var(--primary)] hover:opacity-75 transition"
            title="Ver fotos geradas"
          >
            <Images className="w-4 h-4" />
            {expanded ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
          </button>
        </td>
      </tr>
      {expanded && userId && (
        <tr className="border-b border-[var(--border)]">
          <td colSpan={7} className="p-0">
            <FotosPanel userId={userId} />
          </td>
        </tr>
      )}
    </>
  );
}

export function ComprasTable({ compras }: { compras: Compra[] }) {
  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--background-elev-2)]">
              <th className="text-left px-4 py-3 font-medium text-[var(--muted)]">Cliente</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--muted)]">Plano</th>
              <th className="text-right px-4 py-3 font-medium text-[var(--muted)]">Valor</th>
              <th className="text-center px-4 py-3 font-medium text-[var(--muted)]">Método</th>
              <th className="text-center px-4 py-3 font-medium text-[var(--muted)]">Status</th>
              <th className="text-left px-4 py-3 font-medium text-[var(--muted)] hidden md:table-cell">Data</th>
              <th className="text-center px-4 py-3 font-medium text-[var(--muted)]">Fotos</th>
            </tr>
          </thead>
          <tbody>
            {compras.map((c) => (
              <CompraRow key={c.id} c={c} />
            ))}
          </tbody>
        </table>
      </div>
    </div>
  );
}
