-- Seed dos 3 planos iniciais (espelha Ensaio Digital)
insert into public.plans (slug, name, quantidade, preco_cents, popular, sort_order, active)
values
  ('entrada',       '60 fotos',  60,  4700, false, 1, true),
  ('intermediario', '150 fotos', 150, 9700, false, 2, true),
  ('popular',       '250 fotos', 250, 14700, true, 3, true)
on conflict (slug) do update set
  name = excluded.name,
  quantidade = excluded.quantidade,
  preco_cents = excluded.preco_cents,
  popular = excluded.popular,
  sort_order = excluded.sort_order,
  active = excluded.active,
  updated_at = now();
