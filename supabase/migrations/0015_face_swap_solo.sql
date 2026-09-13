-- Story 07 — face_swap_solo_enabled controlável via painel admin
-- ────────────────────────────────────────────────────────────────────
-- Habilita aplicação do pipeline face-swap + enhance TAMBÉM em ensaios solo
-- (1 pessoa). O Nano Banana sozinho, mesmo com refs boas, inventa feições
-- quando as refs têm variação de iluminação/ângulo — o swap aplica o rosto
-- real por cima.
--
-- Custo: +R$0,13 por foto solo (swap R$0,08 + enhance R$0,05), passando o
-- custo total de R$0,20 → R$0,33. Margem segue alta em 1 crédito/foto.
--
-- Default = true (diferente do face_swap_enabled que era false) porque o
-- ganho de fidelidade é muito alto e o admin pode desligar em /admin/gastos
-- se precisar cortar custo.

insert into public.system_settings (key, value)
values ('face_swap_solo_enabled', to_jsonb(true))
on conflict (key) do nothing;
