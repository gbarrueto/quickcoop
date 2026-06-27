# Plan: flujo anónimo-primero (conectar → importar → matching) + alcance mínimo de backend

Propuesta en respuesta a la revisión de producto del 2026-06-26: el login/registro en
QuickCoop **no debe ser un requisito** para conectar cuentas y hacer matching — forzarlo
es un dark pattern (acción forzada). Este doc fija el modelo de datos/sesión, responde
las dos dudas abiertas planteadas, y deja un plan de fases. **No implementado todavía.**

---

## 1. Principio rector

Cualquier usuario, **sin cuenta qcoop**, puede conectar Steam/Epic/Xbox e ir directo a
matching. Crear cuenta es una mejora (persistencia entre dispositivos/sesiones), nunca un
gate. Esto revierte el auth-gate de Epic agregado en el rewiring anterior
(`landing-page.tsx` `onEpicConnectClick`) — se vuelve a abrir el diálogo de Epic siempre.

## 2. Matriz de capacidades por proveedor

| Proveedor | Librería propia | Amigos (lista) | Librería de amigos | Requiere qué |
|---|---|---|---|---|
| Steam | ✅ | ✅ | ✅ (salvo perfil privado) | Solo `steamId` público — Steam Web API ya trae todo de cualquier perfil no-privado, **sin que el amigo tenga cuenta qcoop** |
| Epic | ✅ | ✅ (solo accountId+displayName) | ❌ directo — Epic no expone la librería de otra cuenta | El amigo debe **tener cuenta qcoop** y haber importado su librería alguna vez (queda cacheada en qcoop) |
| Xbox/Game Pass | N/A (no hay "librería propia", es catálogo) | N/A | N/A | Solo tiene sentido combinado con Steam y/o Epic para cruzar contra amigos |

Esta asimetría (Steam ve amigos directo; Epic depende de que el amigo esté en qcoop) debe
quedar **transparente en la UI** vía copy contextual, no vía nuevas vistas:
- Tile de Xbox sin Steam/Epic conectado: nota de que Game Pass solo aporta en matching si
  hay otra cuenta conectada.
- Al conectar Epic: nota de que solo se ven juegos de amigos que también estén en qcoop.
- Al conectar anónimo (Steam o Epic): nudge de "regístrate para no perder esta conexión".

## 3. Modelo de conexión: dos niveles

### Anónimo (sin cuenta qcoop) — hoy ya es así para Steam, falta para Epic
- **Steam**: solo `steamId` (dato público, no hay token). Vive en `localStorage`
  ([lib/user-profile.ts](../lib/user-profile.ts)), como ya funciona.
- **Epic**: tokens OAuth (secretos, JWT >4KB — no entran en cookie). Vuelven a vivir
  **efímeros en memoria del servidor**, igual que el `lib/epic-session.ts` original
  (Map en `globalThis`, keyed por una cookie de sesión aleatoria, httpOnly). Se acepta
  que se pierdan en un restart/cold-start de serverless — es el costo aceptado de "no
  montar un backend sólido" para la sesión anónima. `epicAccountId` se cachea en
  `localStorage` solo para continuidad visual de UI.
- **Xbox**: solo el toggle `hasGamePass` en `localStorage`. Sin backend, en ningún caso
  (ni logueado) — así quedó explícitamente decidido.

### Registrado (con cuenta qcoop, logueado)
- **Steam**: `steamId` persiste en `external_accounts` (provider=`steam`,
  `provider_account_id` = steamId). **No necesita fila en `external_account_tokens`**
  (no hay secreto que guardar) — el upsert puede hacerse directo desde el cliente con el
  Supabase client normal (RLS `auth.uid() = user_id` ya lo permite), sin ruta backend
  nueva.
- **Epic**: tokens cifrados en `external_account_tokens` vía `saveEpicTokens` (ya
  construido en la sesión anterior), resuelto por `auth.uid()` en vez de cookie.
- **Xbox**: igual que en anónimo — `localStorage`, sin cambios.

### Transición anónimo → registrado
Si el usuario se registra/loguea teniendo ya una conexión anónima activa (cookie de
sesión Epic efímera y/o `steamId` en localStorage), el flujo de login/registro debe
**migrar esa conexión a la BDD en el mismo momento** (llamar `saveEpicTokens`/upsertar
Steam usando lo que ya está en la cookie efímera / localStorage) y limpiar la cookie
efímera. Así no se le pide reconectar después de crear cuenta — es el incentivo natural
para registrarse ("no pierdes lo que ya conectaste").

## 4. Rutas de auth: abiertas, con resolución dual

`token-exchange`, `library`, `friends` (Epic) dejan de exigir sesión qcoop. Cada ruta
resuelve la cuenta así (centralizar en un helper, no triplicar la lógica):
1. ¿Hay sesión qcoop (`auth.getUser()`)? → usar `getEpicTokens(userId)`/`saveEpicTokens`.
2. Si no → usar la sesión efímera por cookie (in-memory).

Si el usuario conecta **ya logueado**, se escribe directo a BDD y no se usa la cookie
efímera en absoluto.

## 5. Desconexión ("unlink")

Hoy no existe — la única forma de desconectar Epic/Steam es borrar cookies/sesión a
mano. Se necesita, sin agregar vistas nuevas (botón "Disconnect" en los tiles/diálogos
ya existentes):
- **Siempre**: limpiar la sesión efímera (cookie Epic) y el campo en `localStorage`.
- **Si está logueado**: además borrar la fila en BDD (`deleteEpicAccount(userId)` para
  Epic; delete de `external_accounts` para Steam — cascada limpia `external_account_tokens`
  si existiera).

## 6. Dudas abiertas — respuesta

### a) ¿Problema en que un usuario anónimo vea amigos ya registrados en qcoop?

Tiene un riesgo real pero acotado, manejable para el perfil de este proyecto:

- La tabla `friend_links` no sirve para esto — exige `owner_user_id` (cuenta qcoop real).
  Resolver "¿este amigo de Steam/Epic tiene cuenta qcoop?" para un usuario anónimo
  requiere un endpoint **sin estado**, separado: recibe los ids que el cliente **ya
  obtuvo en vivo** de Steam/Epic (nunca se guardan), los cruza contra `external_accounts`
  (la tabla global, no la owned-por-usuario) y devuelve solo `{providerAccountId,
  username}` de los que matchean. Sin persistencia, sin RLS de por medio (corre con
  `service_role` porque debe leer cuentas que no son las propias).
- **Qué se expone**: que tal cuenta de Steam/Epic tiene un username público en qcoop.
  Es el mismo dato que ya se expone a usuarios *logueados* vía `friend_links`/
  `external_accounts` — la única diferencia real es que ahora **cualquiera** puede
  consultarlo sin tener cuenta, no solo usuarios registrados. Es el mismo patrón que
  "contactos en la app" de WhatsApp/Telegram: aceptable si la respuesta es mínima
  (username, no email) y no permite enumerar *todos* los usuarios (solo resolver ids
  específicos que el caller ya conoce).
- **Lo que NO se resuelve ahora** (aceptado como límite, documentado, no bloqueante para
  un proyecto de curso): no hay rate-limiting ni anti-enumeración. Si esto se expusiera
  con tráfico real, habría que agregarlo — fuera de alcance de "backend mínimo".
- **Recomendación de simplificación**: dado que ya hay que construir esta resolución
  *sin estado* para usuarios anónimos, conviene usarla también para usuarios logueados
  en v1 (en vez de mantener en paralelo `friend_links` + sus triggers de resolución
  bidireccional). Los triggers ya aplicados en BDD no estorban (quedan sin uso); se
  puede revisar más adelante si vale la pena resucitarlos para cachear y evitar
  refetch constante a Steam/Epic. Para v1: **siempre en vivo**, para todos.

### b) ¿Problema con la misma cuenta Steam/Epic linkeada a 2 cuentas qcoop distintas?

No hay riesgo de duplicación: `external_accounts` ya tiene `unique(provider,
provider_account_id)` — un segundo usuario qcoop que intente linkear la misma cuenta de
Steam/Epic ya conectada a otro usuario choca con esa constraint. El único problema hoy
es que el error que llega es un violation crudo de Postgres, no un mensaje claro.

**A implementar:** capturar ese error específico (unique violation sobre
`provider_account_id`) en el upsert y devolver "Esta cuenta de Epic/Steam ya está
conectada a otro usuario de QuickCoop." Sin soporte de "transferir" el link — fuera de
alcance, se puede agregar después si hace falta.

## 7. Alcance mínimo de backend (foco del proyecto es frontend/UIUX)

No se busca un backend robusto. Lo mínimo necesario:

1. **Flujo de conexión + import + matching consistente** entre anónimo y registrado (lo
   de las secciones 3-5).
2. **Información real de juegos** (nombre, imagen, categorías, calificación,
   descripción, precio) donde la fuente lo permita:
   - Steam (propios/importados): ya hay nombre+imagen+tags
     ([app/api/steam/search](../app/api/steam/search/route.ts)). Falta precio y
     descripción corta — ambos vienen en el mismo `appdetails` que ya se usa para
     genres/categories, solo falta pedirlos.
   - Epic: hoy roto — `/api/epic/library` devuelve items crudos sin nombre/imagen
     reales ([lib/api/epic.ts](../lib/api/epic.ts) espera `game.title`/`keyImages` que
     no existen en la respuesta cruda). Requiere portar el pipeline ya diseñado en
     [docs/epic-game-details-pipeline.md](epic-game-details-pipeline.md) (al menos la
     parte de nombre+imagen+tags; descripción/requisitos pueden esperar).
   - Epic friends: nombres no aparecen — falta el bulk lookup
     `account/api/public/account?accountId=...` (ya listado como pendiente histórico).
   - Xbox/Game Pass: el catálogo (`catalog.gamepass.com`) ya trae nombre+imagen reales;
     precio/calificación **no aplican** por diseño (no se vende individualmente) — no es
     un gap, hay que documentarlo así para que no se intente "arreglar".
3. **Fallback a mock documentado**: donde no se pueda obtener un dato real (p.ej.
   descripción/precio de Epic hasta portar el pipeline), usar un placeholder y
   documentarlo explícitamente — mismo patrón que ya existe en
   [lib/matching/constants.ts](../lib/matching/constants.ts) (`RECOMMENDED_GAMES` es
   100% mock hoy). No bloquea avanzar mientras quede registrado qué es real y qué no.

## 8. Plan de fases

**Fase A — Revertir gate + sesión efímera de Epic ✅ implementado (2026-06-26)**
1. Revertir `onEpicConnectClick` en `landing-page.tsx` (sin gate).
2. Resucitar una sesión Epic efímera (cookie + Map en memoria), separada de la
   persistente.
3. `token-exchange`/`library`/`friends`: resolución dual (qcoop → BDD; si no, efímera),
   centralizada en un helper.
4. Login/registro: si hay sesión efímera activa, migrarla a BDD ahí mismo.
   (También se removió el gate de login en `/matching` que había quedado de Fase 1
   — no estaba listado explícitamente aquí, pero contradecía la sección 1.)

**Fase B — Persistencia de Steam + desconexión ✅ implementado (2026-06-26)**
5. Upsert de `external_accounts` para Steam al conectar logueado (cliente directo,
   sin ruta backend nueva) — también se cubre el caso anónimo-conecta-luego-se-loguea
   desde `use-auth-session.ts`.
6. Endpoints/handlers de desconexión para Epic (`POST /api/epic/auth/disconnect`) y
   Steam (delete directo desde el cliente, RLS). Mensaje claro para el caso de cuenta
   ya linkeada a otro usuario (sección 6b) vía `DuplicateAccountLinkError`.
7. Botón "Disconnect" en los diálogos existentes de Steam/Epic (sin vistas nuevas).
   De paso se corrigió un bug pre-existente: `EpicConnectDialog` instanciaba su propio
   `useEpicAuth()` separado del de `landing-page.tsx`, por lo que nunca sabía que ya
   había una cuenta conectada al abrir el diálogo en una carga fresca — se unificó a
   una sola instancia (mismo patrón que ya usaba Steam).

**Fase C — Resolución de identidad sin estado ✅ implementado (2026-06-26)**
8. Endpoint `POST /api/identity/resolve` (service-role, batch, sin persistencia).
9. `load-matching-data.ts` lo usa para amigos Epic — queda `qcoopUsername` en
   `IdentityRef`, calculado pero **sin badge de UI todavía** (eso es Fase E,
   disclosure). Steam no se resolvió (su librería de amigos ya funciona sin depender
   de qcoop — "opcionalmente Steam" de la propuesta original, se dejó fuera por no
   aportar valor funcional ahora). `friend_links`/sus triggers quedan sin uso, tal
   como se decidió en la sección 6a.
10. Bulk lookup de nombres de amigos Epic (`lib/epic/account-lookup.ts`,
    `account/api/public/account`, batches de 100) — resuelve el bug reportado de
    nombres vacíos en la lista de amigos de Epic.

**Fase D — Piso mínimo de datos reales**
11. ✅ **Ampliado y implementado (2026-06-26)**: el alcance pasó de "lo mínimo" a
    **pipeline de Epic completo**, incluyendo precio/descuento (la `OFFERS_QUERY` de
    `epicstore_api` ya traía `price.totalPrice` completo — se portó incluido, no solo
    nombre+imagen+tags). Incluye también el esquema de catálogo (`games`/
    `game_listings`/`user_games`/`epic_namespace_slug`/`sync_state`, antes "Fase 3,
    fuera de alcance" — el usuario la trajo a este alcance) y el enriquecimiento
    on-demand (cache-check antes de re-fetchear Epic, upsert de lo nuevo). Ver detalle
    debajo. **Sin wiring a la UI de matching todavía** — "el dónde va cada dato" queda
    para la fase final de UIUX, según indicación explícita del usuario.
12. ✅ **Implementado y verificado en vivo (2026-06-26)**: `lib/steam/{store-api,
    game-details-pipeline}.ts` + `GET /api/steam/game-details?steamId=...` — usa
    `appdetails` (`price_overview`, `detailed_description`, genres/categories,
    `header_image`), mismo cache-check contra `game_listings` que Epic (vía
    `lib/catalog/store.ts`, ahora provider-agnóstico). Probado contra una cuenta Steam
    real: 76 juegos, BDD poblada (`game_listings` con `provider='steam'`), segunda
    llamada confirmadamente más rápida (cache hit). Cap de 80 juegos nuevos por
    request (mismo límite que `app/api/steam/game-categories/route.ts`).
13. **Decisión (2026-06-26): no hace falta mock data.** Todo lo planificado hasta ahora
    es obtenible de fuentes reales (Steam appdetails, Epic pipeline). Se descarta el
    punto "fallback a mock documentado" de la sección 7 — ya no aplica.
    **Hallazgo de paso**: `lib/matching/game-utils.ts`'s `deriveRating`/`derivePlayers`
    (usados en `toGameCards` para juegos de Steam) son **valores inventados** (hash
    determinístico del appId, no datos reales) — pendiente de decidir si se
    reemplazan (Steam expone score de reviews vía `/appreviews/{appid}`, pero no un
    "rango de jugadores" real). No se tocó, queda para cuando se revise esto.

**Recomendaciones (`lib/matching/recommendation-utils.ts`) — investigado, decisión:
esperar.** La lógica SÍ es real (ordena por `playtimeMinutes` real para "most played",
score por tags coincidentes para "similar") — no hay que tocar el algoritmo. Lo que es
mock es el **pool de candidatos** (`RECOMMENDED_GAMES`, estático). Cambiarlo por una
query real contra `games`/`game_listings` es el paso natural, pero el catálogo se
puebla on-demand (sección 4) — con pocos usuarios reales importando, el pool de "otros
juegos no poseídos" puede salir vacío o muy chico en desarrollo/demo. **El usuario
decidió esperar a tener más datos importados antes de hacer este swap** (2026-06-26) —
no implementar todavía, revisitar cuando el catálogo tenga más variedad.

**Política transversal (desde 2026-06-26): toda implementación nueva de data-fetching
en el front usa TanStack Query** (`useQuery`/`useMutation`), sin excepción salvo lo ya
documentado como excluido (flujos OAuth/popup, estado local/localStorage). No se
refactoriza lo existente por ahora (tiempo) — la migración de `load-matching-data.ts`
queda pendiente para cuando se aborde esa pieza completa.

### Detalle de la Fase D (Epic, 2026-06-26)

- **Migración** `20260626190137_catalog_games_schema.sql` (aplicada a dev): `games`,
  `game_listings`, `user_games`, `epic_namespace_slug`, `sync_state` — esquema y RLS
  tal cual [database-design.md](database-design.md) secciones 3, 6 y 8.
  `epic_namespace_slug`/`sync_state` quedaron sin policies (solo `service_role`,
  nunca las consulta el cliente).
- **Pipeline** (`lib/epic/`): `store-api.ts` (get_product, productmapping, metadata
  bulk, offers bulk vía GraphQL — query trimmed pero con `price.totalPrice` completo),
  `namespace-slug.ts` (cache + guard de 6h en `sync_state` antes de re-descargar el
  dump completo), `catalog-store.ts` (lee cache de `game_listings`, upsert de
  `games`+`game_listings` nuevos con `kind`/`parent_listing_id` para DLC, link de
  `user_games` solo si hay sesión qcoop), `game-details-pipeline.ts` (orquesta todo,
  namespace por namespace, fully-cached → reconstruye desde BDD sin tocar Epic;
  cache-miss → corre el pipeline completo).
- **Endpoint** `GET /api/epic/game-details`: resuelve la cuenta (dual, igual que
  library/friends), trae la library cruda, corre el pipeline, linkea `user_games` si
  corresponde.
- **Hook** `hooks/use-epic-game-details.ts`: `useQuery` (TanStack), no consumido por
  ningún componente todavía.
- **Gap conocido, no tocado**: `lib/api/epic.ts`/`load-matching-data.ts` esperan
  `epicLibPayload.games`, pero `/api/epic/library` devuelve `items` — el campo nunca
  matcheó, por eso `epicGames` queda `[]` siempre en matching hoy. No se tocó porque
  es del lado de la UI de matching (deferido a la fase UIUX), pero hay que tenerlo
  presente: con el pipeline nuevo disponible, probablemente la solución natural sea
  reemplazar ese fetch crudo por `useEpicGameDetails` cuando se aborde esa fase.
- **Sin tests automatizados**: el pipeline no se pudo probar contra Epic real desde
  este entorno (sin sesión de usuario). Verificado solo con `tsc`/`eslint`/`db
  advisors` limpios — falta probarlo end-to-end con una cuenta Epic real conectada.

### Curación manual de offers (Epic) — decisión final (2026-06-26)

`get_product` + metadata bulk (nombre, imagen base, descripción, géneros vía
`meta.tags`) **nunca tuvieron problema** y siguen 100% automatizados en el pipeline
live. El problema es específico de **offers/GraphQL** (precio, descuento, tags
completos genre+feature, imagen del offer):

- `store.epicgames.com/graphql` está detrás de un challenge de Cloudflare que bloquea
  cualquier cliente HTTP plano (`fetch`/`curl`), headers de navegador completos o no
  — confirmado a mano.
- `cloudscraper` (Python) sí lo resuelve, pero **solo si la IP de origen tiene buena
  reputación** — no es solo el challenge JS/TLS, Cloudflare también filtra por
  reputación de IP/ASN. Confirmado con dos hosts distintos:
  - **PythonAnywhere (free)**: ni siquiera llega — su proxy de salida obligatorio
    bloquea dominios no-whitelisteados (`ProxyError 403` antes de tocar Cloudflare).
  - **Render (free)**: llega, pero Cloudflare le devuelve el challenge 403 igual que
    a curl — su rango de IPs (como el de cualquier PaaS conocido, target frecuente de
    scraping) está mal reputado.
  - Mi sandbox de desarrollo y la red local del usuario **sí pasan** — de ahí que el
    flujo completo funcionara cuando se probó con el bridge corriendo en
    `localhost` durante desarrollo.
- **Decisión: curación manual, local, periódica** — en vez de perseguir un host que
  pase el filtro de reputación (probar Railway/Fly es una apuesta sin garantía; un
  proxy residencial pago sí funcionaría pero tiene costo recurrente, descartado para
  un proyecto de curso). Se construyó
  [scripts/curate_epic_offers.py](../scripts/curate_epic_offers.py): corre a mano
  desde una máquina con buena reputación de IP (la del usuario), busca en
  `game_listings` (`provider='epic'`, `price IS NULL`, con `offerId` conocido —
  excluye DLCs a propósito, que nunca tienen oferta propia por diseño), resuelve los
  offers contra Epic con `cloudscraper`, y actualiza `game_listings` +
  `games.primary_image_url`/`tags` directo vía REST de Supabase
  (`SUPABASE_SERVICE_ROLE_KEY`, leído de `.env.local`).
  **Validado end-to-end**: se anuló a propósito el precio/tags/imagen de una entrada
  real (Marvel's Guardians of the Galaxy) y el script la repobló correctamente en un
  solo run.
- **Workflow esperado**: "poblando de a poco" — cada vez que el catálogo tenga
  entradas nuevas sin precio (alguien importó una librería de Epic nueva), correr
  `python3 scripts/curate_epic_offers.py` (con `--dry-run` primero si se quiere
  revisar antes de escribir) desde una máquina local. No es automático ni tiene por
  qué serlo — es la curación manual que el usuario decidió adoptar.
- El bridge (`services/epic-offers-bridge/`, desplegado en Render) **queda como
  está pero no resuelve el problema** — se deja documentado por si Cloudflare cambia
  de criterio o aparece un host con mejor reputación; `fetchOffersBulk` ya degrada a
  `{}` con gracia si no responde, así que no hace daño dejarlo.
- **Backlog (no curación ahora):** revisando la BDD quedan juegos no-DLC con
  `description`/`requirements` vacíos (casos donde `get_product` no encontró
  `productHome` o vino sin `about.shortDescription`/`requirements.systems` — degrada
  con gracia, no rompe nada, pero el dato falta). Se deja para una curación futura,
  no bloquea el cierre de Fase D.

**Fase D — cerrada (2026-06-26).**

**Fase E — Disclosure de UX ✅ implementado (2026-06-26), sin vistas nuevas**
14. Copys/badges contextuales según sección 2: nota en `quick-start-panel.tsx` cuando
    hay Game Pass sin Steam/Epic; badge "On QuickCoop as {username}" + nota general
    por amigo Epic en `matching-friends-panel.tsx` (consume el `qcoopUsername` que
    Fase C ya calculaba); nudge "Sign up to keep this connection..." en
    `steam-connect-dialog.tsx`/`epic-connect-dialog.tsx` cuando se conecta sin sesión
    qcoop (requirió pasar `currentUser` a ambos diálogos desde `landing-page.tsx`).

**Sumado a pedido del usuario en esta misma fase:**
15. **Juegos de Epic ya se muestran en matching** — `load-matching-data.ts` reemplazó
    el fetch crudo roto (`fetchEpicLibrary`/`epicGameToCard`, esperaba un campo
    `games` que `/api/epic/library` nunca tuvo) por `fetchEpicGameDetails`/
    `epicGameDetailsToCard` — el pipeline completo de Fase D, que de paso sigue
    enriqueciendo la BDD como antes. Se eliminó el código muerto resultante:
    `fetchEpicLibrary`, `epicGameToCard`, los tipos `EpicGame`/`EpicLibraryPayload`, y
    la ruta `app/api/epic/library` (sin más consumidores).
16. **Recommendations con datos reales** — `lib/api/catalog.ts` (`fetchCatalogCandidates`,
    query directa a Supabase vía `games.tags.overlaps(...)`, sin ruta nueva — la tabla
    ya es de lectura pública) + `hooks/use-catalog-recommendations.ts` (TanStack).
    `recommendation-utils.ts` prioriza estos candidatos reales sobre `RECOMMENDED_GAMES`
    (dedupe por nombre), y solo usa el mock estático para rellenar cuando el catálogo
    no tiene suficientes — nunca antes. El scoring (most-played, tag-matching) no
    cambió, solo la fuente de candidatos. Verificado contra la BDD real (juegos de
    Epic ya curados aparecen con precio/descripción reales).

## 9. Fuera de alcance

Cualquier mejora más allá de este flujo mínimo (rate-limiting del resolve, cachear
amigos resueltos, refresh token de Epic, fase de catálogo `games`/`game_listings`
completa, etc.) queda como backlog de "proyecto personal a futuro" — una vez el flujo
mínimo esté sólido, el foco vuelve a frontend/UIUX.

Relacionado: [database-design.md](database-design.md) ·
[epic-game-details-pipeline.md](epic-game-details-pipeline.md) ·
[session-handoff-2026-06-26.md](session-handoff-2026-06-26.md)
