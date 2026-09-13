-- Seed dos 7 tipos de ensaio (clonado do concorrente)
insert into public.ensaio_types (slug, name, description, icon, sort_order, active, supports_idade)
values
  ('aniversario',    'Ensaio Aniversário',          'Velas, balões e momentos mágicos',  'cake',      1, true, true),
  ('corporativo',    'Ensaio Corporativo Feminino', 'Retratos profissionais para sua marca', 'briefcase', 2, true, false),
  ('bebe',           'Ensaio Infantil Feminino',    null,                                  'heart',     3, true, true),
  ('sensual',        'Ensaio Sensual',              null,                                  'camera',    5, true, false),
  ('gestante',       'Ensaio Gestante',             'Momentos únicos da maternidade',      'users',     6, true, false),
  ('15anosestudio',  'Ensaio 15 Anos Estúdio',      'Clássico e sofisticado',              'star',      4, true, false),
  ('masc',           'Ensaio Masculino',            'Retratos elegantes e impactantes',    'user',      7, true, false)
on conflict (slug) do update set
  name = excluded.name,
  description = excluded.description,
  icon = excluded.icon,
  sort_order = excluded.sort_order,
  active = excluded.active,
  supports_idade = excluded.supports_idade,
  updated_at = now();
