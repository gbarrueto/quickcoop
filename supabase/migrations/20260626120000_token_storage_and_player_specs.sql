-- Fase 3: almacenamiento seguro de tokens de proveedor + specs de usuario
-- Ref: docs/database-design.md
--
-- Los access/refresh tokens de Epic se REENVÍAN a la API de Epic, por lo que no
-- pueden hashearse (necesitamos recuperarlos en claro). Se cifran a nivel de
-- aplicación (AES-256-GCM, clave en env var fuera de la BDD) antes de
-- guardarse, y la tabla queda accesible SOLO para el backend (service_role).

-- ---------------------------------------------------------------------------
-- external_account_tokens (tokens cifrados, 1:1 con external_accounts)
-- ---------------------------------------------------------------------------
create table public.external_account_tokens (
  account_id uuid primary key references public.external_accounts (id) on delete cascade,
  -- Ciphertext AES-256-GCM en base64 (iv ++ authTag ++ ciphertext). NUNCA texto plano.
  access_token text not null,
  refresh_token text,
  token_type text,
  expires_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.external_account_tokens enable row level security;

-- Sin policies: con RLS activado y ninguna policy permisiva, los roles anon y
-- authenticated obtienen cero filas. Además revocamos privilegios de tabla como
-- defensa en profundidad frente al Data API. service_role ignora RLS y conserva
-- el acceso para uso exclusivo del backend.
revoke all on table public.external_account_tokens from anon, authenticated;

-- ---------------------------------------------------------------------------
-- users.specs (specs de sistema del jugador, persistidas server-side)
-- ---------------------------------------------------------------------------
-- jsonb con la forma StoredPlayerSpecs ({ os, cpuTier, gpuTier, ramGb, vramGb,
-- storageGb }). No es información sensible y la usa el matching, por lo que las
-- policies existentes de public.users (lectura por authenticated, update solo
-- del propio perfil) son suficientes.
alter table public.users
  add column specs jsonb;
