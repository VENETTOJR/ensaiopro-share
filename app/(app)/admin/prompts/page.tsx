import type { Metadata } from "next";
import { PromptsAdminClient } from "./client";

export const metadata: Metadata = {
  title: "Prompts · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function PromptsAdminPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Prompts</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Gerencie todos os prompts dos ensaios. Edite texto, ative/desative ou crie novos modelos.
        </p>
      </div>
      <PromptsAdminClient />
    </div>
  );
}
