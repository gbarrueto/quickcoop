-- Fase 3: catálogo de juegos cross-store (poblado on-demand)
-- Ref: docs/database-design.md secciones 3, 4, 6, 8

-- ---------------------------------------------------------------------------
-- games (entidad canónica, cross-store)
-- ---------------------------------------------------------------------------
create type public.game_kind as enum ('game', 'dlc');
create type public.game_match_status as enum ('auto', 'manual', 'unmatched');

create table public.games (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  primary_image_url text,
  tags text[] not null default '{}',
  kind public.game_kind not null default 'game',
  match_status public.game_match_status not null default 'unmatched',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.games enable row level security;

create policy "games are publicly readable"
  on public.games for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- game_listings (entrada por store)
-- ---------------------------------------------------------------------------
create table public.game_listings (
  id uuid primary key default gen_random_uuid(),
  game_id uuid not null references public.games (id) on delete cascade,
  provider text not null references public.providers (code),
  store_game_id text not null,
  title text not null,
  description text,
  images jsonb not null default '[]',
  requirements jsonb not null default '[]',
  tags text[] not null default '{}',
  price jsonb,
  provider_meta jsonb not null default '{}',
  parent_listing_id uuid references public.game_listings (id) on delete set null,
  fetched_at timestamptz not null default now(),
  unique (provider, store_game_id)
);

alter table public.game_listings enable row level security;

create policy "game listings are publicly readable"
  on public.game_listings for select
  to anon, authenticated
  using (true);

-- ---------------------------------------------------------------------------
-- user_games (biblioteca de cada usuario)
-- ---------------------------------------------------------------------------
create table public.user_games (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  listing_id uuid not null references public.game_listings (id) on delete cascade,
  owned_since timestamptz,
  last_synced_at timestamptz not null default now(),
  unique (user_id, listing_id)
);

alter table public.user_games enable row level security;

create policy "users manage their own games"
  on public.user_games for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- epic_namespace_slug (cache del bulk productmapping de Epic)
-- ---------------------------------------------------------------------------
create table public.epic_namespace_slug (
  namespace text primary key,
  slug text not null,
  updated_at timestamptz not null default now()
);

alter table public.epic_namespace_slug enable row level security;
-- Sin policies: solo lo lee/escribe el backend (service_role) durante el
-- pipeline de enriquecimiento — no es información que el cliente consulte.

-- ---------------------------------------------------------------------------
-- sync_state (guard de frecuencia genérico, reutilizable)
-- ---------------------------------------------------------------------------
create table public.sync_state (
  key text primary key,
  last_run_at timestamptz
);

alter table public.sync_state enable row level security;
-- Sin policies: solo backend (service_role).
