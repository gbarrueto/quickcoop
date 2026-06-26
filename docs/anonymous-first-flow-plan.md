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

**Fase A — Revertir gate + sesión efímera de Epic**
1. Revertir `onEpicConnectClick` en `landing-page.tsx` (sin gate).
2. Resucitar una sesión Epic efímera (cookie + Map en memoria), separada de la
   persistente.
3. `token-exchange`/`library`/`friends`: resolución dual (qcoop → BDD; si no, efímera),
   centralizada en un helper.
4. Login/registro: si hay sesión efímera activa, migrarla a BDD ahí mismo.

**Fase B — Persistencia de Steam + desconexión**
5. Upsert de `external_accounts` para Steam al conectar logueado (cliente directo,
   sin ruta backend nueva).
6. Endpoints/handlers de desconexión para Epic y Steam (efímero + localStorage +, si
   logueado, BDD). Mensaje claro para el caso de cuenta ya linkeada a otro usuario
   (sección 6b).
7. Botón "Disconnect" en los tiles/diálogos existentes (sin vistas nuevas).

**Fase C — Resolución de identidad sin estado (para todos, anónimos y logueados)**
8. Endpoint `POST /api/identity/resolve` (service-role, batch, sin persistencia).
9. `load-matching-data.ts` lo usa para amigos Epic (y opcionalmente Steam) en vez de
   depender de `friend_links`/triggers.
10. Bulk lookup de nombres de amigos Epic (mismo tipo de trabajo, mismo milestone).

**Fase D — Piso mínimo de datos reales**
11. Portar lo mínimo del pipeline de Epic (nombre+imagen+tags) para que los tiles de
    Epic dejen de salir vacíos/rotos.
12. Extender el `appdetails` de Steam ya en uso para traer precio + descripción corta.
13. Tabla corta en docs: por proveedor, qué campo es real vs. mock/placeholder hoy.

**Fase E — Disclosure de UX (solo frontend, sin vistas nuevas)**
14. Copys/badges contextuales en quick-start-panel/hero-section según sección 2.

## 9. Fuera de alcance

Cualquier mejora más allá de este flujo mínimo (rate-limiting del resolve, cachear
amigos resueltos, refresh token de Epic, fase de catálogo `games`/`game_listings`
completa, etc.) queda como backlog de "proyecto personal a futuro" — una vez el flujo
mínimo esté sólido, el foco vuelve a frontend/UIUX.

Relacionado: [database-design.md](database-design.md) ·
[epic-game-details-pipeline.md](epic-game-details-pipeline.md) ·
[session-handoff-2026-06-26.md](session-handoff-2026-06-26.md)
