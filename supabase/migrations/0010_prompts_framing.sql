-- Story 02 — Coluna `framing` em prompts pra rastrear enquadramento (close-up vs full-body).
-- Cobre AC1.1, AC1.2, FR-1.1 do PRD §5 Feature 1.
--
-- Motivação: prompts com rosto pequeno (full-body) prejudicam o face-swap (Story 04)
-- porque o detector facial trabalha em pixels reduzidos. Reescrever pra close-up/half-body
-- faz o rosto ocupar >20% do frame, melhorando drasticamente a fidelidade do swap.
--
-- Esta migration:
--   1. Adiciona coluna `framing` com check constraint
--   2. NÃO faz backfill aqui (idempotência) — ver scripts/seed/classify-framing.mjs
--   3. NÃO altera texto dos prompts (isso fica em scripts/apply-rewrite-closeup.mjs)
--
-- IMPORTANTE: enum usa hífen (close-up, half-body, three-quarter, full-body) — convenção
-- adotada na Story 02 (substitui o snake_case `closeup/half_body/medium_shot/full_body`
-- proposto inicialmente no PRD draft, pois alinha com a copy interna do projeto).
--
-- Aplicar via: supabase db push  (ou psql -f)

alter table public.prompts
  add column if not exists framing text;

do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'prompts_framing_check'
  ) then
    alter table public.prompts
      add constraint prompts_framing_check
      check (
        framing is null
        or framing in ('close-up', 'half-body', 'three-quarter', 'full-body')
      );
  end if;
end$$;

-- Índice pra queries de auditoria (% prompts por framing)
create index if not exists idx_prompts_framing on public.prompts(framing) where active = true;

comment on column public.prompts.framing is
  'Enquadramento dominante do prompt: close-up | half-body | three-quarter | full-body. '
  'Backfill via scripts/seed/classify-framing.mjs (heurística regex). NULL é válido (não revisado).';
