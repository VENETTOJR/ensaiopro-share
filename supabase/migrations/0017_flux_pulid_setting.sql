-- Story 07 — Toggle do provider Flux+PuLID via Replicate
-- ────────────────────────────────────────────────────────────────────
-- Quando true, a geração principal (tier=fast) usa Flux+PuLID em vez
-- do Nano Banana. Identity adapter nativo entrega fidelidade muito
-- superior (~95% vs ~80% do Nano puro).
--
-- Default false (conservador). Admin liga em /admin/gastos quando
-- validar que está OK.

insert into public.system_settings (key, value)
values ('use_flux_pulid', to_jsonb(false))
on conflict (key) do nothing;
