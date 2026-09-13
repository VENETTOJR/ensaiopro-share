-- Story 01 — Validação visual de refs (verde / amarelo / vermelho)
-- Cobertura: AC6.6, AC6.10, FR-6.1 a FR-6.6 do PRD §5 Feature 6.
--
-- Adiciona colunas de qualidade em fotos_referencia + view admin_refs_quality_user
-- consumida pelo componente RefsQualityHistogram (Story 03).
--
-- Idempotente: usa `if not exists` / `do $$` blocks. Não destrói dados existentes.

-- =============================================================================
-- 1. fotos_referencia — colunas de qualidade
-- =============================================================================
alter table public.fotos_referencia
  add column if not exists quality_label    text,
  add column if not exists quality_metadata jsonb;

-- check constraint do quality_label (idempotente)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fotos_referencia_quality_label_check'
  ) then
    alter table public.fotos_referencia
      add constraint fotos_referencia_quality_label_check
      check (quality_label is null or quality_label in ('green','yellow','red'));
  end if;
end$$;

-- Índice pra agregar por usuário (consultado pela view)
create index if not exists idx_fotos_ref_user_quality
  on public.fotos_referencia (user_id, quality_label);

-- =============================================================================
-- 2. View admin_refs_quality_user (AC6.6)
-- =============================================================================
-- Agrega contagem de refs por label e por usuário. Consumida pelo componente
-- RefsQualityHistogram em /admin/gastos (Story 03).
--
-- Reforço de admin-only via public.is_admin() (mesmo padrão de admin_gastos_user
-- na migration 0008).
create or replace view public.admin_refs_quality_user as
  select * from (
    select
      p.id    as user_id,
      p.email,
      p.name,
      count(*) filter (where fr.quality_label = 'green')  as green,
      count(*) filter (where fr.quality_label = 'yellow') as yellow,
      count(*) filter (where fr.quality_label = 'red')    as red,
      count(*) filter (where fr.id is not null and fr.quality_label is null) as unknown
    from public.profiles p
    left join public.fotos_referencia fr on fr.user_id = p.id
    group by p.id, p.email, p.name
  ) g
  where public.is_admin();

revoke all on public.admin_refs_quality_user from anon, authenticated;
grant select on public.admin_refs_quality_user to authenticated;
