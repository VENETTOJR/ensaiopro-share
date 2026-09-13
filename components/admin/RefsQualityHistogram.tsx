/**
 * RefsQualityHistogram — tab "Qualidade de refs" do /admin/gastos.
 * Story 03 — AC6.6 (Feature 6).
 *
 * Soft-dependency da Story 01: lê `admin_refs_quality_user`. Se a view
 * ainda não existir (Story 01 não rodou), mostra empty state amigável.
 *
 * Server Component.
 */

import { createAdminClient } from "@/lib/supabase/server";

interface Row {
  user_id: string;
  email: string | null;
  name: string | null;
  green: number;
  yellow: number;
  red: number;
  unknown: number;
}

export async function RefsQualityHistogram() {
  const admin = await createAdminClient();
  const { data, error } = await admin
    .from("admin_refs_quality_user")
    .select("user_id, email, name, green, yellow, red, unknown")
    .limit(200);

  if (error) {
    return (
      <div className="card text-sm text-[var(--muted)]">
        <div className="font-semibold mb-1">Story 01 ainda não aplicada</div>
        <p>
          Esta tab depende de <code>fotos_referencia.quality_label</code> e da view{" "}
          <code>admin_refs_quality_user</code>, que serão criadas pela Story 01
          (validação visual de refs).
        </p>
        <p className="text-xs mt-2 opacity-70">Detalhe técnico: {error.message}</p>
      </div>
    );
  }

  const rows = (data ?? []) as Row[];
  if (rows.length === 0) {
    return (
      <div className="card text-sm text-[var(--muted)]">
        Sem dados de qualidade ainda.
      </div>
    );
  }

  return (
    <div className="card overflow-hidden p-0">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead>
            <tr className="border-b border-[var(--border)] bg-[var(--background-elev-2)]">
              <th className="text-left px-3 py-3 font-medium text-[var(--muted)]">Usuário</th>
              <th className="text-left px-3 py-3 font-medium text-[var(--muted)] w-1/2">
                Distribuição
              </th>
              <th className="text-right px-3 py-3 font-medium text-[var(--muted)]">Verde</th>
              <th className="text-right px-3 py-3 font-medium text-[var(--muted)]">Amarelo</th>
              <th className="text-right px-3 py-3 font-medium text-[var(--muted)]">Vermelho</th>
            </tr>
          </thead>
          <tbody>
            {rows.map((r) => {
              const total = r.green + r.yellow + r.red + r.unknown;
              const safe = total > 0 ? total : 1;
              const widthGreen = (r.green / safe) * 100;
              const widthYellow = (r.yellow / safe) * 100;
              const widthRed = (r.red / safe) * 100;
              const widthUnknown = (r.unknown / safe) * 100;
              return (
                <tr key={r.user_id} className="border-b border-[var(--border)]">
                  <td className="px-3 py-3">
                    <div className="font-medium truncate max-w-[200px]">
                      {r.name ?? "—"}
                    </div>
                    <div className="text-xs text-[var(--muted)] truncate max-w-[200px]">
                      {r.email ?? "(sem email)"}
                    </div>
                  </td>
                  <td className="px-3 py-3">
                    <div className="h-3 rounded-md overflow-hidden flex border border-[var(--border)] bg-[var(--background-elev-2)]">
                      {widthGreen > 0 && (
                        <div style={{ width: `${widthGreen}%`, background: "var(--success)" }} />
                      )}
                      {widthYellow > 0 && (
                        <div style={{ width: `${widthYellow}%`, background: "var(--warning)" }} />
                      )}
                      {widthRed > 0 && (
                        <div style={{ width: `${widthRed}%`, background: "var(--danger)" }} />
                      )}
                      {widthUnknown > 0 && (
                        <div style={{ width: `${widthUnknown}%`, background: "var(--muted)" }} />
                      )}
                    </div>
                  </td>
                  <td className="px-3 py-3 text-right text-[var(--success)] font-semibold">
                    {r.green}
                  </td>
                  <td className="px-3 py-3 text-right text-[var(--warning)] font-semibold">
                    {r.yellow}
                  </td>
                  <td className="px-3 py-3 text-right text-[var(--danger)] font-semibold">
                    {r.red}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
