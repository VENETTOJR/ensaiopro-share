-- Story 06 — Modo freestyle (lifestyle prompt)
-- ────────────────────────────────────────────────────────────────────
-- Discreto, custo 1 crédito, lista deny NSFW/celebs/marcas.

alter table public.ensaios
  add column if not exists source text not null default 'template'
    check (source in ('template', 'freestyle'));

alter table public.ensaios
  add column if not exists freestyle_text text;

create index if not exists idx_ensaios_source on public.ensaios(source);

-- Log de tentativas bloqueadas pela moderação (revisão admin manual)
create table if not exists public.freestyle_moderation_log (
  id uuid primary key default gen_random_uuid(),
  user_id uuid references public.profiles(id) on delete set null,
  prompt text not null,
  reason text not null,
  created_at timestamptz not null default now()
);

create index if not exists idx_freestyle_log_created
  on public.freestyle_moderation_log(created_at desc);

alter table public.freestyle_moderation_log enable row level security;

drop policy if exists "admins_read_moderation_log" on public.freestyle_moderation_log;
create policy "admins_read_moderation_log"
  on public.freestyle_moderation_log
  for select using (
    exists (select 1 from public.profiles p where p.id = auth.uid() and p.role = 'admin')
  );

drop policy if exists "service_role_insert_moderation_log" on public.freestyle_moderation_log;
create policy "service_role_insert_moderation_log"
  on public.freestyle_moderation_log
  for insert with check (true);
