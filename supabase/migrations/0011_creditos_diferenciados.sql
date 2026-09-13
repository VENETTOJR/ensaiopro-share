-- Story 05 — Créditos diferenciados por tipo de ensaio
-- ────────────────────────────────────────────────────────────────────
-- Decisão Victor (PRD §7): preço por crédito NÃO sobe. Multi-pessoa
-- consome MAIS créditos por foto. Plano continua vendido em "créditos".
-- Backfill final:
--   familia      → 3 créditos/foto (3-4 pessoas, custo R$0,49-0,57)
--   mae          → 2 créditos/foto
--   casal        → 2 créditos/foto
--   casamento    → 2 créditos/foto
--   freestyle    → 1 crédito/foto
--   demais       → 1 crédito/foto

alter table public.ensaio_types
  add column if not exists creditos_por_foto_base int not null default 1;

alter table public.prompts
  add column if not exists creditos_por_foto int;
-- creditos_por_foto NULL = usa ensaio_types.creditos_por_foto_base como fallback

-- Histórico retroativo sem rótulo de créditos (PRD Q7 / Q14)
alter table public.fotos_geradas
  add column if not exists credits_visible boolean not null default true;

-- Backfill: fotos antigas (anteriores a esta migration) ficam invisible
update public.fotos_geradas
   set credits_visible = false
 where credits_visible is null
    or created_at < now();
-- (segunda condição garante que rodando a migration agora deixa todas
-- as existentes como invisible — só novas fotos aparecerão com rótulo)

-- Backfill base por tipo de ensaio
update public.ensaio_types set creditos_por_foto_base = 3 where slug = 'familia';
update public.ensaio_types set creditos_por_foto_base = 2 where slug = 'mae';
update public.ensaio_types set creditos_por_foto_base = 2 where slug = 'casal';
update public.ensaio_types set creditos_por_foto_base = 2 where slug = 'casamento';

create index if not exists idx_prompts_creditos
  on public.prompts(creditos_por_foto)
  where creditos_por_foto is not null;

-- ────────────────────────────────────────────────────────────────────
-- system_settings table (USD/BRL editável — PRD Q8)
create table if not exists public.system_settings (
  key text primary key,
  value text not null,
  updated_at timestamptz not null default now()
);

insert into public.system_settings (key, value)
values ('usd_brl_rate', '5.10')
on conflict (key) do nothing;

alter table public.system_settings enable row level security;

drop policy if exists "admins_all_settings" on public.system_settings;
create policy "admins_all_settings" on public.system_settings
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );
