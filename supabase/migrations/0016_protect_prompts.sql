-- Story 07 — Proteger tabela prompts contra leitura anônima
-- ────────────────────────────────────────────────────────────────────
-- Concorrente teve mesma vulnerabilidade: anon key (pública no JS) lê
-- todos os prompts. Resultado: qualquer pessoa copia o banco inteiro.
--
-- Solução: bloquear anon, permitir só usuários AUTENTICADOS (cliente
-- logado pra escolher prompts no fluxo /ensaios/novo) e service role
-- (admin via /admin/prompts).
--
-- Idempotente — pode rodar várias vezes.

alter table public.prompts enable row level security;

-- Drop policies antigas se existirem (idempotência)
drop policy if exists "anon read prompts" on public.prompts;
drop policy if exists "public read prompts" on public.prompts;
drop policy if exists "public_read_prompts" on public.prompts;
drop policy if exists "authenticated read prompts" on public.prompts;

-- Permitir apenas usuários autenticados lerem prompts ativos
create policy "authenticated read active prompts"
  on public.prompts
  for select
  to authenticated
  using (active = true);

-- Service role (admin/server) já bypassa RLS automaticamente.
-- Nada de policy pra anon — bloqueio implícito.
