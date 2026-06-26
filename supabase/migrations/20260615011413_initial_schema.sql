-- Fase 1: identidad base (providers + users + sync con auth.users)
-- Ref: docs/database-design.md

-- ---------------------------------------------------------------------------
-- providers
-- ---------------------------------------------------------------------------
create table public.providers (
  code text primary key,
  name text not null,
  enabled boolean not null default true
);

alter table public.providers enable row level security;

create policy "providers are publicly readable"
  on public.providers for select
  to anon, authenticated
  using (true);

insert into public.providers (code, name) values
  ('steam', 'Steam'),
  ('epic', 'Epic Games'),
  ('xbox', 'Xbox / Game Pass');

-- ---------------------------------------------------------------------------
-- users (profile row mirroring auth.users)
-- ---------------------------------------------------------------------------
create table public.users (
  id uuid primary key references auth.users (id) on delete cascade,
  username text not null,
  avatar_url text,
  created_at timestamptz not null default now()
);

alter table public.users enable row level security;

-- Public profile info (username/avatar) is readable by any signed-in user,
-- needed to show friends' display names.
create policy "profiles are readable by authenticated users"
  on public.users for select
  to authenticated
  using (true);

create policy "users can update their own profile"
  on public.users for update
  to authenticated
  using ((select auth.uid()) = id)
  with check ((select auth.uid()) = id);

-- ---------------------------------------------------------------------------
-- Sync: create a public.users row whenever a new auth.users row is created.
-- ---------------------------------------------------------------------------
create function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into public.users (id, username, avatar_url)
  values (
    new.id,
    coalesce(
      new.raw_user_meta_data ->> 'name',
      new.raw_user_meta_data ->> 'full_name',
      split_part(new.email, '@', 1)
    ),
    new.raw_user_meta_data ->> 'avatar_url'
  );
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();
