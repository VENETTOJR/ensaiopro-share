-- Viral Lab: histórico de análises de vídeos virais (uso interno admin)
create table if not exists viral_references (
  id          uuid primary key default gen_random_uuid(),
  created_at  timestamptz not null default now(),
  user_id     uuid references auth.users(id) on delete cascade,
  source_url  text not null,
  platform    text, -- 'youtube' | 'instagram' | 'tiktok' | 'other'
  title       text,
  duration_s  integer,
  transcript  text,
  analysis    jsonb, -- { hook, structure, triggers, copies }
  raw_text    text  -- resposta bruta do Gemini
);

alter table viral_references enable row level security;

-- Só admin lê/escreve (via service_role na API route)
create policy "admin_only" on viral_references
  using (false) with check (false);
