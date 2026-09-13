"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Search, Coins, Loader2, Shield, Plus, Minus, Pencil, X } from "lucide-react";
import { cn } from "@/lib/utils";

interface User {
  id: string;
  email: string | null;
  name: string | null;
  photo_credits: number;
  role: string;
  phone: string | null;
  document: string | null;
  created_at_formatted: string;
}

type CreditAction =
  | { mode: "add"; amount: number }
  | { mode: "remove"; amount: number }
  | { mode: "set"; amount: number };

export function AdminUsuariosTable({
  users,
  initialQuery,
}: {
  users: User[];
  initialQuery: string;
}) {
  const router = useRouter();
  const [search, setSearch] = useState(initialQuery);
  const [busy, setBusy] = useState<string | null>(null);
  const [editing, setEditing] = useState<User | null>(null);

  async function applyCreditChange(user: User, action: CreditAction) {
    setBusy(user.id);
    try {
      const body: Record<string, unknown> = { userId: user.id };
      if (action.mode === "add") body.delta = action.amount;
      else if (action.mode === "remove") body.delta = -action.amount;
      else body.setTo = action.amount;

      const res = await fetch("/api/admin/credits", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error ?? "falha");
      toast.success(`${user.email}: ${data.credits} créditos`);
      router.refresh();
      setEditing(null);
    } catch (err) {
      toast.error(err instanceof Error ? err.message : "erro");
    } finally {
      setBusy(null);
    }
  }

  return (
    <>
      <form
        onSubmit={(e) => {
          e.preventDefault();
          const params = new URLSearchParams();
          if (search) params.set("q", search);
          router.push(`/admin/usuarios?${params}`);
        }}
        className="mb-4 relative max-w-md"
      >
        <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-[var(--muted)]" />
        <input
          type="text"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="Buscar por email ou nome..."
          className="input pl-9"
        />
      </form>

      <div className="card overflow-hidden p-0">
        <div className="overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="border-b border-[var(--border)] bg-[var(--background-elev-2)]">
                <th className="text-left px-4 py-3 font-medium text-[var(--muted)]">Nome</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted)]">Email</th>
                <th className="text-center px-4 py-3 font-medium text-[var(--muted)]">Tipo</th>
                <th className="text-right px-4 py-3 font-medium text-[var(--muted)]">Créditos</th>
                <th className="text-left px-4 py-3 font-medium text-[var(--muted)] hidden md:table-cell">Criado</th>
                <th className="px-4 py-3"></th>
              </tr>
            </thead>
            <tbody>
              {users.map((u) => (
                <tr key={u.id} className="border-b border-[var(--border)] hover:bg-[var(--background-elev-2)]/30">
                  <td className="px-4 py-3 font-medium">{u.name ?? "—"}</td>
                  <td className="px-4 py-3 text-[var(--muted-strong)] truncate max-w-xs">{u.email}</td>
                  <td className="px-4 py-3 text-center">
                    {u.role === "admin" ? (
                      <span className="text-xs px-2 py-0.5 rounded-md font-medium bg-[var(--primary)]/15 text-[var(--primary)] border border-[var(--primary)]/30 inline-flex items-center gap-1">
                        <Shield className="w-3 h-3" />
                        admin
                      </span>
                    ) : (
                      <span className="text-xs text-[var(--muted)]">usuário</span>
                    )}
                  </td>
                  <td className="px-4 py-3 text-right font-bold">{u.photo_credits}</td>
                  <td className="px-4 py-3 text-xs text-[var(--muted)] hidden md:table-cell">{u.created_at_formatted}</td>
                  <td className="px-4 py-3 text-right">
                    <button
                      onClick={() => setEditing(u)}
                      disabled={busy === u.id}
                      className="btn btn-secondary btn-sm"
                    >
                      {busy === u.id ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Pencil className="w-3.5 h-3.5" />Editar</>}
                    </button>
                  </td>
                </tr>
              ))}
              {users.length === 0 && (
                <tr>
                  <td colSpan={6} className="px-4 py-8 text-center text-[var(--muted)]">
                    Nenhum usuário encontrado.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {editing && (
        <EditCreditsModal
          user={editing}
          onClose={() => setEditing(null)}
          onApply={applyCreditChange}
          busy={busy === editing.id}
        />
      )}
    </>
  );
}

function EditCreditsModal({
  user,
  onClose,
  onApply,
  busy,
}: {
  user: User;
  onClose: () => void;
  onApply: (user: User, action: CreditAction) => void;
  busy: boolean;
}) {
  const [mode, setMode] = useState<"add" | "remove" | "set">("add");
  const [amount, setAmount] = useState("");

  function submit(e: React.FormEvent) {
    e.preventDefault();
    const n = Number(amount);
    if (!Number.isFinite(n) || n < 0) return;
    onApply(user, { mode, amount: Math.round(n) });
  }

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 backdrop-blur-sm px-4"
      onClick={onClose}
    >
      <form
        onSubmit={submit}
        onClick={(e) => e.stopPropagation()}
        className="card w-full max-w-md fade-in"
      >
        <div className="flex items-start justify-between mb-4">
          <div>
            <h3 className="font-bold text-lg">Editar créditos</h3>
            <p className="text-sm text-[var(--muted)]">
              {user.name ?? user.email}
            </p>
            <p className="text-xs text-[var(--muted)] mt-1">
              Saldo atual: <span className="font-bold text-[var(--foreground)]">{user.photo_credits}</span>
            </p>
          </div>
          <button type="button" onClick={onClose} className="btn btn-ghost btn-sm">
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="grid grid-cols-3 gap-2 mb-4">
          <button
            type="button"
            onClick={() => setMode("add")}
            className={cn(
              "btn btn-sm justify-center",
              mode === "add" ? "btn-primary" : "btn-secondary"
            )}
          >
            <Plus className="w-3.5 h-3.5" /> Adicionar
          </button>
          <button
            type="button"
            onClick={() => setMode("remove")}
            className={cn(
              "btn btn-sm justify-center",
              mode === "remove" ? "btn-primary" : "btn-secondary"
            )}
          >
            <Minus className="w-3.5 h-3.5" /> Remover
          </button>
          <button
            type="button"
            onClick={() => setMode("set")}
            className={cn(
              "btn btn-sm justify-center",
              mode === "set" ? "btn-primary" : "btn-secondary"
            )}
          >
            Definir
          </button>
        </div>

        <label className="form-label">
          {mode === "add" && "Créditos a adicionar"}
          {mode === "remove" && "Créditos a remover"}
          {mode === "set" && "Novo saldo total"}
        </label>
        <input
          type="number"
          min={0}
          value={amount}
          onChange={(e) => setAmount(e.target.value)}
          placeholder="Ex: 60"
          className="input mb-4"
          autoFocus
          required
        />

        {mode !== "set" && amount && (
          <div className="text-sm text-[var(--muted)] mb-4">
            Novo saldo: <span className="font-bold text-[var(--foreground)]">
              {mode === "add"
                ? user.photo_credits + Number(amount)
                : Math.max(0, user.photo_credits - Number(amount))}
            </span>
          </div>
        )}

        <div className="flex gap-2 justify-end">
          <button type="button" onClick={onClose} className="btn btn-secondary btn-sm">
            Cancelar
          </button>
          <button type="submit" disabled={busy} className="btn btn-primary btn-sm">
            {busy ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <><Coins className="w-3.5 h-3.5" />Salvar</>}
          </button>
        </div>
      </form>
    </div>
  );
}
