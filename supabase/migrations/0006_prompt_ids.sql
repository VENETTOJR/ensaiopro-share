-- Persiste os prompt_ids escolhidos no ensaio.
-- Permite recovery automático quando worker morre (restart de PM2, OOM, etc).
alter table public.ensaios add column if not exists prompt_ids uuid[] default null;
