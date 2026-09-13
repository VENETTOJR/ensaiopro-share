-- Remove recursão infinita: policies de admin que consultavam "profiles"
-- causavam loop (RLS do próprio policy chamava o mesmo policy).
-- Solução: função SECURITY DEFINER que bypassa RLS + policies usam a função.

create or replace function public.is_admin()
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin'
  );
$$;

grant execute on function public.is_admin() to authenticated, anon;

-- profiles
drop policy if exists "admins_all_profiles" on public.profiles;
create policy "admins_all_profiles" on public.profiles
  for all using (public.is_admin());

-- ensaio_types
drop policy if exists "admins_manage_ensaio_types" on public.ensaio_types;
create policy "admins_manage_ensaio_types" on public.ensaio_types
  for all using (public.is_admin());

-- prompts
drop policy if exists "admins_manage_prompts" on public.prompts;
create policy "admins_manage_prompts" on public.prompts
  for all using (public.is_admin());

-- plans
drop policy if exists "admins_manage_plans" on public.plans;
create policy "admins_manage_plans" on public.plans
  for all using (public.is_admin());

-- compras
drop policy if exists "admins_all_compras" on public.compras;
create policy "admins_all_compras" on public.compras
  for all using (public.is_admin());

-- ensaios
drop policy if exists "admins_all_ensaios" on public.ensaios;
create policy "admins_all_ensaios" on public.ensaios
  for all using (public.is_admin());

-- fotos_geradas
drop policy if exists "admins_all_fotos" on public.fotos_geradas;
create policy "admins_all_fotos" on public.fotos_geradas
  for all using (public.is_admin());
