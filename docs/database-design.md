# Diseño de base de datos (Supabase / Postgres)

Propuesta de esquema para soportar cuentas de usuario, cachear las bibliotecas/amigos
de las stores integradas (Steam, Epic, Xbox) y servir como fuente confiable de catálogo
— reduciendo la dependencia de rate limits externos (ej. Steam).

---

## 1. Objetivos y desafíos

- **Cuentas QuickCoop** que enlazan una o más cuentas de store (Steam/Epic/Xbox, y a
  futuro GOG/EA/etc.).
- **Catálogo de juegos**: no es viable poblarlo de antemano (Steam por sí solo es enorme).
  Se puebla **on-demand**: cuando un usuario importa su biblioteca, los juegos que no
  estén en la BDD se enriquecen (descripción, imágenes, requisitos, tags) y se guardan.
- **Permisos de escritura**: el catálogo nunca se escribe desde el cliente. Los
  inserts/upserts a `games`/`game_listings` los hace siempre el backend con la
  **service role key** (bypassea RLS); el cliente solo tiene `SELECT`.
- **Mismo juego, distinto nombre/edición**: "GTA V" vs "GTA V: Deluxe Edition" deberían
  poder jugarse juntos aunque tengan IDs distintos por store. Se resuelve separando
  *listing por store* de *juego canónico* (sección 3).
- **Amigos y resolución de identidad**: un usuario importa sus amigos de Steam/Epic
  (quedan como edges "crudos" sin cuenta qcoop asociada). Si ese amigo crea cuenta
  después y conecta la misma cuenta de store, hay que poder enlazar retroactivamente
  ambos lados (sección 2).
- **Extensibilidad a nuevas stores**: agregar GOG/EA/etc. no debería requerir cambios
  de esquema, solo datos + código de integración (sección 5).
- **Mapping `namespace → slug` de Epic**: necesario *antes* de poder enriquecer un
  juego nuevo de Epic, y el endpoint de Epic solo entrega un volcado masivo — se cachea
  en BDD con refresco periódico (sección 6).
- **Staleness / evitar llamadas externas redundantes**: cachear con TTL y solo
  re-fetchear cuando el dato está vencido (sección 7).

---

## 2. Identidad y amigos

### `providers`
| campo | tipo | notas |
|---|---|---|
| `code` | text (PK) | `'steam'`, `'epic'`, `'xbox'`, futuro `'gog'`, etc. |
| `name` | text | nombre legible |
| `enabled` | boolean | permite desactivar una integración sin borrar datos |

### `users`
| campo | tipo | notas |
|---|---|---|
| `id` | uuid (PK) | = `auth.users.id` (Supabase Auth) |
| `username` | text | |
| `avatar_url` | text | |
| `created_at` | timestamptz | |

### `external_accounts`
Cuentas de store conectadas a un usuario qcoop.

| campo | tipo | notas |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid FK → users | |
| `provider` | text FK → providers.code | |
| `provider_account_id` | text | steamId / epic accountId / xbox xuid |
| `display_name` | text | nickname en esa store |
| `last_synced_at` | timestamptz | |

Constraints: `UNIQUE(provider, provider_account_id)`, `UNIQUE(user_id, provider)`.

### `friend_links`
Edges "crudos" de amistad por proveedor — existen aunque el amigo no tenga cuenta qcoop.

| campo | tipo | notas |
|---|---|---|
| `id` | uuid (PK) | |
| `owner_user_id` | uuid FK → users | quién importó este amigo |
| `provider` | text FK → providers.code | |
| `provider_friend_id` | text | id del amigo en esa store |
| `display_name` | text | nickname visto en esa store |
| `avatar_url` | text | |
| `linked_user_id` | uuid FK → users, NULL | se rellena si el amigo tiene cuenta qcoop |
| `last_synced_at` | timestamptz | |

Constraint: `UNIQUE(owner_user_id, provider, provider_friend_id)`.

**Resolución de identidad**: al insertar/actualizar `external_accounts` o
`friend_links`, buscar coincidencias cruzadas por `(provider, provider_account_id) ↔
(provider, provider_friend_id)` y setear `linked_user_id`. Esto cubre ambos sentidos:
- Usuario A importa amigos → si alguno ya tiene `external_accounts` con ese
  `(provider, provider_account_id)`, se enlaza de inmediato.
- Usuario B se registra y conecta una cuenta de store → se buscan `friend_links` sin
  resolver de otros usuarios que matcheen su `(provider, provider_account_id)` y se
  enlazan retroactivamente.

---

## 3. Juegos

### `games` — entidad canónica (cross-store)
| campo | tipo | notas |
|---|---|---|
| `id` | uuid (PK) | |
| `name` | text | nombre canónico/limpio |
| `description` | text | |
| `primary_image_url` | text | |
| `tags` | text[] | géneros + features normalizados |
| `kind` | enum(`game`,`dlc`) | |
| `match_status` | enum(`auto`,`manual`,`unmatched`) | auditoría del matching cross-store |
| `created_at`, `updated_at` | timestamptz | |

### `game_listings` — entrada por store
| campo | tipo | notas |
|---|---|---|
| `id` | uuid (PK) | |
| `game_id` | uuid FK → games | |
| `provider` | text FK → providers.code | |
| `store_game_id` | text | appid / catalogItemId / xbox productId |
| `title` | text | título tal cual lo da la store |
| `description`, `images`, `requirements`, `tags` | jsonb / text[] | mismo shape que el pipeline de Epic/Steam |
| `provider_meta` | jsonb | datos específicos de la store (ej. `epic_slug`) |
| `parent_listing_id` | uuid FK → game_listings, NULL | DLC → juego base, dentro de la misma store |
| `fetched_at` | timestamptz | usado para TTL de refresco |

Constraint: `UNIQUE(provider, store_game_id)`.

### `user_games` — biblioteca de cada usuario
| campo | tipo | notas |
|---|---|---|
| `id` | uuid (PK) | |
| `user_id` | uuid FK → users | |
| `listing_id` | uuid FK → game_listings | |
| `owned_since` | timestamptz, NULL | si la API lo entrega |
| `last_synced_at` | timestamptz | |

Constraint: `UNIQUE(user_id, listing_id)`.

### Matching cross-store (mismo juego, distinta edición/store)

- Cada `game_listings` nace apuntando a un `games` propio (1:1), `match_status =
  'unmatched'`.
- Matching automático: normalizar título (quitar "Deluxe/GOTY/Definitive/Ultimate
  Edition", paréntesis, etc.) y comparar contra `games.name` normalizados. Si hay alta
  similitud, re-apuntar `game_id` al canónico existente (el `games` huérfano se limpia)
  y marcar `match_status = 'auto'`.
- Casos curados a mano (top juegos multiplayer, ya identificados en
  `trending-multiplayer`) → `match_status = 'manual'`.
- Si queda `unmatched`, no rompe nada: ese listing simplemente no se agrupa con otras
  stores todavía (se puede re-procesar más adelante).
- DLC vs juego base (`kind` + `parent_listing_id`) es independiente del matching
  cross-store — ya se resuelve por store (Epic: `mainGameItem`; Steam: `type`).

---

## 4. Población on-demand y permisos de escritura

1. Usuario importa su library → lista de `(provider, store_game_id)`.
2. Backend hace `SELECT store_game_id, fetched_at FROM game_listings WHERE provider = X
   AND store_game_id IN (...)`.
3. Para los que no existen o tienen `fetched_at` vencido (ver TTL en sección 7): correr
   el pipeline de enriquecimiento (Steam appdetails / Epic pipeline) y hacer **upsert**
   (`ON CONFLICT (provider, store_game_id) DO UPDATE/NOTHING`).
4. Para todos: upsert en `user_games` (`ON CONFLICT (user_id, listing_id) DO NOTHING`).

**Permisos**: `games`/`game_listings` → RLS con `SELECT` público (`anon` +
`authenticated`), `INSERT`/`UPDATE` solo `service_role`. No existe ningún endpoint que
acepte "crea este juego con estos datos" desde el cliente — el único disparador es "hice
fetch de la library de un usuario y esta entrada no está/está vencida en la BDD".

`user_games`, `external_accounts`, `friend_links` → RLS: solo el propio `user_id` /
`owner_user_id` (lectura/escritura), más `service_role` para los jobs de sync.

Los upserts son baratos e idempotentes (un solo round-trip indexado) — no hace falta
`SELECT` previo para decidir si insertar. Lo que sí se evita con el chequeo del paso 2
es repetir el **fetch externo caro** (Steam appdetails, Epic get_product/offers).

---

## 5. Extensibilidad a nuevas stores (GOG, EA, etc.)

Agregar una store nueva = **dato, no migración de esquema**:

- `provider` es `text` con FK a `providers.code` (no un enum nativo de Postgres, para
  evitar `ALTER TYPE ... ADD VALUE` en cada integración nueva).
- `INSERT INTO providers (code, name, enabled) VALUES ('gog', 'GOG', true)`.
- El resto de las tablas ya son "una fila por store por juego/cuenta/amigo" —
  `game_listings`, `external_accounts`, `friend_links` no cambian.
- Lo único nuevo es el **código de integración** (route handler que sabe hablar con la
  API de esa store y mapear su payload a `title/description/images/requirements/tags`).
- Conceptos específicos de una store que otras no tengan se guardan en el `jsonb`
  `provider_meta`/`requirements`/etc. sin tocar el esquema.

---

## 6. Mapping `namespace → slug` de Epic

El endpoint `productmapping` de Epic entrega un **volcado masivo** (todos los
namespaces → slug), no es queryable por namespace individual. Consultarlo en cada
cache-miss sería descargar el archivo completo por un solo juego nuevo.

### `epic_namespace_slug`
| campo | tipo | notas |
|---|---|---|
| `namespace` | text (PK) | |
| `slug` | text | |
| `updated_at` | timestamptz | |

### `sync_state` (genérico, reutilizable)
| campo | tipo | notas |
|---|---|---|
| `key` | text (PK) | ej. `'epic_namespace_slug_refresh'` |
| `last_run_at` | timestamptz | |

**Flujo**:
1. Job periódico (ej. semanal) descarga `productmapping` completo y hace upsert masivo
   a `epic_namespace_slug`.
2. Resolución on-demand: `SELECT slug FROM epic_namespace_slug WHERE namespace = ?`.
   - **Hit** → seguir con `get_product(slug)` y, opcionalmente, cachear el slug también
     en `provider_meta.epic_slug` del `game_listings` resultante.
   - **Miss** → puede ser (a) juego nuevo desde el último cron, o (b) un namespace que
     nunca mapea a slug (DLC/entries no-producto). Chequear `sync_state` para no
     refrescar más de 1 vez cada X horas; si corresponde, refresh live del bulk y
     reintentar. Si sigue sin aparecer, tratar como "sin slug" (igual que hoy se filtran
     esas entradas en el pipeline).

`sync_state` queda disponible para guards de frecuencia de otros jobs futuros (no solo
Epic).

---

## 7. Staleness y TTLs

- `game_listings.fetched_at` determina si se re-corre el pipeline de enriquecimiento
  (Steam appdetails / Epic get_product+offers). TTL sugerido: días/semanas — esta
  metadata cambia poco.
- `external_accounts.last_synced_at` / `friend_links.last_synced_at` /
  `user_games.last_synced_at`: TTL más corto (o refresco manual desde la UI), ya que la
  biblioteca y la lista de amigos de un usuario sí cambian con frecuencia.
- `epic_namespace_slug` se refresca por cron + guard en `sync_state`, no por TTL por
  fila.

---

## 8. Resumen de permisos (RLS)

| Tabla | `SELECT` | `INSERT`/`UPDATE` |
|---|---|---|
| `providers` | público | `service_role` |
| `games`, `game_listings` | público | `service_role` |
| `epic_namespace_slug` | público (o `service_role` only) | `service_role` |
| `sync_state` | `service_role` | `service_role` |
| `users` | propio (`auth.uid() = id`) | propio / `service_role` |
| `external_accounts`, `friend_links`, `user_games` | propio (`auth.uid() = user_id` / `owner_user_id`) | propio + `service_role` (jobs de sync) |

---

Relacionado: [epic-game-details-pipeline.md](epic-game-details-pipeline.md) ·
[rutas-backend.md](rutas-backend.md) · [integracion-epic-xbox.md](integracion-epic-xbox.md)
