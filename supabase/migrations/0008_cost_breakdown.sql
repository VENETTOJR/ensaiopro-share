-- Story 03 — Dashboard /admin/gastos
-- Cobertura: FR-4.1, FR-4.2, AC4.7, AC4.8, NFR-4.1, CON-4.1, AC6.6 (parcial)
-- ESCOPO: schema do breakdown granular de custo, RLS column-level via view sanitizada,
--         view admin_gastos_user, system_settings (USD/BRL editável), trigger e índices.
--
-- Esta migration NÃO é destrutiva: preserva fotos antigas via backfill `swap_status='legacy'`.

-- =============================================================================
-- 1. fotos_geradas — colunas de breakdown granular (FR-4.1)
-- =============================================================================
alter table public.fotos_geradas
  add column if not exists cost_cents_nano    int not null default 0,
  add column if not exists cost_cents_swap    int not null default 0,
  add column if not exists cost_cents_enhance int not null default 0,
  add column if not exists swap_status        text,
  add column if not exists faces_detected     int,
  add column if not exists faces_swapped      int;

-- check constraint do swap_status (com 'legacy' p/ backfill — story 03 dev notes)
do $$
begin
  if not exists (
    select 1 from pg_constraint
    where conname = 'fotos_geradas_swap_status_check'
  ) then
    alter table public.fotos_geradas
      add constraint fotos_geradas_swap_status_check
      check (swap_status is null or swap_status in ('skipped','success','failed','partial','legacy'));
  end if;
end$$;

-- Trigger pra manter cost_cents = nano + swap + enhance
create or replace function public.fg_sync_cost_cents()
returns trigger
language plpgsql
as $$
begin
  new.cost_cents :=
    coalesce(new.cost_cents_nano, 0)
    + coalesce(new.cost_cents_swap, 0)
    + coalesce(new.cost_cents_enhance, 0);
  return new;
end;
$$;

drop trigger if exists tr_fg_sync_cost on public.fotos_geradas;
create trigger tr_fg_sync_cost
  before insert or update on public.fotos_geradas
  for each row execute function public.fg_sync_cost_cents();

-- Backfill fotos legacy: cost_cents > 0 mas breakdown zerado e sem swap_status
-- → assume tudo veio do Nano Banana e marca como 'legacy'.
update public.fotos_geradas
   set cost_cents_nano = cost_cents,
       swap_status = 'legacy'
 where coalesce(cost_cents, 0) > 0
   and coalesce(cost_cents_nano, 0) = 0
   and coalesce(cost_cents_swap, 0) = 0
   and coalesce(cost_cents_enhance, 0) = 0
   and swap_status is null;

-- Drop default de cost_cents — agora vem da soma (trigger)
alter table public.fotos_geradas
  alter column cost_cents drop default;

-- Índice de performance pra query de gastos (NFR-4.1: ≤1.5s em 10k linhas)
create index if not exists idx_fotos_geradas_cost
  on public.fotos_geradas (user_id, created_at desc)
  where status = 'completed';

-- =============================================================================
-- 2. View sanitizada exposta a non-admin (AC4.8, CON-4.1)
-- =============================================================================
-- View user-safe: NÃO expõe cost_cents_*, swap_status, faces_*.
-- A SELECT direta em fotos_geradas continua coberta por RLS (users_select_own_fotos),
-- mas a recomendação interna de leitura non-admin é via esta view.
create or replace view public.fotos_geradas_user_safe as
  select
    fg.id,
    fg.ensaio_id,
    fg.user_id,
    fg.prompt_id,
    fg.prompt_numero,
    fg.prompt_categoria,
    fg.storage_path,
    fg.storage_path_watermarked,
    fg.status,
    fg.error_message,
    fg.created_at
  from public.fotos_geradas fg
  where fg.user_id = auth.uid();

-- View herda RLS via security_invoker (Postgres 15+/Supabase)
alter view public.fotos_geradas_user_safe set (security_invoker = true);

grant select on public.fotos_geradas_user_safe to authenticated;

-- =============================================================================
-- 3. View admin_gastos_user (FR-4.2)
-- =============================================================================
-- Agregado por usuário: nº de ensaios, fotos OK, custo total e receita.
-- Usado pelo dashboard /admin/gastos e CLI gastos-report.ts.
create or replace view public.admin_gastos_user as
  select
    p.id              as user_id,
    p.email,
    p.name,
    p.created_at      as user_created_at,
    p.photo_credits   as current_credits,
    count(distinct e.id) filter (where e.id is not null) as total_ensaios,
    count(fg.id) filter (where fg.status = 'completed')  as fotos_ok,
    count(fg.id) filter (where fg.status = 'failed')     as fotos_failed,
    coalesce(sum(fg.cost_cents)         filter (where fg.status = 'completed'), 0) as custo_total_cents,
    coalesce(sum(fg.cost_cents_nano)    filter (where fg.status = 'completed'), 0) as custo_nano_cents,
    coalesce(sum(fg.cost_cents_swap)    filter (where fg.status = 'completed'), 0) as custo_swap_cents,
    coalesce(sum(fg.cost_cents_enhance) filter (where fg.status = 'completed'), 0) as custo_enhance_cents,
    coalesce(sum(c.valor_cents)         filter (where c.status = 'paid'), 0)       as receita_total_cents,
    coalesce(sum(c.quantidade)          filter (where c.status = 'paid'), 0)       as creditos_comprados,
    max(fg.created_at)                                    as ultima_foto_at,
    max(c.paid_at)                                        as ultima_compra_at
  from public.profiles p
  left join public.ensaios       e  on e.user_id  = p.id
  left join public.fotos_geradas fg on fg.user_id = p.id
  left join public.compras       c  on c.user_id  = p.id
  group by p.id, p.email, p.name, p.created_at, p.photo_credits;

-- Acesso só pra admin (e service-role, que sempre bypassa RLS)
revoke all on public.admin_gastos_user from anon, authenticated;
grant select on public.admin_gastos_user to authenticated;

-- Para reforçar AC4.8: a view só retorna linhas se o caller é admin.
-- (Supabase: RLS em view depende do security_invoker e RLS das tabelas-base —
--  para admin_gastos_user usamos security_definer do is_admin() pra bloquear.)
create or replace view public.admin_gastos_user as
  select * from (
    select
      p.id              as user_id,
      p.email,
      p.name,
      p.created_at      as user_created_at,
      p.photo_credits   as current_credits,
      count(distinct e.id) filter (where e.id is not null) as total_ensaios,
      count(fg.id) filter (where fg.status = 'completed')  as fotos_ok,
      count(fg.id) filter (where fg.status = 'failed')     as fotos_failed,
      coalesce(sum(fg.cost_cents)         filter (where fg.status = 'completed'), 0) as custo_total_cents,
      coalesce(sum(fg.cost_cents_nano)    filter (where fg.status = 'completed'), 0) as custo_nano_cents,
      coalesce(sum(fg.cost_cents_swap)    filter (where fg.status = 'completed'), 0) as custo_swap_cents,
      coalesce(sum(fg.cost_cents_enhance) filter (where fg.status = 'completed'), 0) as custo_enhance_cents,
      coalesce(sum(c.valor_cents)         filter (where c.status = 'paid'), 0)       as receita_total_cents,
      coalesce(sum(c.quantidade)          filter (where c.status = 'paid'), 0)       as creditos_comprados,
      max(fg.created_at)                                    as ultima_foto_at,
      max(c.paid_at)                                        as ultima_compra_at
    from public.profiles p
    left join public.ensaios       e  on e.user_id  = p.id
    left join public.fotos_geradas fg on fg.user_id = p.id
    left join public.compras       c  on c.user_id  = p.id
    group by p.id, p.email, p.name, p.created_at, p.photo_credits
  ) g
  where public.is_admin();

revoke all on public.admin_gastos_user from anon, authenticated;
grant select on public.admin_gastos_user to authenticated;

-- =============================================================================
-- 4. system_settings — USD/BRL editável (PRD §2.3, dev notes story 03)
-- =============================================================================
create table if not exists public.system_settings (
  key        text primary key,
  value      jsonb not null,
  updated_at timestamptz not null default now(),
  updated_by uuid references auth.users(id)
);

insert into public.system_settings (key, value)
values
  ('usd_brl_rate', to_jsonb(5.10::numeric))
on conflict (key) do nothing;

alter table public.system_settings enable row level security;

drop policy if exists "settings_admin_all"     on public.system_settings;
drop policy if exists "settings_authn_select"  on public.system_settings;

-- Admin pode gerenciar tudo
create policy "settings_admin_all" on public.system_settings
  for all using (public.is_admin()) with check (public.is_admin());

-- Authenticated pode LER (precisa pra calcular conversão em server-side).
-- Nenhum dado sensível aqui — só rate de câmbio etc.
create policy "settings_authn_select" on public.system_settings
  for select using (auth.role() = 'authenticated');

create or replace function public.set_updated_at_settings()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

drop trigger if exists tr_settings_updated on public.system_settings;
create trigger tr_settings_updated
  before update on public.system_settings
  for each row execute function public.set_updated_at_settings();

-- =============================================================================
-- 5. admin_refs_quality_user (esqueleto pra AC6.6 — Story 01 preenche)
-- =============================================================================
-- Nota: depende de fotos_referencia.quality_label existir (Story 01).
-- Cria stub que tolera ausência da coluna; se Story 01 já rodou, view real
-- substitui no migration dela. Aqui ficamos só com placeholder caso não exista.
do $$
begin
  if exists (
    select 1 from information_schema.columns
    where table_schema = 'public'
      and table_name   = 'fotos_referencia'
      and column_name  = 'quality_label'
  ) then
    execute $view$
      create or replace view public.admin_refs_quality_user as
      select
        p.id as user_id,
        p.email,
        p.name,
        count(*) filter (where fr.quality_label = 'green')  as green,
        count(*) filter (where fr.quality_label = 'yellow') as yellow,
        count(*) filter (where fr.quality_label = 'red')    as red,
        count(*) filter (where fr.quality_label is null)    as unknown
      from public.profiles p
      left join public.fotos_referencia fr on fr.user_id = p.id
      group by p.id, p.email, p.name
    $view$;
    revoke all on public.admin_refs_quality_user from anon, authenticated;
    grant select on public.admin_refs_quality_user to authenticated;
  end if;
end$$;
