"use client";

/**
 * GastoDrilldown — drill-down nível 2 (ensaios do user) e nível 3 (fotos
 * de um ensaio com breakdown granular). Story 03 — AC4.4.
 *
 * Fetcha lazily quando expandido.
 */

import { useEffect, useState } from "react";
import { Loader2, ChevronDown, ChevronRight, X } from "lucide-react";
import { formatBRLcents } from "@/lib/admin/cost";
import { CostBreakdownChart } from "./CostBreakdownChart";

interface EnsaioRow {
  id: string;
  name: string | null;
  status: string;
  total_prompts: number;
  total_generated: number;
  total_failed: number;
  created_at: string;
  ensaio_type: string | null;
  fotos_ok: number;
  fotos_failed: number;
  custo_total_cents: number;
  custo_nano_cents: number;
  custo_swap_cents: number;
  custo_enhance_cents: number;
  has_swap: boolean;
}

interface FotoRow {
  id: string;
  prompt_numero: number | null;
  prompt_categoria: string | null;
  status: string;
  cost_cents: number | null;
  cost_cents_nano: number | null;
  cost_cents_swap: number | null;
  cost_cents_enhance: number | null;
  swap_status: string | null;
  faces_detected: number | null;
  faces_swapped: number | null;
  error_message: string | null;
  created_at: string;
  signed_url: string | null;
}

export function GastoDrilldown({
  userId,
  email,
}: {
  userId: string;
  email: string | null;
}) {
  const [loading, setLoading] = useState(true);
  const [ensaios, setEnsaios] = useState<EnsaioRow[]>([]);
  const [error, setError] = useState<string | null>(null);
  const [openEnsaio, setOpenEnsaio] = useState<string | null>(null);
  const [modalFoto, setModalFoto] = useState<FotoRow | null>(null);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(`/api/admin/gastos/user/${userId}/ensaios`);
        const data = await res.json();
        if (aborted) return;
        if (data.error) setError(data.error);
        else setEnsaios(data.ensaios ?? []);
      } catch (e) {
        if (!aborted) setError(String(e));
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [userId]);

  if (loading) {
    return (
      <div className="px-6 py-4 flex items-center gap-2 text-sm text-[var(--muted)]">
        <Loader2 className="w-4 h-4 animate-spin" /> Carregando ensaios de {email}...
      </div>
    );
  }
  if (error) {
    return <div className="px-6 py-4 text-sm text-[var(--danger)]">Erro: {error}</div>;
  }
  if (ensaios.length === 0) {
    return (
      <div className="px-6 py-4 text-sm text-[var(--muted)]">
        Nenhum ensaio encontrado.
      </div>
    );
  }

  return (
    <div className="px-6 py-4">
      <div className="text-xs text-[var(--muted)] mb-2 uppercase tracking-wider">
        Ensaios de {email ?? "(sem email)"} · {ensaios.length}
      </div>
      <div className="border border-[var(--border)] rounded-lg overflow-hidden">
        <table className="w-full text-xs">
          <thead>
            <tr className="bg-[var(--background-elev-2)]/50">
              <th className="w-6 px-2 py-2"></th>
              <th className="text-left px-2 py-2 font-medium text-[var(--muted)]">Ensaio</th>
              <th className="text-left px-2 py-2 font-medium text-[var(--muted)]">Tipo</th>
              <th className="text-center px-2 py-2 font-medium text-[var(--muted)]">Status</th>
              <th className="text-right px-2 py-2 font-medium text-[var(--muted)]">Fotos OK</th>
              <th className="text-right px-2 py-2 font-medium text-[var(--muted)]">Custo</th>
              <th className="text-right px-2 py-2 font-medium text-[var(--muted)]">Nano</th>
              <th className="text-right px-2 py-2 font-medium text-[var(--muted)]">Swap</th>
              <th className="text-right px-2 py-2 font-medium text-[var(--muted)]">Enhance</th>
            </tr>
          </thead>
          <tbody>
            {ensaios.map((e) => {
              const isOpen = openEnsaio === e.id;
              return (
                <>
                  <tr
                    key={e.id}
                    className="border-t border-[var(--border)] cursor-pointer hover:bg-[var(--background-elev-2)]/40"
                    onClick={() => setOpenEnsaio(isOpen ? null : e.id)}
                  >
                    <td className="px-2 py-2">
                      {isOpen ? (
                        <ChevronDown className="w-3 h-3 text-[var(--muted)]" />
                      ) : (
                        <ChevronRight className="w-3 h-3 text-[var(--muted)]" />
                      )}
                    </td>
                    <td className="px-2 py-2 truncate max-w-[180px]">
                      {e.name ?? <span className="text-[var(--muted)]">(sem nome)</span>}
                      <div className="text-[10px] text-[var(--muted)]">
                        {new Date(e.created_at).toLocaleString("pt-BR")}
                      </div>
                    </td>
                    <td className="px-2 py-2 text-[var(--muted-strong)]">
                      {e.ensaio_type ?? "—"}
                    </td>
                    <td className="px-2 py-2 text-center">
                      <span
                        className={
                          e.status === "completed"
                            ? "text-[var(--success)]"
                            : e.status === "failed"
                            ? "text-[var(--danger)]"
                            : "text-[var(--warning)]"
                        }
                      >
                        {e.status}
                      </span>
                    </td>
                    <td className="px-2 py-2 text-right">{e.fotos_ok}</td>
                    <td className="px-2 py-2 text-right font-semibold">
                      {formatBRLcents(e.custo_total_cents)}
                    </td>
                    <td className="px-2 py-2 text-right text-[var(--muted-strong)]">
                      {formatBRLcents(e.custo_nano_cents)}
                    </td>
                    <td className="px-2 py-2 text-right text-[var(--muted-strong)]">
                      {formatBRLcents(e.custo_swap_cents)}
                    </td>
                    <td className="px-2 py-2 text-right text-[var(--muted-strong)]">
                      {formatBRLcents(e.custo_enhance_cents)}
                    </td>
                  </tr>
                  {isOpen && (
                    <tr>
                      <td colSpan={9} className="bg-[var(--background)]/70">
                        <FotosList
                          userId={userId}
                          ensaioId={e.id}
                          onPickFoto={setModalFoto}
                        />
                      </td>
                    </tr>
                  )}
                </>
              );
            })}
          </tbody>
        </table>
      </div>

      {modalFoto && (
        <FotoModal foto={modalFoto} onClose={() => setModalFoto(null)} />
      )}
    </div>
  );
}

function FotosList({
  userId,
  ensaioId,
  onPickFoto,
}: {
  userId: string;
  ensaioId: string;
  onPickFoto: (f: FotoRow) => void;
}) {
  const [loading, setLoading] = useState(true);
  const [fotos, setFotos] = useState<FotoRow[]>([]);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    let aborted = false;
    (async () => {
      try {
        const res = await fetch(
          `/api/admin/gastos/user/${userId}/ensaios/${ensaioId}/fotos`,
        );
        const data = await res.json();
        if (aborted) return;
        if (data.error) setError(data.error);
        else setFotos(data.fotos ?? []);
      } catch (e) {
        if (!aborted) setError(String(e));
      } finally {
        if (!aborted) setLoading(false);
      }
    })();
    return () => {
      aborted = true;
    };
  }, [userId, ensaioId]);

  if (loading) {
    return (
      <div className="px-4 py-3 text-xs text-[var(--muted)] flex items-center gap-2">
        <Loader2 className="w-3 h-3 animate-spin" /> carregando fotos...
      </div>
    );
  }
  if (error) {
    return <div className="px-4 py-3 text-xs text-[var(--danger)]">Erro: {error}</div>;
  }
  if (fotos.length === 0) {
    return <div className="px-4 py-3 text-xs text-[var(--muted)]">Sem fotos</div>;
  }

  return (
    <div className="px-4 py-3">
      <div className="grid grid-cols-3 sm:grid-cols-4 md:grid-cols-6 lg:grid-cols-8 gap-2">
        {fotos.map((f) => (
          <button
            key={f.id}
            type="button"
            onClick={() => onPickFoto(f)}
            className="group relative text-left border border-[var(--border)] rounded-lg overflow-hidden hover:border-[var(--primary)]/60 transition"
          >
            {f.signed_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                src={f.signed_url}
                alt={f.prompt_categoria ?? "foto"}
                className="w-full aspect-square object-cover"
                loading="lazy"
              />
            ) : (
              <div className="w-full aspect-square bg-[var(--background-elev-2)] flex items-center justify-center text-[10px] text-[var(--muted)]">
                {f.status !== "completed" ? f.status : "sem imagem"}
              </div>
            )}
            <div className="absolute inset-x-0 bottom-0 bg-black/60 px-1.5 py-1 opacity-0 group-hover:opacity-100 transition">
              <div className="text-[10px] text-white font-semibold">{formatBRLcents(f.cost_cents ?? 0)}</div>
              <div className="text-[10px] text-white/70">#{f.prompt_numero ?? "?"} {f.prompt_categoria ?? ""}</div>
            </div>
            {f.status !== "completed" && (
              <div className="absolute top-1 right-1 bg-[var(--danger)] rounded px-1 text-[9px] text-white">
                {f.status}
              </div>
            )}
          </button>
        ))}
      </div>
    </div>
  );
}

function FotoModal({ foto, onClose }: { foto: FotoRow; onClose: () => void }) {
  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <div
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-md fade-in"
      >
        <div className="flex items-start justify-between mb-3">
          <div>
            <h3 className="font-bold text-lg">
              Foto #{foto.prompt_numero ?? "?"}
            </h3>
            <p className="text-xs text-[var(--muted)]">
              {foto.prompt_categoria ?? "sem categoria"} ·{" "}
              {new Date(foto.created_at).toLocaleString("pt-BR")}
            </p>
          </div>
          <button onClick={onClose} className="btn btn-ghost btn-sm">
            <X className="w-4 h-4" />
          </button>
        </div>

        {foto.signed_url && (
          <a href={foto.signed_url} target="_blank" rel="noopener noreferrer" className="block mb-4">
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={foto.signed_url}
              alt={foto.prompt_categoria ?? "foto"}
              className="w-full rounded-lg object-contain max-h-80"
            />
          </a>
        )}

        <CostBreakdownChart
          nanoCents={foto.cost_cents_nano ?? 0}
          swapCents={foto.cost_cents_swap ?? 0}
          enhanceCents={foto.cost_cents_enhance ?? 0}
          totalCents={foto.cost_cents ?? 0}
        />

        <div className="grid grid-cols-2 gap-2 text-xs mt-4">
          <Stat label="Status" value={foto.status} />
          <Stat label="Swap status" value={foto.swap_status ?? "—"} />
          <Stat label="Faces detectadas" value={String(foto.faces_detected ?? "—")} />
          <Stat label="Faces trocadas" value={String(foto.faces_swapped ?? "—")} />
        </div>

        {foto.error_message && (
          <div className="mt-3 p-2 rounded bg-[var(--danger)]/10 text-xs text-[var(--danger)] break-all">
            {foto.error_message}
          </div>
        )}
      </div>
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="border border-[var(--border)] rounded p-2">
      <div className="text-[10px] uppercase text-[var(--muted)]">{label}</div>
      <div className="font-medium">{value}</div>
    </div>
  );
}
