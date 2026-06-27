-- Fase 2: cuentas externas + amigos crudos + resolución de identidad
-- Ref: docs/database-design.md sección 2

-- ---------------------------------------------------------------------------
-- external_accounts (cuentas de store conectadas a un usuario qcoop)
-- ---------------------------------------------------------------------------
create table public.external_accounts (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.users (id) on delete cascade,
  provider text not null references public.providers (code),
  provider_account_id text not null,
  display_name text,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (provider, provider_account_id),
  unique (user_id, provider)
);

alter table public.external_accounts enable row level security;

create policy "users manage their own external accounts"
  on public.external_accounts for all
  to authenticated
  using ((select auth.uid()) = user_id)
  with check ((select auth.uid()) = user_id);

-- ---------------------------------------------------------------------------
-- friend_links (amigos "crudos" por proveedor, con resolución a usuarios qcoop)
-- ---------------------------------------------------------------------------
create table public.friend_links (
  id uuid primary key default gen_random_uuid(),
  owner_user_id uuid not null references public.users (id) on delete cascade,
  provider text not null references public.providers (code),
  provider_friend_id text not null,
  display_name text,
  avatar_url text,
  linked_user_id uuid references public.users (id) on delete set null,
  last_synced_at timestamptz,
  created_at timestamptz not null default now(),
  unique (owner_user_id, provider, provider_friend_id)
);

alter table public.friend_links enable row level security;

create policy "users manage their own friend links"
  on public.friend_links for all
  to authenticated
  using ((select auth.uid()) = owner_user_id)
  with check ((select auth.uid()) = owner_user_id);

-- ---------------------------------------------------------------------------
-- Resolución de identidad bidireccional
-- ---------------------------------------------------------------------------

-- 1) Al insertar un friend_link, intentar resolver linked_user_id contra
--    external_accounts ya existentes.
create function public.resolve_friend_link()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  if new.linked_user_id is null then
    select user_id into new.linked_user_id
    from public.external_accounts
    where provider = new.provider
      and provider_account_id = new.provider_friend_id
    limit 1;
  end if;
  return new;
end;
$$;

create trigger resolve_friend_link_before_insert
  before insert on public.friend_links
  for each row execute function public.resolve_friend_link();

-- 2) Al insertar/actualizar un external_account, enlazar retroactivamente
--    cualquier friend_link sin resolver de otros usuarios que coincida.
create function public.resolve_external_account()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  update public.friend_links
  set linked_user_id = new.user_id
  where provider = new.provider
    and provider_friend_id = new.provider_account_id
    and linked_user_id is null;
  return new;
end;
$$;

create trigger resolve_external_account_after_insert
  after insert or update on public.external_accounts
  for each row execute function public.resolve_external_account();
