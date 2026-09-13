import ViralLabClient from "./client";

export const metadata = { title: "Viral Lab — Admin · EnsaioPro" };

export default function ViralLabPage() {
  return (
    <div className="min-h-screen">
      <div className="border-b border-[var(--border)] bg-[var(--background-elev)] px-4 md:px-8 py-5">
        <h1 className="font-bold text-lg">Viral Lab</h1>
        <p className="text-sm text-[var(--muted)] mt-0.5">
          Cole a URL de qualquer vídeo viral — transcrição + análise de gatilhos + copies prontas
        </p>
      </div>
      <ViralLabClient />
    </div>
  );
}
