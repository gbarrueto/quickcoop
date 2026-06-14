# Rutas del backend y APIs externas

Referencia de los endpoints internos de QuickCoop (Next.js route handlers en `app/api/`)
y de todas las APIs externas que se consumen, con su clasificación.

> Convención: todos los handlers son `GET` salvo que se indique. Las llamadas a APIs
> externas se hacen **siempre desde el backend** (route handlers), nunca desde el navegador,
> por CORS y para no exponer secretos.

---

## 1. Rutas internas (`app/api/`)

### Epic

| Ruta | Método | Params | Propósito | APIs externas que usa |
|---|---|---|---|---|
| `/api/epic/auth/token-exchange` | POST | body `{ authorizationCode }` | Intercambia el authCode por tokens, crea sesión server-side y setea cookie `epic-session-id` | Epic `account/api/oauth/token` |
| `/api/epic/friends` | GET | — (usa sesión) | Lista de amigos del usuario (array de accountIds) | Epic `friends-public-service` |
| `/api/epic/library` | GET | `cursor?` (usa sesión) | Biblioteca de juegos del usuario (paginada) | Epic `library-service` |
| `/api/epic/debug` | GET | — (usa sesión) | **DEBUG — eliminar antes de prod.** Devuelve la sesión con tokens en claro | — |

Auth: dependen de la cookie de sesión creada en token-exchange (ver
[integracion-epic-xbox.md](integracion-epic-xbox.md) y `lib/epic-session.ts`).
Credenciales: `EPIC_CLIENT_ID`, `EPIC_CLIENT_SECRET` (env).

### Steam

| Ruta | Método | Params | Propósito | APIs externas que usa |
|---|---|---|---|---|
| `/api/steam/login` | GET | — | Inicia el login: redirige al OpenID de Steam | Steam OpenID |
| `/api/steam/callback` | GET | (OpenID) | Verifica la aserción OpenID, extrae el `steamId` y lo devuelve a la app vía `postMessage` (HTML bridge) | Steam OpenID |
| `/api/steam/owned-games` | GET | `steamId` | Juegos que posee el usuario | Steam Web API `IPlayerService/GetOwnedGames` |
| `/api/steam/friends` | GET | `steamId` | Amigos + nombres/avatares (resuelve summaries en lotes de 100) | Steam Web API `GetFriendList` + `GetPlayerSummaries` |
| `/api/steam/search` | GET | `term` | Busca un juego: appId, imagen y tags (géneros + categorías multiplayer) | Steam Storefront `storesearch` + `appdetails` |
| `/api/steam/game-categories` | GET | `appIds` (CSV, máx 80) | Géneros por appId (con caché en memoria 24h) | Steam Storefront `appdetails` |
| `/api/steam/game-requirements` | GET | `appId` o `searchName` | Requisitos mínimos de PC, parseados (OS/CPU/GPU/RAM/almacenamiento). Cachea 24h | Steam Storefront `storesearch` + `appdetails` |

Requieren `STEAM_API_KEY` (env): login, callback, owned-games, friends y trending. Las de
Storefront (`store.steampowered.com/api`) **no** requieren key.

### Xbox / Game Pass

| Ruta | Método | Params | Propósito | APIs externas que usa |
|---|---|---|---|---|
| `/api/gamepass` | GET | — | Catálogo de Game Pass (PC + Console): IDs de catálogo → detalles (título + imagen). Limitado a 200 | MS `catalog.gamepass.com/sigls/v2` + `displaycatalog.mp.microsoft.com` |

### Trending

| Ruta | Método | Params | Propósito | APIs externas que usa |
|---|---|---|---|---|
| `/api/trending-multiplayer` | GET | — | Top juegos multiplayer en tendencia (filtra most-played por categorías multiplayer). Cachea 24h | Steam Web API `GetMostPlayedGames` + Storefront `appdetails` |

---

## 2. APIs externas — clasificación

### 🟢 Integración oficial / documentada (con API key)

**Steam Web API** — `https://api.steampowered.com`
Oficial, documentada, requiere `STEAM_API_KEY`. Endpoints en uso:
- `ISteamUser/GetFriendList/v0001` — amigos
- `ISteamUser/GetPlayerSummaries/v0002` — perfiles (nombre, avatar)
- `IPlayerService/GetOwnedGames/v0001` — juegos del usuario
- `ISteamChartsService/GetMostPlayedGames/v1` — most played (trending)

**Steam OpenID 2.0** — `https://steamcommunity.com/openid`
Mecanismo oficial de "Sign in through Steam" (vía librería `openid`). No requiere key.
Documentado por Valve. Usado en `login` y `callback`.

### 🟡 Público no documentado (sin auth / sin programa oficial)

**Steam Storefront API** — `https://store.steampowered.com/api`
Pública pero **no documentada oficialmente** (la usa la propia store). Sin key. Endpoints:
- `storesearch/` — búsqueda de juegos
- `appdetails` — detalles (géneros, categorías, requisitos PC)

**Xbox Game Pass catalog (Microsoft)** — `catalog.gamepass.com`, `displaycatalog.mp.microsoft.com`
APIs internas de Microsoft que alimentan la web de Game Pass. **No documentadas**, sin auth.
- `catalog.gamepass.com/sigls/v2` — IDs de productos de un catálogo
- `displaycatalog.mp.microsoft.com/v7.0/products` — detalles de productos (título, imágenes)

**Epic Games — servicios internos** — `*.ol.epicgames.com`, `*.on.epicgames.com`, `www.epicgames.com/id`
APIs internas del Epic Games Launcher. **No documentadas**, se usan con las credenciales
públicas del launcher (ver [integracion-epic-xbox.md](integracion-epic-xbox.md)). En uso:
- `account-public-service-prod03.../account/api/oauth/token` — token exchange
- `account-public-service-prod03.../account/api/public/account` — perfiles (bulk)
- `friends-public-service-prod.../friends/api/public/friends/{id}` — amigos
- `library-service.live.use1a.on.epicgames.com/library/api/public/items` — biblioteca
- `www.epicgames.com/id/login` + `/id/api/redirect` — login y obtención del authCode

### 🔵 Assets / CDN públicos (sin auth, no son "API")

Hosting de imágenes de Steam usado para portadas:
- `cdn.akamai.steamstatic.com/steam/apps/{appId}/header.jpg`
- `cdn.cloudflare.steamstatic.com/steam/apps/{appId}/header.jpg`

---

## 3. Resumen por proveedor

| Proveedor | Tipo | Auth | Documentada |
|---|---|---|---|
| Steam Web API (`api.steampowered.com`) | Oficial | API key | ✅ Sí |
| Steam OpenID (`steamcommunity.com/openid`) | Oficial | — | ✅ Sí |
| Steam Storefront (`store.steampowered.com/api`) | Pública | — | ❌ No |
| Steam CDN (imágenes) | Pública (assets) | — | n/a |
| Xbox Game Pass (`catalog.gamepass.com`, `displaycatalog.mp.microsoft.com`) | Interna MS | — | ❌ No |
| Epic servicios internos (`*.epicgames.com`) | Interna launcher | Tokens (creds launcher) | ❌ No |

---

## 4. Variables de entorno

| Variable | Usada por |
|---|---|
| `STEAM_API_KEY` | Steam login/callback, owned-games, friends, trending-multiplayer |
| `EPIC_CLIENT_ID` | Epic token-exchange (y client id público del launcher) |
| `EPIC_CLIENT_SECRET` | Epic token-exchange |

---

## Notas / pendientes
- `/api/epic/debug` es **solo para desarrollo** (expone tokens en claro) — eliminar antes de
  producción.
- Varias rutas de Steam/Trending/Game Pass usan **caché en memoria** (Map / variable de
  módulo) con TTL ~24h; se reinicia al reiniciar el server. Migrable a caché persistente.
- Las APIs no documentadas (Storefront, Game Pass, Epic interno) pueden cambiar sin aviso;
  conviene aislarlas en el backend (como ya está) para parchear en un solo lugar.
