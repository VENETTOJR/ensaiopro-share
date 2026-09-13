import type { Metadata } from "next";
import { FotosAprovarClient } from "./client";

export const metadata: Metadata = {
  title: "Aprovar Fotos · Admin",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

export default function FotosAprovarPage() {
  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-6">
      <div className="mb-6">
        <h1 className="text-2xl font-bold">Aprovar fotos como exemplo</h1>
        <p className="text-sm text-[var(--muted)] mt-1">
          Escolha a melhor foto gerada pra virar o preview (example) de um prompt.
        </p>
      </div>
      <FotosAprovarClient />
    </div>
  );
}
