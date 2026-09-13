-- Ensa.IA — schema inicial
-- Executar no SQL Editor do Supabase após criar o projeto novo.
-- Ordem: cria tabelas → RLS → índices → triggers → buckets de storage.

-- =============================================================================
-- 1. PROFILES (espelha auth.users com dados extras)
-- =============================================================================
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  name text,
  email text,
  phone text,
  document text,
  avatar_url text,
  photo_credits int not null default 0,
  partner_slug text default 'ensaiopro',
  role text not null default 'user' check (role in ('user','admin')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.profiles enable row level security;

create policy "users_select_own_profile" on public.profiles
  for select using (auth.uid() = id);
create policy "users_update_own_profile" on public.profiles
  for update using (auth.uid() = id);
create policy "admins_all_profiles" on public.profiles
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- Auto-create profile on signup
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, email, name, phone, document, partner_slug)
  values (
    new.id,
    new.email,
    coalesce(new.raw_user_meta_data->>'name', split_part(new.email, '@', 1)),
    new.raw_user_meta_data->>'phone',
    new.raw_user_meta_data->>'document',
    coalesce(new.raw_user_meta_data->>'partner_slug', 'ensaiopro')
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- =============================================================================
-- 2. ENSAIO_TYPES (categorias: aniversário, corporativo, etc)
-- =============================================================================
create table public.ensaio_types (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  description text,
  icon text not null default 'camera',
  sort_order int not null default 0,
  active boolean not null default true,
  supports_idade boolean not null default false,
  cover_image_url text,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.ensaio_types enable row level security;
create policy "public_read_ensaio_types" on public.ensaio_types
  for select using (active = true);
create policy "admins_manage_ensaio_types" on public.ensaio_types
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- =============================================================================
-- 3. PROMPTS (templates de geração por tipo)
-- =============================================================================
create table public.prompts (
  id uuid primary key default gen_random_uuid(),
  ensaio_type_id uuid references public.ensaio_types(id) on delete cascade,
  numero int not null,
  categoria text,
  texto text not null,
  example_image_url text,
  active boolean not null default true,
  sort_order int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_prompts_type on public.prompts(ensaio_type_id) where active = true;
create index idx_prompts_categoria on public.prompts(categoria);

alter table public.prompts enable row level security;
create policy "public_read_prompts" on public.prompts
  for select using (active = true);
create policy "admins_manage_prompts" on public.prompts
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- =============================================================================
-- 4. PLANS (tiers de crédito)
-- =============================================================================
create table public.plans (
  id uuid primary key default gen_random_uuid(),
  slug text unique not null,
  name text not null,
  quantidade int not null,           -- qtd de fotos incluídas
  preco_cents int not null,          -- preço em centavos
  popular boolean not null default false,
  sort_order int not null default 0,
  active boolean not null default true,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.plans enable row level security;
create policy "public_read_plans" on public.plans
  for select using (active = true);
create policy "admins_manage_plans" on public.plans
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- =============================================================================
-- 5. COMPRAS (pedidos processados pelo Plynx)
-- =============================================================================
create table public.compras (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  plan_id uuid references public.plans(id),
  plynx_order_id text unique,
  valor_cents int not null,
  quantidade int not null,
  status text not null default 'pending'
    check (status in ('pending','paid','refunded','failed','cancelled')),
  metodo text,                       -- 'pix' | 'credit_card'
  paid_at timestamptz,
  metadata jsonb,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index idx_compras_user on public.compras(user_id, created_at desc);
create index idx_compras_status on public.compras(status) where status = 'pending';

alter table public.compras enable row level security;
create policy "users_select_own_compras" on public.compras
  for select using (auth.uid() = user_id);
create policy "admins_all_compras" on public.compras
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- =============================================================================
-- 6. ENSAIOS (cada job de geração é 1 ensaio com N fotos)
-- =============================================================================
create table public.ensaios (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  ensaio_type_id uuid references public.ensaio_types(id),
  name text,
  idade int,
  status text not null default 'pending'
    check (status in ('pending','processing','completed','failed')),
  total_prompts int not null default 0,
  total_generated int not null default 0,
  total_failed int not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  completed_at timestamptz
);

create index idx_ensaios_user on public.ensaios(user_id, created_at desc);

alter table public.ensaios enable row level security;
create policy "users_select_own_ensaios" on public.ensaios
  for select using (auth.uid() = user_id);
create policy "users_insert_own_ensaios" on public.ensaios
  for insert with check (auth.uid() = user_id);
create policy "users_update_own_ensaios" on public.ensaios
  for update using (auth.uid() = user_id);
create policy "admins_all_ensaios" on public.ensaios
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- =============================================================================
-- 7. FOTOS_REFERENCIA (uploads do usuário pra gerar o ensaio)
-- =============================================================================
create table public.fotos_referencia (
  id uuid primary key default gen_random_uuid(),
  ensaio_id uuid not null references public.ensaios(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  storage_path text not null,
  mime_type text,
  size_bytes int,
  sort_order int not null default 0,
  created_at timestamptz not null default now()
);

create index idx_fotos_ref_ensaio on public.fotos_referencia(ensaio_id);

alter table public.fotos_referencia enable row level security;
create policy "users_manage_own_fotos_ref" on public.fotos_referencia
  for all using (auth.uid() = user_id);

-- =============================================================================
-- 8. FOTOS_GERADAS (outputs da Gemini)
-- =============================================================================
create table public.fotos_geradas (
  id uuid primary key default gen_random_uuid(),
  ensaio_id uuid not null references public.ensaios(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  prompt_id uuid references public.prompts(id),
  prompt_numero int,
  prompt_categoria text,
  storage_path text not null,
  storage_path_watermarked text,
  status text not null default 'completed'
    check (status in ('completed','failed')),
  error_message text,
  cost_cents int default 4,          -- custo em centavos (R$0,04 Nano Banana)
  created_at timestamptz not null default now()
);

create index idx_fotos_ensaio on public.fotos_geradas(ensaio_id);
create index idx_fotos_user on public.fotos_geradas(user_id, created_at desc);

alter table public.fotos_geradas enable row level security;
create policy "users_select_own_fotos" on public.fotos_geradas
  for select using (auth.uid() = user_id);
create policy "admins_all_fotos" on public.fotos_geradas
  for all using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

-- =============================================================================
-- 9. FUNÇÕES RPC
-- =============================================================================

-- Debita créditos de forma atômica (evita race condition)
create or replace function public.debit_credits(
  p_user_id uuid,
  p_amount int
) returns boolean
language plpgsql
security definer
as $$
declare
  current_credits int;
begin
  select photo_credits into current_credits
  from public.profiles
  where id = p_user_id
  for update;

  if current_credits is null or current_credits < p_amount then
    return false;
  end if;

  update public.profiles
  set photo_credits = photo_credits - p_amount,
      updated_at = now()
  where id = p_user_id;

  return true;
end;
$$;

-- Credita após pagamento confirmado (idempotente via plynx_order_id)
create or replace function public.credit_purchase(
  p_order_id text,
  p_amount_cents int,
  p_method text
) returns jsonb
language plpgsql
security definer
as $$
declare
  v_compra record;
  v_plan record;
begin
  select * into v_compra from public.compras where plynx_order_id = p_order_id;
  if not found then
    return jsonb_build_object('ok', false, 'error', 'order_not_found');
  end if;

  if v_compra.status = 'paid' then
    return jsonb_build_object('ok', true, 'already_paid', true);
  end if;

  update public.compras
  set status = 'paid',
      metodo = p_method,
      paid_at = now(),
      updated_at = now()
  where id = v_compra.id;

  update public.profiles
  set photo_credits = photo_credits + v_compra.quantidade,
      updated_at = now()
  where id = v_compra.user_id;

  return jsonb_build_object('ok', true, 'credits_added', v_compra.quantidade);
end;
$$;

-- Estatísticas do histórico
create or replace view public.user_purchase_stats as
select
  p.id as user_id,
  coalesce(sum(c.valor_cents) filter (where c.status = 'paid'), 0) as total_invested_cents,
  coalesce(sum(c.quantidade) filter (where c.status = 'paid'), 0) as total_credits_purchased,
  count(*) filter (where c.status = 'paid') as total_purchases,
  (select count(*) from public.fotos_geradas fg where fg.user_id = p.id and fg.status = 'completed') as total_photos_generated,
  p.photo_credits as current_credits
from public.profiles p
left join public.compras c on c.user_id = p.id
group by p.id, p.photo_credits;

grant select on public.user_purchase_stats to authenticated;

-- =============================================================================
-- 10. UPDATED_AT TRIGGER
-- =============================================================================
create or replace function public.set_updated_at()
returns trigger language plpgsql as $$
begin
  new.updated_at = now();
  return new;
end;
$$;

create trigger tr_profiles_updated before update on public.profiles
  for each row execute function public.set_updated_at();
create trigger tr_ensaios_updated before update on public.ensaios
  for each row execute function public.set_updated_at();
create trigger tr_compras_updated before update on public.compras
  for each row execute function public.set_updated_at();

-- =============================================================================
-- 11. STORAGE BUCKETS
-- =============================================================================
insert into storage.buckets (id, name, public)
values
  ('references', 'references', false),        -- fotos de referência enviadas (privado)
  ('generated', 'generated', false),           -- fotos geradas (signed URLs)
  ('public-assets', 'public-assets', true)     -- imagens de exemplo dos prompts
on conflict (id) do nothing;

-- Policies de storage
create policy "users_upload_own_references" on storage.objects
  for insert with check (
    bucket_id = 'references'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "users_read_own_references" on storage.objects
  for select using (
    bucket_id = 'references'
    and auth.uid()::text = (storage.foldername(name))[1]
  );
create policy "users_delete_own_references" on storage.objects
  for delete using (
    bucket_id = 'references'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "users_read_own_generated" on storage.objects
  for select using (
    bucket_id = 'generated'
    and auth.uid()::text = (storage.foldername(name))[1]
  );

create policy "public_read_public_assets" on storage.objects
  for select using (bucket_id = 'public-assets');
