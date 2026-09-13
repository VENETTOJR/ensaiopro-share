"use client";

import { useState, useRef, useEffect } from "react";
import { Loader2, Search, Copy, Check, ChevronDown, ChevronUp, ExternalLink, Zap, Upload, Link as LinkIcon } from "lucide-react";
import { toast } from "sonner";

interface AnalysisResult {
  id: string | null;
  platform: string;
  analysis: {
    titulo?: string;
    duracao_estimada?: number;
    transcricao?: string;
    hook?: { segundos?: number; texto?: string; tipo?: string; analise?: string };
    estrutura?: Array<{ parte: string; segundos_inicio: number; segundos_fim: number; descricao: string }>;
    gatilhos_virais?: Array<{ gatilho: string; momento: string; descricao: string }>;
    por_que_viraliza?: string;
    pontos_fortes?: string[];
    copies_derivadas?: {
      caption_reels?: string;
      gancho_adaptado?: string;
      roteiro_30s?: string;
      cta_sugerido?: string;
      roteiro_react?: string;
    };
  };
  raw_text: string;
}

interface HistoryItem {
  id: string;
  created_at: string;
  source_url: string;
  platform: string;
  title: string | null;
  duration_s: number | null;
}

function CopyButton({ text }: { text: string }) {
  const [copied, setCopied] = useState(false);
  return (
    <button
      onClick={async () => {
        await navigator.clipboard.writeText(text);
        setCopied(true);
        setTimeout(() => setCopied(false), 2000);
      }}
      className="btn btn-ghost btn-xs shrink-0"
      title="Copiar"
    >
      {copied ? <Check className="w-3 h-3 text-green-500" /> : <Copy className="w-3 h-3" />}
    </button>
  );
}

function Section({ title, children, defaultOpen = true }: { title: string; children: React.ReactNode; defaultOpen?: boolean }) {
  const [open, setOpen] = useState(defaultOpen);
  return (
    <div className="border border-[var(--border)] rounded-xl overflow-hidden">
      <button
        onClick={() => setOpen(!open)}
        className="w-full flex items-center justify-between px-4 py-3 bg-[var(--background-elev)] hover:bg-[var(--background-elev2)] transition-colors text-sm font-semibold"
      >
        {title}
        {open ? <ChevronUp className="w-4 h-4 text-[var(--muted)]" /> : <ChevronDown className="w-4 h-4 text-[var(--muted)]" />}
      </button>
      {open && <div className="p-4">{children}</div>}
    </div>
  );
}

type Mode = "url" | "file";

export default function ViralLabClient() {
  const [mode, setMode] = useState<Mode>("url");
  const [url, setUrl] = useState("");
  const [produto, setProduto] = useState("Sistema Dublê — método para fazer R$1k/semana com automação de WhatsApp + IA. R$197. Para empreendedores e iniciantes no digital.");
  const [mecanismo, setMecanismo] = useState("");
  const [cta, setCta] = useState("");
  const [somenteTranscricao, setSomenteTranscricao] = useState(false);
  const [file, setFile] = useState<File | null>(null);
  const [filePlatform, setFilePlatform] = useState("instagram");
  const [loading, setLoading] = useState(false);
  const [result, setResult] = useState<AnalysisResult | null>(null);
  const [history, setHistory] = useState<HistoryItem[]>([]);
  const [activeHistoryId, setActiveHistoryId] = useState<string | null>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const dropRef = useRef<HTMLDivElement>(null);

  useEffect(() => { fetchHistory(); }, []);

  async function fetchHistory() {
    const res = await fetch("/api/admin/viral-analyze");
    if (res.ok) {
      const data = await res.json();
      setHistory(data.items ?? []);
    }
  }

  async function handleAnalyzeUrl() {
    const trimmed = url.trim();
    if (!trimmed) { toast.error("Cole uma URL primeiro"); return; }
    setLoading(true); setResult(null); setActiveHistoryId(null);
    try {
      const res = await fetch("/api/admin/viral-analyze", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ url: trimmed, somente_transcricao: somenteTranscricao, produto: produto.trim(), mecanismo: mecanismo.trim(), cta: cta.trim() }),
      });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro ao analisar"); return; }
      setResult(data);
      if (data.id) setActiveHistoryId(data.id);
      if (!somenteTranscricao) fetchHistory();
      toast.success(somenteTranscricao ? "Transcrição pronta!" : "Análise concluída!");
    } catch { toast.error("Erro de conexão. Tente novamente."); }
    finally { setLoading(false); }
  }

  async function handleAnalyzeFile() {
    if (!file) { toast.error("Selecione um arquivo primeiro"); return; }
    setLoading(true); setResult(null); setActiveHistoryId(null);
    try {
      const form = new FormData();
      form.append("file", file);
      form.append("platform", filePlatform);
      form.append("somente_transcricao", String(somenteTranscricao));
      if (produto.trim()) form.append("produto", produto.trim());
      if (mecanismo.trim()) form.append("mecanismo", mecanismo.trim());
      if (cta.trim()) form.append("cta", cta.trim());
      const res = await fetch("/api/admin/viral-analyze", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) { toast.error(data.error ?? "Erro ao analisar"); return; }
      setResult(data);
      if (data.id) setActiveHistoryId(data.id);
      fetchHistory();
      toast.success("Análise concluída!");
    } catch { toast.error("Erro de conexão. Tente novamente."); }
    finally { setLoading(false); }
  }

  async function loadFromHistory(item: HistoryItem) {
    setLoading(true);
    setResult(null);
    try {
      const res = await fetch(`/api/admin/viral-analyze?id=${item.id}`);
      if (res.ok) {
        const data = await res.json();
        setResult(data);
        setActiveHistoryId(item.id);
      } else {
        const err = await res.json().catch(() => ({}));
        toast.error(err.error === "unauthorized" ? "Sessão expirada — recarregue a página" : `Erro ao carregar (${res.status})`);
      }
    } catch {
      toast.error("Erro de conexão ao carregar análise");
    }
    setLoading(false);
  }

  function handleDrop(e: React.DragEvent) {
    e.preventDefault();
    const f = e.dataTransfer.files[0];
    if (f && f.type.startsWith("video/")) setFile(f);
    else toast.error("Apenas arquivos de vídeo (mp4, mov, webm)");
  }

  const a = result?.analysis;

  return (
    <div className="max-w-7xl mx-auto px-4 md:px-8 py-8 grid grid-cols-1 lg:grid-cols-[320px_1fr] gap-6">
      {/* Sidebar */}
      <div className="space-y-4">
        <div className="border border-[var(--border)] rounded-xl p-4 space-y-3 bg-[var(--background-elev)]">
          <div className="flex items-center gap-2">
            <Zap className="w-4 h-4 text-[var(--primary)]" />
            <span className="font-semibold text-sm">Nova análise</span>
          </div>

          {/* Contexto da oferta */}
          <div className="space-y-2">
            <p className="text-xs font-semibold text-[var(--muted)]">Contexto <span className="font-normal opacity-60">(personaliza os copies)</span></p>
            <div className="space-y-1">
              <label className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Produto / oferta</label>
              <textarea value={produto} onChange={(e) => setProduto(e.target.value)} rows={2}
                placeholder="Ex: Sistema Dublê R$197 — automação WhatsApp com IA"
                className="input w-full text-xs resize-none" disabled={loading} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-[var(--muted)] uppercase tracking-wide">Mecanismo / ângulo <span className="opacity-60">(opcional)</span></label>
              <input value={mecanismo} onChange={(e) => setMecanismo(e.target.value)}
                placeholder="Ex: robô que responde 300 leads enquanto você dorme"
                className="input input-sm w-full text-xs" disabled={loading} />
            </div>
            <div className="space-y-1">
              <label className="text-[10px] text-[var(--muted)] uppercase tracking-wide">CTA exato <span className="opacity-60">(opcional)</span></label>
              <input value={cta} onChange={(e) => setCta(e.target.value)}
                placeholder='Ex: comenta "ROBÔ" que eu te mando o link'
                className="input input-sm w-full text-xs" disabled={loading} />
            </div>
          </div>

          {/* Tabs modo */}
          <div className="flex gap-1 p-1 bg-[var(--background-elev2)] rounded-lg">
            <button
              onClick={() => setMode("url")}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md transition-colors ${mode === "url" ? "bg-[var(--background-elev)] font-semibold shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
            >
              <LinkIcon className="w-3 h-3" /> YouTube
            </button>
            <button
              onClick={() => setMode("file")}
              className={`flex-1 flex items-center justify-center gap-1.5 text-xs py-1.5 rounded-md transition-colors ${mode === "file" ? "bg-[var(--background-elev)] font-semibold shadow-sm" : "text-[var(--muted)] hover:text-[var(--foreground)]"}`}
            >
              <Upload className="w-3 h-3" /> Arquivo
            </button>
          </div>

          {mode === "url" ? (
            <>
              <input
                type="url"
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && handleAnalyzeUrl()}
                placeholder="Cole URL do YouTube"
                className="input input-sm w-full"
                disabled={loading}
              />
              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={somenteTranscricao} onChange={(e) => setSomenteTranscricao(e.target.checked)} className="checkbox checkbox-sm" disabled={loading} />
                <span className="text-xs text-[var(--muted)]">Só transcrever <span className="opacity-60">(sem análise GPT)</span></span>
              </label>
              <button onClick={handleAnalyzeUrl} disabled={loading || !url.trim()} className="btn btn-primary btn-sm w-full">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</> : <><Search className="w-4 h-4" /> Analisar</>}
              </button>
            </>
          ) : (
            <>
              <div
                ref={dropRef}
                onDrop={handleDrop}
                onDragOver={(e) => e.preventDefault()}
                onClick={() => fileInputRef.current?.click()}
                className={`border-2 border-dashed rounded-lg p-4 text-center cursor-pointer transition-colors ${file ? "border-[var(--primary)] bg-[var(--primary)]/5" : "border-[var(--border)] hover:border-[var(--primary)]/50"}`}
              >
                <Upload className="w-5 h-5 mx-auto mb-1 text-[var(--muted)]" />
                {file ? (
                  <p className="text-xs font-medium truncate">{file.name}</p>
                ) : (
                  <>
                    <p className="text-xs font-medium">Arraste o vídeo ou clique aqui</p>
                    <p className="text-[10px] text-[var(--muted)] mt-0.5">mp4, mov, webm — até 200MB</p>
                  </>
                )}
                <input ref={fileInputRef} type="file" accept="video/*" className="hidden"
                  onChange={(e) => { const f = e.target.files?.[0]; if (f) setFile(f); }} />
              </div>

              <div className="space-y-1">
                <label className="text-xs text-[var(--muted)]">Plataforma</label>
                <select value={filePlatform} onChange={(e) => setFilePlatform(e.target.value)} className="input input-sm w-full">
                  <option value="instagram">Instagram / Reels</option>
                  <option value="tiktok">TikTok</option>
                  <option value="youtube">YouTube (arquivo local)</option>
                  <option value="other">Outro</option>
                </select>
              </div>

              <div className="text-[10px] text-[var(--muted)] bg-[var(--background-elev2)] rounded-lg p-2 leading-relaxed">
                💡 Para baixar Reels: Chrome → extensão <strong>Video DownloadHelper</strong> ou <strong>SaveFrom</strong> → salva o mp4 → sobe aqui
              </div>

              <label className="flex items-center gap-2 cursor-pointer select-none">
                <input type="checkbox" checked={somenteTranscricao} onChange={(e) => setSomenteTranscricao(e.target.checked)} className="checkbox checkbox-sm" disabled={loading} />
                <span className="text-xs text-[var(--muted)]">Só transcrever <span className="opacity-60">(sem análise GPT)</span></span>
              </label>
              <button onClick={handleAnalyzeFile} disabled={loading || !file} className="btn btn-primary btn-sm w-full">
                {loading ? <><Loader2 className="w-4 h-4 animate-spin" /> Analisando...</> : <><Zap className="w-4 h-4" /> Analisar arquivo</>}
              </button>
            </>
          )}

          {loading && (
            <p className="text-xs text-[var(--muted)] text-center">
              {mode === "file" ? "Extraindo áudio + processando com Replicate..." : "Baixando + processando com Replicate..."}
            </p>
          )}
        </div>

        {/* Histórico */}
        <div className="border border-[var(--border)] rounded-xl overflow-hidden">
          <div className="px-4 py-3 bg-[var(--background-elev)] border-b border-[var(--border)]">
            <span className="text-sm font-semibold">Histórico</span>
          </div>
          <div className="max-h-[400px] overflow-y-auto divide-y divide-[var(--border)]">
            {history.length === 0 && (
              <p className="text-xs text-[var(--muted)] p-4 text-center">Nenhuma análise ainda</p>
            )}
            {history.map((item) => (
              <button key={item.id} onClick={() => loadFromHistory(item)}
                className={`w-full text-left px-4 py-3 hover:bg-[var(--background-elev2)] transition-colors ${activeHistoryId === item.id ? "bg-[var(--background-elev2)]" : ""}`}
              >
                <div className="flex items-center gap-1.5 mb-1">
                  <span className={`text-[10px] font-bold uppercase px-1.5 py-0.5 rounded-full ${
                    item.platform === "youtube" ? "bg-red-500/20 text-red-400" :
                    item.platform === "instagram" ? "bg-purple-500/20 text-purple-400" :
                    item.platform === "tiktok" ? "bg-cyan-500/20 text-cyan-400" :
                    "bg-zinc-500/20 text-zinc-400"
                  }`}>{item.platform}</span>
                  <span className="text-[10px] text-[var(--muted)]">
                    {new Date(item.created_at).toLocaleDateString("pt-BR")}
                  </span>
                </div>
                <p className="text-xs font-medium truncate">{item.title ?? item.source_url.slice(0, 50)}</p>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* Resultado */}
      <div className="space-y-4">
        {!result && !loading && (
          <div className="border border-dashed border-[var(--border)] rounded-xl p-12 text-center text-[var(--muted)]">
            <Zap className="w-10 h-10 mx-auto mb-3 opacity-30" />
            <p className="text-sm font-medium">Cole URL do YouTube ou suba um arquivo</p>
            <p className="text-xs mt-1 opacity-60">Instagram/TikTok: baixe o mp4 no computador e use a aba Arquivo</p>
          </div>
        )}

        {loading && (
          <div className="border border-[var(--border)] rounded-xl p-12 text-center">
            <Loader2 className="w-10 h-10 mx-auto mb-3 animate-spin text-[var(--primary)]" />
            <p className="text-sm font-medium">{somenteTranscricao ? "Transcrevendo..." : "Processando vídeo..."}</p>
            <p className="text-xs text-[var(--muted)] mt-1">
              {somenteTranscricao ? "Whisper extraindo texto do áudio" : mode === "file" ? "ffmpeg + Whisper + GPT-4o-mini" : "yt-dlp + Whisper + GPT-4o-mini"}
            </p>
          </div>
        )}

        {/* Modo só transcrição */}
        {result && "transcript" in result && !("analysis" in result) && (
          <div className="space-y-3">
            <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--background-elev)] flex items-center justify-between gap-3">
              <p className="text-sm font-semibold">Transcrição extraída — copie e cole no Claude</p>
              <CopyButton text={(result as { transcript: string }).transcript} />
            </div>
            <div className="border border-[var(--border)] rounded-xl p-4">
              <pre className="text-sm whitespace-pre-wrap leading-relaxed">{(result as { transcript: string }).transcript}</pre>
            </div>
          </div>
        )}

        {result && a && (
          <>
            <div className="border border-[var(--border)] rounded-xl p-4 bg-[var(--background-elev)]">
              <div className="flex items-start justify-between gap-3">
                <div className="flex-1 min-w-0">
                  <h2 className="font-bold text-base truncate">{a.titulo ?? "Vídeo analisado"}</h2>
                  <div className="flex items-center gap-2 mt-1">
                    {result.analysis.titulo && (
                      <a href={url || "#"} target="_blank" rel="noreferrer"
                        className="text-xs text-[var(--muted)] hover:text-[var(--foreground)] flex items-center gap-1">
                        <ExternalLink className="w-3 h-3" /> Ver original
                      </a>
                    )}
                    {a.duracao_estimada ? (
                      <span className="text-xs text-[var(--muted)]">
                        • {Math.floor(a.duracao_estimada / 60)}:{String(a.duracao_estimada % 60).padStart(2, "0")} min
                      </span>
                    ) : null}
                  </div>
                </div>
                <span className={`text-xs font-bold uppercase px-2 py-1 rounded-full ${
                  result.platform === "youtube" ? "bg-red-500/20 text-red-400" :
                  result.platform === "instagram" ? "bg-purple-500/20 text-purple-400" :
                  result.platform === "tiktok" ? "bg-cyan-500/20 text-cyan-400" :
                  "bg-zinc-500/20 text-zinc-400"
                }`}>{result.platform}</span>
              </div>
            </div>

            {a.hook && (
              <Section title="🎣 Hook (primeiros segundos)">
                <div className="space-y-3">
                  <div className="bg-[var(--background-elev2)] rounded-lg p-3 flex items-start justify-between gap-2">
                    <p className="text-sm font-medium">&quot;{a.hook.texto}&quot;</p>
                    <CopyButton text={a.hook.texto ?? ""} />
                  </div>
                  {a.hook.tipo && (
                    <div className="flex gap-2 items-center">
                      <span className="text-xs text-[var(--muted)]">Tipo:</span>
                      <span className="text-xs font-semibold px-2 py-0.5 bg-[var(--primary)]/20 text-[var(--primary)] rounded-full">{a.hook.tipo}</span>
                    </div>
                  )}
                  {a.hook.analise && <p className="text-sm text-[var(--muted)]">{a.hook.analise}</p>}
                </div>
              </Section>
            )}

            {a.estrutura && a.estrutura.length > 0 && (
              <Section title="📐 Estrutura do Vídeo">
                <div className="space-y-2">
                  {a.estrutura.map((parte, i) => (
                    <div key={i} className="flex gap-3 items-start">
                      <div className="shrink-0 w-20 text-right">
                        <span className="text-xs text-[var(--muted)]">{parte.segundos_inicio}s → {parte.segundos_fim}s</span>
                      </div>
                      <div className="flex-1 border-l border-[var(--border)] pl-3">
                        <p className="text-xs font-semibold text-[var(--primary)]">{parte.parte}</p>
                        <p className="text-sm text-[var(--muted)]">{parte.descricao}</p>
                      </div>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {a.gatilhos_virais && a.gatilhos_virais.length > 0 && (
              <Section title="⚡ Gatilhos Virais">
                <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                  {a.gatilhos_virais.map((g, i) => (
                    <div key={i} className="border border-[var(--border)] rounded-lg p-3">
                      <p className="text-xs font-bold text-[var(--primary)] mb-1">{g.gatilho}</p>
                      <p className="text-xs text-[var(--muted)] mb-1">{g.momento}</p>
                      <p className="text-sm">{g.descricao}</p>
                    </div>
                  ))}
                </div>
              </Section>
            )}

            {a.por_que_viraliza && (
              <Section title="🧠 Por que viraliza">
                <p className="text-sm leading-relaxed whitespace-pre-wrap">{a.por_que_viraliza}</p>
              </Section>
            )}

            {a.pontos_fortes && a.pontos_fortes.length > 0 && (
              <Section title="✅ Pontos Fortes" defaultOpen={false}>
                <ul className="space-y-2">
                  {a.pontos_fortes.map((p, i) => (
                    <li key={i} className="flex items-start gap-2 text-sm">
                      <span className="text-green-500 shrink-0 mt-0.5">✓</span>{p}
                    </li>
                  ))}
                </ul>
              </Section>
            )}

            {a.copies_derivadas && (
              <Section title="✍️ Copies Derivadas (prontas para usar)">
                <div className="space-y-4">
                  {Object.entries(a.copies_derivadas).map(([key, value]) =>
                    value ? (
                      <div key={key} className="space-y-1">
                        <div className="flex items-center justify-between">
                          <span className={`text-xs font-semibold uppercase tracking-wide ${key === "roteiro_react" ? "text-[var(--primary)]" : "text-[var(--muted)]"}`}>
                            {key === "caption_reels" ? "Caption Reels/TikTok" :
                             key === "gancho_adaptado" ? "Gancho Adaptado (seu nicho)" :
                             key === "roteiro_30s" ? "Roteiro 30s" :
                             key === "cta_sugerido" ? "CTA Sugerido" :
                             key === "roteiro_react" ? "🎬 Roteiro React / Tela Dividida" : key}
                          </span>
                          <CopyButton text={value} />
                        </div>
                        <div className="bg-[var(--background-elev2)] rounded-lg p-3 text-sm whitespace-pre-wrap">{value}</div>
                      </div>
                    ) : null
                  )}
                </div>
              </Section>
            )}

            {a.transcricao && (
              <Section title="📝 Transcrição Completa" defaultOpen={false}>
                <div className="flex items-start justify-between gap-3">
                  <p className="text-sm leading-relaxed whitespace-pre-wrap flex-1">{a.transcricao}</p>
                  <CopyButton text={a.transcricao} />
                </div>
              </Section>
            )}

            <Section title="🔧 JSON Bruto (debug)" defaultOpen={false}>
              <div className="relative">
                <CopyButton text={result.raw_text} />
                <pre className="text-xs bg-[var(--background-elev2)] rounded-lg p-3 overflow-x-auto whitespace-pre-wrap max-h-96">{result.raw_text}</pre>
              </div>
            </Section>
          </>
        )}
      </div>
    </div>
  );
}
