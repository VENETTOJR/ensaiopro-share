/**
 * POST /api/admin/viral-analyze
 * Transcrição: Replicate Whisper
 * Análise: OpenAI GPT-4o-mini
 */

import { NextResponse, type NextRequest } from "next/server";
import { createClient, createAdminClient } from "@/lib/supabase/server";
import Replicate from "replicate";
import OpenAI from "openai";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

export const runtime = "nodejs";
export const maxDuration = 300;

const execFileAsync = promisify(execFile);
const MAX_UPLOAD_BYTES = 200 * 1024 * 1024;

interface ContextoOferta {
  produto?: string;
  mecanismo?: string;
  cta?: string;
}

const ANALYSIS_PROMPT = (transcript: string, ctx?: ContextoOferta) => {
  const temContexto = ctx && (ctx.produto || ctx.mecanismo || ctx.cta);
  const blocoContexto = temContexto ? `
CONTEXTO DO MEU NEGÓCIO (use OBRIGATORIAMENTE em todos os copies):
${ctx.produto ? `- PRODUTO/OFERTA: ${ctx.produto}` : ""}
${ctx.mecanismo ? `- MECANISMO ÚNICO (ângulo a destacar): ${ctx.mecanismo}` : ""}
${ctx.cta ? `- CTA EXATO que quero usar: ${ctx.cta}` : ""}

` : "";

  return `Analise esta transcrição de vídeo viral e retorne APENAS um JSON válido (sem markdown).
${blocoContexto}
TRANSCRIÇÃO:
${transcript.slice(0, 8000)}

JSON de saída:

{
  "titulo": "título ou descrição resumida do conteúdo",
  "duracao_estimada": 0,
  "transcricao": ${JSON.stringify(transcript.slice(0, 5000))},
  "hook": {
    "segundos": 5,
    "texto": "exatamente o que é dito no início (primeiros 3-5 segundos)",
    "tipo": "pergunta|afirmação_chocante|demonstração|storytelling|controversia|outro",
    "analise": "por que esse hook funciona para prender a atenção"
  },
  "estrutura": [
    { "parte": "Abertura", "segundos_inicio": 0, "segundos_fim": 10, "descricao": "o que acontece" },
    { "parte": "Desenvolvimento", "segundos_inicio": 10, "segundos_fim": 50, "descricao": "o que acontece" },
    { "parte": "CTA/Fechamento", "segundos_inicio": 50, "segundos_fim": 60, "descricao": "o que acontece" }
  ],
  "gatilhos_virais": [
    { "gatilho": "nome do gatilho", "momento": "onde aparece", "descricao": "como foi usado" }
  ],
  "por_que_viraliza": "análise de 2-3 parágrafos explicando os mecanismos de viralidade deste vídeo",
  "pontos_fortes": ["ponto 1", "ponto 2", "ponto 3"],
  "copies_derivadas": {
    "caption_reels": "caption COMPLETA pronta para Instagram/TikTok — use emojis, quebras de linha, hashtags e${ctx?.cta ? ` termine com o CTA: ${ctx.cta}` : " CTA forte"}",
    "gancho_adaptado": "reescreva o hook deste vídeo adaptado${ctx?.mecanismo ? ` para destacar: ${ctx.mecanismo}` : " para o nicho de automação/marketing digital"}. Deve ser uma frase de impacto pra usar na abertura do seu vídeo",
    "roteiro_30s": "roteiro completo palavra por palavra — 30 segundos — baseado na ESTRUTURA deste vídeo${ctx?.produto ? `, vendendo ${ctx.produto}` : ""}${ctx?.mecanismo ? `, com ângulo: ${ctx.mecanismo}` : ""}${ctx?.cta ? `. Feche com: ${ctx.cta}` : ""}",
    "cta_sugerido": "${ctx?.cta ? ctx.cta : "call-to-action direto e forte no estilo deste criador"}",
    "roteiro_react": "roteiro de react/tela dividida em 4 cenas: CENA 1 (0-3s): o que você fala na câmera apontando pro vídeo original. CENA 2 (3-15s): qual trecho exato do vídeo roda do lado e o que está acontecendo. CENA 3 (15-25s): sua reação e análise falada em cima do momento mais forte. CENA 4 (25-35s): você conecta com${ctx?.mecanismo ? ` ${ctx.mecanismo}` : " sua solução"} e${ctx?.cta ? ` faz o CTA: ${ctx.cta}` : " faz o CTA"}. Inclua palavra por palavra o que você vai falar em cada cena."
  }
}`;
};

function detectPlatform(url: string): string {
  if (/youtu\.?be|youtube\.com/i.test(url)) return "youtube";
  if (/instagram\.com/i.test(url)) return "instagram";
  if (/tiktok\.com/i.test(url)) return "tiktok";
  return "other";
}

function sanitizeUrl(url: string): boolean {
  try {
    const p = new URL(url);
    return ["http:", "https:"].includes(p.protocol);
  } catch { return false; }
}

function replicateClient(): Replicate {
  const token = process.env.REPLICATE_API_TOKEN;
  if (!token) throw new Error("REPLICATE_API_TOKEN não configurado");
  return new Replicate({ auth: token });
}

function openaiClient(): OpenAI {
  const key = process.env.OPENAI_API_KEY;
  if (!key) throw new Error("OPENAI_API_KEY não configurado");
  return new OpenAI({ apiKey: key });
}

async function trySubtitles(url: string, tmpId: string): Promise<string | null> {
  const tmpDir = os.tmpdir();
  const out = path.join(tmpDir, tmpId);
  try {
    await execFileAsync("yt-dlp", [
      "--skip-download", "--write-auto-sub", "--write-sub",
      "--sub-lang", "pt,pt-BR,en", "--convert-subs", "srt",
      "--no-warnings", "--quiet", "-o", out, url,
    ], { timeout: 30_000 });

    const files = fs.readdirSync(tmpDir).filter((f) => f.startsWith(tmpId) && f.endsWith(".srt"));
    if (!files.length) return null;

    const raw = fs.readFileSync(path.join(tmpDir, files[0]), "utf-8");
    files.forEach((f) => fs.unlink(path.join(tmpDir, f), () => {}));

    return raw
      .replace(/\d+\n\d{2}:\d{2}:\d{2},\d{3} --> \d{2}:\d{2}:\d{2},\d{3}\n/g, "")
      .replace(/<[^>]+>/g, "")
      .replace(/\n{2,}/g, " ")
      .trim() || null;
  } catch { return null; }
}

async function downloadAudio(url: string, tmpId: string): Promise<{ buffer: Buffer; filePath: string } | { error: string }> {
  const tmpDir = os.tmpdir();
  const outTpl = path.join(tmpDir, `${tmpId}.%(ext)s`);
  try {
    await execFileAsync("yt-dlp", [
      "-x", "--audio-format", "mp3", "--audio-quality", "64K",
      "--no-playlist", "--max-filesize", "80m", "-o", outTpl, url,
    ], { timeout: 300_000 });

    const files = fs.readdirSync(tmpDir).filter((f) => f.startsWith(tmpId));
    if (!files.length) return { error: "yt-dlp não gerou arquivo de áudio" };

    const filePath = path.join(tmpDir, files[0]);
    return { buffer: fs.readFileSync(filePath), filePath };
  } catch (e) {
    return { error: (e instanceof Error ? e.message : String(e)).slice(0, 300) };
  }
}

async function extractAudio(inputPath: string, outputPath: string): Promise<void> {
  await execFileAsync("ffmpeg", [
    "-i", inputPath, "-vn", "-ar", "16000", "-ac", "1", "-ab", "64k",
    "-f", "mp3", "-y", outputPath,
  ], { timeout: 180_000 });
}

async function transcribeWithWhisper(audioBuffer: Buffer, audioPath?: string): Promise<string> {
  const openai = openaiClient();

  // OpenAI Whisper API aceita até 25MB — para arquivos maiores, usa Replicate como fallback
  if (audioBuffer.length > 24 * 1024 * 1024) {
    return transcribeWithReplicate(audioBuffer);
  }

  const { toFile } = await import("openai");
  const audioFile = await toFile(audioBuffer, audioPath ? path.basename(audioPath) : "audio.mp3", { type: "audio/mpeg" });

  const response = await openai.audio.transcriptions.create({
    file: audioFile,
    model: "whisper-1",
    language: "pt",
    response_format: "text",
  });

  return typeof response === "string" ? response : (response as { text?: string }).text ?? "";
}

async function transcribeWithReplicate(audioBuffer: Buffer): Promise<string> {
  const replicate = replicateClient();
  const uint8 = new Uint8Array(audioBuffer);
  const audioBlob = new Blob([uint8], { type: "audio/mpeg" });

  const output = await replicate.run(
    "openai/whisper:4d50797290df275329f202e48c76360b3f22b08d28c196cbc54600319435f8d2",
    {
      input: {
        audio: audioBlob,
        model: "large-v3",
        language: "pt",
        transcription: "plain text",
        translate: false,
        temperature: 0,
        suppress_tokens: "-1",
        condition_on_previous_text: true,
        temperature_increment_on_fallback: 0.2,
        compression_ratio_threshold: 2.4,
        logprob_threshold: -1,
        no_speech_threshold: 0.6,
      },
    }
  ) as { transcription?: string; text?: string } | string;

  if (typeof output === "string") return output;
  return (output as { transcription?: string; text?: string }).transcription
    || (output as { transcription?: string; text?: string }).text
    || "";
}

async function analyzeWithGPT(transcript: string, ctx?: ContextoOferta): Promise<string> {
  const openai = openaiClient();
  const response = await openai.chat.completions.create({
    model: "gpt-4o-mini",
    messages: [
      {
        role: "system",
        content: "Você é um especialista em marketing digital e conteúdo viral brasileiro. Responda SEMPRE em português do Brasil coloquial e natural, como se estivesse falando com um amigo empreendedor. Retorne apenas JSON válido, sem markdown, sem texto fora do JSON.",
      },
      { role: "user", content: ANALYSIS_PROMPT(transcript, ctx) },
    ],
    max_tokens: 4096,
    temperature: 0.4,
    response_format: { type: "json_object" },
  });
  return response.choices[0]?.message?.content ?? "";
}

function parseAnalysis(rawText: string): Record<string, unknown> {
  try {
    const m = rawText.match(/\{[\s\S]*\}/);
    if (m) return JSON.parse(m[0]);
  } catch { /* fallback */ }
  return {};
}

async function requireAdmin(_req: NextRequest) {
  try {
    const supabase = await createClient();
    const { data: { user } } = await supabase.auth.getUser();
    if (!user) return { error: "unauthorized", status: 401, user: null };
    const { data: profile } = await supabase.from("profiles").select("role").eq("id", user.id).single();
    if (profile?.role !== "admin") return { error: "forbidden", status: 403, user: null };
    return { error: null, status: 200, user };
  } catch {
    return { error: "unauthorized", status: 401, user: null };
  }
}

// ─── POST ─────────────────────────────────────────────────────────────────────

export async function POST(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error || !auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });
  const user = auth.user;

  const contentType = request.headers.get("content-type") ?? "";
  const tmpFiles: string[] = [];

  try {
    // ── Modo 1: Upload de arquivo ─────────────────────────────────────────────
    if (contentType.includes("multipart/form-data")) {
      const form = await request.formData();
      const file = form.get("file");
      if (!(file instanceof File)) return NextResponse.json({ error: "Campo 'file' obrigatório" }, { status: 400 });
      if (file.size > MAX_UPLOAD_BYTES) return NextResponse.json({ error: `Arquivo muito grande (${(file.size / 1024 / 1024).toFixed(0)}MB, máx 200MB)` }, { status: 413 });

      const somenteTranscricao = form.get("somente_transcricao") === "true";
      const ctxFile: ContextoOferta = {
        produto: ((form.get("produto") as string) ?? "").trim() || undefined,
        mecanismo: ((form.get("mecanismo") as string) ?? "").trim() || undefined,
        cta: ((form.get("cta") as string) ?? "").trim() || undefined,
      };
      const tmpId = `viral-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;
      const ext = file.name.split(".").pop()?.toLowerCase() ?? "mp4";
      const videoPath = path.join(os.tmpdir(), `${tmpId}.${ext}`);
      const audioPath = path.join(os.tmpdir(), `${tmpId}.mp3`);
      tmpFiles.push(videoPath, audioPath);

      fs.writeFileSync(videoPath, Buffer.from(await file.arrayBuffer()));

      try {
        await extractAudio(videoPath, audioPath);
      } catch (e) {
        return NextResponse.json({ error: `Falha ao extrair áudio: ${(e instanceof Error ? e.message : String(e)).slice(0, 150)}` }, { status: 422 });
      }

      const audioBuffer = fs.readFileSync(audioPath);
      let transcript: string;
      try {
        transcript = await transcribeWithWhisper(audioBuffer, audioPath);
      } catch (e) {
        return NextResponse.json({ error: `Falha na transcrição: ${(e instanceof Error ? e.message : String(e)).slice(0, 150)}` }, { status: 500 });
      }

      if (somenteTranscricao) {
        return NextResponse.json({ transcript, platform: (form.get("platform") as string) ?? "other" });
      }

      let rawText: string;
      try {
        rawText = await analyzeWithGPT(transcript, ctxFile);
      } catch (e) {
        return NextResponse.json({ error: `Falha na análise: ${(e instanceof Error ? e.message : String(e)).slice(0, 150)}` }, { status: 500 });
      }

      const analysis = parseAnalysis(rawText);
      const platform = (form.get("platform") as string) ?? "other";
      const admin = await createAdminClient();
      const { data: saved } = await admin.from("viral_references").insert({
        user_id: user.id, source_url: file.name, platform,
        title: (analysis.titulo as string) ?? file.name,
        duration_s: (analysis.duracao_estimada as number) ?? null,
        transcript: (analysis.transcricao as string) ?? transcript ?? null,
        analysis, raw_text: rawText,
      }).select("id").single();

      return NextResponse.json({ id: saved?.id ?? null, platform, analysis, raw_text: rawText });
    }

    // ── Modo 2: URL YouTube ────────────────────────────────────────────────────
    const body = await request.json().catch(() => ({}));
    const url: string = (body.url ?? "").trim();
    const somenteTranscricao: boolean = body.somente_transcricao === true;
    const ctx: ContextoOferta = {
      produto: ((body.produto ?? "") as string).trim() || undefined,
      mecanismo: ((body.mecanismo ?? "") as string).trim() || undefined,
      cta: ((body.cta ?? "") as string).trim() || undefined,
    };
    if (!url || !sanitizeUrl(url)) return NextResponse.json({ error: "URL inválida" }, { status: 400 });

    const platform = detectPlatform(url);
    if (platform === "instagram" || platform === "tiktok") {
      return NextResponse.json({
        error: `${platform === "instagram" ? "Instagram" : "TikTok"} bloqueia downloads de servidor. Baixe o vídeo no computador e use a aba "Arquivo".`,
      }, { status: 422 });
    }

    const tmpId = `viral-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`;

    // Tenta legenda primeiro (gratuito, sem Replicate)
    const subtitle = await trySubtitles(url, `${tmpId}-sub`);
    let transcript = subtitle ?? "";

    if (!transcript) {
      const result = await downloadAudio(url, tmpId);
      if ("error" in result) return NextResponse.json({ error: `Falha ao baixar áudio: ${result.error}` }, { status: 422 });
      tmpFiles.push(result.filePath);
      try {
        transcript = await transcribeWithWhisper(result.buffer, result.filePath);
      } catch (e) {
        return NextResponse.json({ error: `Falha na transcrição: ${(e instanceof Error ? e.message : String(e)).slice(0, 150)}` }, { status: 500 });
      }
    }

    if (somenteTranscricao) {
      return NextResponse.json({ transcript, platform });
    }

    let rawText: string;
    try {
      rawText = await analyzeWithGPT(transcript, ctx);
    } catch (e) {
      return NextResponse.json({ error: `Falha na análise: ${(e instanceof Error ? e.message : String(e)).slice(0, 150)}` }, { status: 500 });
    }

    const analysis = parseAnalysis(rawText);
    const admin = await createAdminClient();
    const { data: saved } = await admin.from("viral_references").insert({
      user_id: user.id, source_url: url, platform,
      title: (analysis.titulo as string) ?? null,
      duration_s: (analysis.duracao_estimada as number) ?? null,
      transcript: (analysis.transcricao as string) ?? transcript ?? null,
      analysis, raw_text: rawText,
    }).select("id").single();

    return NextResponse.json({ id: saved?.id ?? null, platform, analysis, raw_text: rawText });

  } finally {
    tmpFiles.forEach((p) => fs.unlink(p, () => {}));
  }
}

// ─── GET ──────────────────────────────────────────────────────────────────────

export async function GET(request: NextRequest) {
  const auth = await requireAdmin(request);
  if (auth.error || !auth.user) return NextResponse.json({ error: auth.error }, { status: auth.status });

  const admin = await createAdminClient();
  const id = request.nextUrl.searchParams.get("id");

  if (id) {
    const { data } = await admin.from("viral_references")
      .select("id, source_url, platform, analysis, raw_text")
      .eq("id", id).single();
    if (!data) return NextResponse.json({ error: "not found" }, { status: 404 });
    return NextResponse.json({ id: data.id, platform: data.platform, analysis: data.analysis, raw_text: data.raw_text });
  }

  const { data } = await admin.from("viral_references")
    .select("id, created_at, source_url, platform, title, duration_s")
    .order("created_at", { ascending: false }).limit(50);

  return NextResponse.json({ items: data ?? [] });
}
