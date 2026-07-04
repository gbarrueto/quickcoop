-- Catálogo de tags únicos extraídos de games.tags (curación/normalización).
-- Poblado por scripts/populate_tags.py — ver ese script para el detalle.
-- Ref: docs/status-28-06-26-revision.md punto 5 (unificación cross-store).

create table public.tags (
  id uuid primary key default gen_random_uuid(),
  name text not null unique,
  created_at timestamptz not null default now()
);

alter table public.tags enable row level security;

create policy "tags are publicly readable"
  on public.tags for select
  to anon, authenticated
  using (true);
