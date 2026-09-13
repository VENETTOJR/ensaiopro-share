-- Story 04 (continuação) — face_swap_enabled controlável via painel admin
-- ────────────────────────────────────────────────────────────────────
-- Substitui o kill-switch FACE_SWAP_ENABLED via .env por um toggle dinâmico
-- em system_settings, editável pelo admin sem redeploy. Default = false
-- (preserva comportamento atual conservador — admin liga manualmente quando
-- validar que o pipeline está funcionando bem).

insert into public.system_settings (key, value)
values ('face_swap_enabled', to_jsonb(false))
on conflict (key) do nothing;
