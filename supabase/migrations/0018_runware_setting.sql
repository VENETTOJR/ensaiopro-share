-- Story 07 — Provider Runware (PuLID Flux)
-- ────────────────────────────────────────────────────────────────────
-- Toggle pro provider Runware (sistema irmão rcjfotos usa este). Quando
-- true, override pro Flux+PuLID via Runware em vez de Replicate ou Nano.
--
-- Default false. Ativa em /admin/gastos quando RUNWARE_API_KEY válida.

insert into public.system_settings (key, value)
values ('use_runware', to_jsonb(false))
on conflict (key) do nothing;
