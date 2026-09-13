-- Story 06 (extensão) — tier de qualidade no freestyle
-- ────────────────────────────────────────────────────────────────────
-- Permite ao user escolher entre "Rápido" (Gemini, 1 crédito) e
-- "Detalhado" (GPT Image 1 high, 4 créditos). Telemetria de provider
-- usado fica em fotos_geradas pra dashboard admin.
--
-- Princípio §1.bis: nada de "GPT" / "OpenAI" em UI; user só vê
-- "Rápido" vs "Detalhado".

-- 1. Tier escolhido no ensaio (default 'fast' = Gemini)
alter table public.ensaios
  add column if not exists generation_tier text not null default 'fast'
    check (generation_tier in ('fast', 'detailed'));

create index if not exists idx_ensaios_generation_tier
  on public.ensaios(generation_tier);

-- 2. Provider real usado em cada foto (telemetria — pode diferir do tier
--    em caso de fallback/failover futuro)
alter table public.fotos_geradas
  add column if not exists provider_used text
    check (provider_used in ('google', 'replicate', 'openai'));

create index if not exists idx_fotos_provider_used
  on public.fotos_geradas(provider_used);
