-- Vincula plans do EnsaioPro com products do Plynx via slug
alter table public.plans
  add column if not exists plynx_product_slug text;

update public.plans set plynx_product_slug = 'ensaiopro-entrada'       where slug = 'entrada';
update public.plans set plynx_product_slug = 'ensaiopro-intermediario' where slug = 'intermediario';
update public.plans set plynx_product_slug = 'ensaiopro-popular'       where slug = 'popular';
