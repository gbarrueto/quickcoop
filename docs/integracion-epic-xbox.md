# Integración de bibliotecas: Epic Games y Xbox

Análisis de cómo Playnite obtiene los datos de biblioteca de Epic Games y Xbox, y
cómo replicar ese flujo en una aplicación **100% web** (QuickCoop).

> **Conclusión rápida:** Playnite **no escanea archivos locales** para obtener la
> biblioteca de Epic ni de Xbox. En ambos casos hace **autenticación OAuth contra
> las APIs oficiales** y luego consulta endpoints REST. Esto es buena noticia: el
> mismo enfoque es replicable desde la web. El único obstáculo real es **CORS** y
> el manejo de secretos, que obligan a hacer las llamadas desde un **backend
> (proxy/servidor)**, nunca directamente desde el navegador.

---

## 0. Dónde está el código en Playnite

El repo que descargaste (`scripts/Playnite/`) es el **núcleo** de la app + el SDK.
Las integraciones de cada tienda viven en un **repositorio separado**:

- Repo: `JosefNemec/PlayniteExtensions`
- Epic: `source/Libraries/EpicLibrary/Services/EpicAccountClient.cs`
- Xbox: `source/Libraries/XboxLibrary/Services/XboxAccountClient.cs`

El análisis siguiente está basado en ese código fuente real.

---

## 1. Epic Games

### 1.1 Resumen del enfoque

Playnite reutiliza las **mismas credenciales OAuth del Epic Games Launcher** (son
públicas, viajan dentro del cliente de escritorio). Abre una ventana web donde el
usuario inicia sesión en su cuenta Epic, captura un **authorization code**, y lo
intercambia por tokens. Con el access token llama a las APIs públicas de Epic para
listar los juegos que el usuario posee.

### 1.2 Credenciales (del Launcher, públicas)

| Dato | Valor |
|---|---|
| `client_id` | `34a02cf8f4414e29b15921876da36f9a` |
| `client_secret` | `daafbccc737745039dffe53d94fc76cf` |
| Header `Authorization` (token exchange) | `basic ` + Base64(`client_id:client_secret`) |
| Base64 ya calculado | `MzRhMDJjZjhmNDQxNGUyOWIxNTkyMTg3NmRhMzZmOWE6ZGFhZmJjY2M3Mzc3NDUwMzlkZmZlNTNkOTRmYzc2Y2Y=` |

> Son las credenciales del launcher oficial. Funcionan, pero técnicamente no son
> "tuyas". Epic no ofrece un programa público de OAuth para terceros, así que esta
> es la vía de facto que usan todos los clientes alternativos (Heroic, Legendary,
> Playnite, etc.).

### 1.3 Flujo de autenticación

```
1. Abrir ventana de login:
   GET https://www.epicgames.com/id/login?responseType=code
   (User-Agent: "...EpicGamesLauncher")

2. El usuario inicia sesión normalmente (usuario/clave/2FA) en la web de Epic.

3. Obtener el authorization code. Dos variantes equivalentes:
   a) Capturar el redirect a:
      localhost/launcher/authorized?code=XXXX   (regex: code=([a-zA-Z0-9]+))
   b) Pedir el code ya autenticado (mismo navegador/cookies de sesión):
      GET https://www.epicgames.com/id/api/redirect?clientId=34a02cf8f4414e29b15921876da36f9a&responseType=code
      -> responde JSON: { "authorizationCode": "XXXX", ... }

4. Intercambiar code por tokens:
   POST https://account-public-service-prod03.ol.epicgames.com/account/api/oauth/token
   Headers:
     Authorization: basic <Base64(client_id:client_secret)>
     Content-Type: application/x-www-form-urlencoded
   Body:
     grant_type=authorization_code&code=<authorizationCode>&token_type=eg1

   -> Respuesta JSON con:
      access_token, refresh_token, expires_in, account_id, token_type, ...
```

#### Refresco de token

```
POST https://account-public-service-prod03.ol.epicgames.com/account/api/oauth/token
Headers: Authorization: basic <Base64(...)>, Content-Type: x-www-form-urlencoded
Body:
  grant_type=refresh_token&refresh_token=<refreshToken>&token_type=eg1
```

Playnite guarda los tokens cifrados localmente. En web los guardas en tu backend
(DB/sesión), nunca en el cliente.

### 1.4 Endpoints de datos (biblioteca)

Todas son **GET** con header `Authorization: <token_type> <access_token>`
(normalmente `bearer <access_token>`).

| Propósito | Endpoint |
|---|---|
| Info de la cuenta | `https://account-public-service-prod03.ol.epicgames.com/account/api/public/account/{accountId}` |
| **Biblioteca (assets/items)** | `https://library-service.live.use1a.on.epicgames.com/library/api/public/items?includeMetadata=true&platform=Windows&cursor={cursor}` |
| Tiempo jugado | `https://library-service.live.use1a.on.epicgames.com/library/api/public/playtime/account/{accountId}/all` |
| Metadatos del catálogo | `https://catalog-public-service-prod06.ol.epicgames.com/catalog/api/shared/namespace/{namespace}/bulk/items?id={id}&country=US&locale=en-US` |

#### Flujo de obtención de la biblioteca

1. Llamar a `/library/api/public/items`. Devuelve una lista paginada de ítems que
   el usuario posee; cada ítem trae `namespace`, `catalogItemId` y `appName`. La
   respuesta incluye un `cursor` para la siguiente página → repetir hasta agotar.
2. Para cada ítem, resolver nombre/imágenes/categoría con el **catalog service**
   usando su `namespace` + `catalogItemId` (`bulk/items`). Aquí se filtran los que
   no son juegos (DLC, assets de motor, etc.) mirando las categorías del catálogo.
3. (Opcional) Cruzar con `/playtime/.../all` para el tiempo jugado.

### 1.5 Cómo hacerlo en web (QuickCoop)

- **CORS:** los dominios `*.epicgames.com` y `*.on.epicgames.com` **no** permiten
  llamadas desde el navegador. **Todo** (token exchange + endpoints de datos) debe
  ir desde tu **backend** (Next.js route handler / API route sirve perfecto).
- **El login del usuario** sí puede ocurrir en el navegador (popup/iframe a la web
  de Epic), pero la forma robusta y sin depender de capturar redirects a
  `localhost` es:
  1. Llevar al usuario a `https://www.epicgames.com/id/login`.
  2. Que copie/pegue el JSON de
     `https://www.epicgames.com/id/api/redirect?clientId=34a02cf8f4414e29b15921876da36f9a&responseType=code`
     (esto es lo que hacen Legendary/Heroic con su "paste the authorizationCode").
  3. Enviar ese `authorizationCode` a tu backend, que hace el token exchange.
- Alternativa más fluida: abrir el login en un popup propio y, si controlas el
  `redirect_uri`, capturar el `code` con una página de callback tuya. Con las
  credenciales del launcher el redirect es a `localhost`, por eso el método de
  "pegar el code" es el más fiable en un entorno puramente web/hospedado.
- Guarda `access_token`/`refresh_token` por usuario en tu backend y refresca con
  `grant_type=refresh_token` cuando expire (`expires_in`).

---

## 2. Xbox

### 2.1 Resumen del enfoque

Xbox usa el flujo **OAuth estándar de Microsoft (login.live.com)** seguido de un
intercambio en dos pasos propio de Xbox Live: **XBL (user token)** y luego **XSTS
(service token)**. Con el token XSTS se llama a las APIs de Xbox Live para obtener
el historial de títulos (la "biblioteca") y estadísticas.

A diferencia de Epic, aquí **sí puedes registrar tu propia aplicación** en Azure /
Microsoft Entra y usar tu propio `client_id`. Playnite usa el suyo:

| Dato | Valor |
|---|---|
| `client_id` | `38cd2fa8-66fd-4760-afb2-405eb65d5b0c` |
| `redirect_uri` | `https://login.live.com/oauth20_desktop.srf` |
| `scope` | `Xboxlive.signin Xboxlive.offline_access` |

### 2.2 Flujo de autenticación (3 etapas)

#### Etapa 1 — OAuth de Microsoft (obtener access_token MS)

```
1. Login (webview/popup):
   GET https://login.live.com/oauth20_authorize.srf
       ?client_id=38cd2fa8-66fd-4760-afb2-405eb65d5b0c
       &response_type=code
       &approval_prompt=auto
       &scope=Xboxlive.signin%20Xboxlive.offline_access
       &redirect_uri=https://login.live.com/oauth20_desktop.srf

2. Capturar el "code=" del redirect tras el login.

3. Intercambiar code por tokens:
   POST https://login.live.com/oauth20_token.srf
   Content-Type: application/x-www-form-urlencoded
   Body:
     grant_type=authorization_code&code=<code>&scope=<scope>
     &client_id=<client_id>&redirect_uri=<redirect_uri>

   -> { access_token, refresh_token, expires_in, token_type, user_id }
```

#### Etapa 2 — XBL (Xbox Live user token)

```
POST https://user.auth.xboxlive.com/user/authenticate
Headers:
  x-xbl-contract-version: 1
  Content-Type: application/json
Body:
{
  "RelyingParty": "http://auth.xboxlive.com",
  "TokenType": "JWT",
  "Properties": {
    "AuthMethod": "RPS",
    "SiteName": "user.auth.xboxlive.com",
    "RpsTicket": "d=<access_token de la etapa 1>"
  }
}
-> { "Token": "<userToken>", ... }
```

#### Etapa 3 — XSTS (service token)

```
POST https://xsts.auth.xboxlive.com/xsts/authorize
Headers:
  x-xbl-contract-version: 1
  Content-Type: application/json
Body:
{
  "RelyingParty": "http://xboxlive.com",
  "TokenType": "JWT",
  "Properties": {
    "UserTokens": ["<userToken de la etapa 2>"],
    "SandboxId": "RETAIL"
  }
}
-> {
     "Token": "<xstsToken>",
     "DisplayClaims": { "xui": [ { "uhs": "<userHash>", "xid": "<xuid>" } ] }
   }
```

El header de autorización final para las APIs de Xbox se construye así:

```
Authorization: XBL3.0 x=<uhs>;<xstsToken>
```

#### Refresco de token

```
POST https://login.live.com/oauth20_token.srf
Body: grant_type=refresh_token&refresh_token=<rt>&client_id=<id>&scope=<scope>&redirect_uri=<uri>
```
Tras refrescar el token de Microsoft hay que **rehacer las etapas 2 y 3** (XBL→XSTS)
porque esos tokens son de corta duración.

### 2.3 Endpoints de datos (biblioteca)

Todos llevan `Authorization: XBL3.0 x=<uhs>;<xstsToken>`.

| Propósito | Método | Endpoint | Headers extra |
|---|---|---|---|
| **Historial de títulos (biblioteca)** | GET | `https://titlehub.xboxlive.com/users/xuid({xuid})/titles/titlehistory/decoration/detail` | `x-xbl-contract-version: 2`, `Accept-Language: en-US` |
| Detalle de títulos (batch) | POST | `https://titlehub.xboxlive.com/titles/batch/decoration/detail` | body: `{ pfns, windowsPhoneProductIds }` |
| Estadísticas (tiempo jugado) | POST | `https://userstats.xboxlive.com/batch` | `Content-Type: application/json`, body con `arrangebyfield: "xuid"` y stat `MinutesPlayed` |

La respuesta de `titlehistory` trae un array `titles[]`; cada título incluye
nombre, imágenes, `titleId`, `pfn` (package family name), plataformas, etc. Eso es
lo que Playnite mapea a "juegos de la biblioteca".

### 2.4 Cómo hacerlo en web (QuickCoop)

- **Registra tu propia app** en [Azure / Microsoft Entra ID](https://portal.azure.com)
  como aplicación OAuth y usa **tu** `client_id`. Configura un `redirect_uri` que
  apunte a una página de callback de **tu** dominio (p.ej.
  `https://quickcoop.app/api/auth/xbox/callback`). Esto te da un flujo OAuth web
  limpio y estándar (Authorization Code, idealmente con PKCE).
- **El login** (etapa 1) ocurre en el navegador (redirect/popup a `login.live.com`),
  que **sí** soporta el flujo web estándar.
- **Etapas 2 y 3 (XBL/XSTS) y los endpoints `*.xboxlive.com`** deben ejecutarse en
  el **backend**: tienen restricciones de CORS y manejan tokens sensibles.
- Scope mínimo: `Xboxlive.signin Xboxlive.offline_access` (el `offline_access` te da
  `refresh_token`).
- Guarda en el backend el `refresh_token` de Microsoft; los tokens XBL/XSTS son
  efímeros, regenéralos bajo demanda desde el refresh token.

---

## 3. Datos sociales: amigos y juegos de amigos

Esta parte es la más relevante para QuickCoop (co-op, grupos de amigos). El circuito
completo es: **lista de amigos → resolver sus nombres (bulk) → (Xbox) sus juegos**.

> ⚠️ **Importante:** igual que los endpoints de biblioteca, estos son **APIs
> internas/privadas** del launcher de Epic y de la app/consola de Xbox. **No están
> documentadas oficialmente** y se conocen por ingeniería inversa (interceptando el
> tráfico del cliente o leyendo proyectos open source). Pueden cambiar sin aviso.
> Lo que *sí* está documentado por Epic/Microsoft son **otras** APIs distintas
> (EOS y el Xbox Live GDK), pensadas para desarrolladores de juegos con producto
> registrado — no sirven para leer la cuenta personal de un usuario cualquiera.

### 3.1 Lista de amigos

#### Epic
```
GET https://friends-public-service-prod.ol.epicgames.com/friends/api/public/friends/{accountId}
Headers: Authorization: bearer <access_token>
```
- Devuelve **solo los `accountId`** de tus amigos (más `status`, `direction`,
  `favorite`, `created`). Para tener nombres hay que resolverlos con el bulk (§3.2).
- Variante v1: `https://friends-public-service-prod.ol.epicgames.com/friends/api/v1/{accountId}/friends`

#### Xbox — *People Hub*
```
GET https://peoplehub.xboxlive.com/users/me/people/social
Headers:
  Authorization: XBL3.0 x=<uhs>;<xstsToken>
  x-xbl-contract-version: 5
  Accept-Language: en-US
```
- Devuelve `people[]` donde **cada amigo ya viene con nombre, gamertag, xuid,
  gamerscore, avatar y presencia** (no hace falta el bulk).
- Para enriquecer con presencia/actividad: `.../people/social/decoration/presenceDetail,multiplayersummary`
- Alternativa cruda (solo XUIDs): `GET https://social.xboxlive.com/users/me/people` con `x-xbl-contract-version: 1`.

### 3.2 User info en bulk (resolver nombres)

#### Epic
```
GET https://account-public-service-prod03.ol.epicgames.com/account/api/public/account?accountId=<id1>&accountId=<id2>&...
Headers: Authorization: bearer <access_token>
```
- Hasta **~100 `accountId` por petición** (se repite el parámetro).
- Devuelve `[{ "id": "...", "displayName": "...", ... }]`.

#### Xbox
El People Hub ya da nombres, pero si partes de XUIDs sueltos, el batch oficial es:
```
POST https://profile.xboxlive.com/users/batch/profile/settings
Headers:
  Authorization: XBL3.0 x=<uhs>;<xstsToken>
  x-xbl-contract-version: 2
  Content-Type: application/json
Body:
{
  "userIds": ["<xuid1>", "<xuid2>"],
  "settings": ["Gamertag", "GameDisplayName", "Gamerscore", "AppDisplayPicRaw"]
}
```
- Devuelve `profileUsers[]` con cada XUID y sus settings.
- **Contract version `2`** aquí (ojo, distinto del `5` del People Hub).

### 3.3 Juegos de tus amigos

#### Xbox → ✅ Sí se puede (con matices)
El mismo endpoint de title history acepta el **XUID de otro usuario**:
```
GET https://titlehub.xboxlive.com/users/xuid(<friendXuid>)/titles/titlehistory/decoration/detail
Headers: Authorization: XBL3.0 x=<uhs>;<token>, x-xbl-contract-version: 2, Accept-Language: en-US
```
- **Depende de la privacidad del amigo**: solo funciona si su "historial de juegos"
  está en *Todos* o *Amigos*; si está en privado → respuesta vacía o `403`.
- Devuelve sobre todo títulos **jugados / con progreso de logros**, no
  necesariamente la biblioteca completa que poseen.
- Para "qué juega ahora mismo" usa **presence** (incluido en el People Hub con la
  decoration `presenceDetail`).

#### Epic → ❌ No se puede
La biblioteca (`/library/api/public/items`) es **solo de la cuenta autenticada**: no
acepta el accountId de otro usuario y las bibliotecas son privadas. **No hay API
para listar los juegos que posee un amigo.** En Epic, por tanto, nos conformamos con
tener sus **usuarios** (ID + displayName).

### 3.4 Resumen del circuito social

| | Epic | Xbox |
|---|---|---|
| Lista de amigos | `friends/api/public/friends/{accountId}` (solo IDs) | `peoplehub.../people/social` (ya con nombres) |
| User info bulk | `account?accountId=...` (hasta 100) | `profile/.../batch/profile/settings` (POST) |
| Juegos de amigos | ❌ No disponible | ✅ `titlehistory/users/xuid(<friend>)` (según privacidad) |

---

## 4. Comparativa y recomendaciones para QuickCoop

| | Epic | Xbox |
|---|---|---|
| Tipo de integración | OAuth + REST (API) | OAuth + XBL/XSTS + REST (API) |
| ¿Escanea archivos locales? | No (para la biblioteca de la cuenta) | No |
| ¿Puedes usar tu propio client_id? | No (se usan las del launcher) | **Sí** (registra app en Azure) |
| Pasos de auth | 2 (login → token) | 3 (login MS → XBL → XSTS) |
| Mayor fricción en web | Capturar el `authorizationCode` | Construir XBL/XSTS server-side |
| Bloqueo CORS | Sí → proxy backend obligatorio | Sí (en xboxlive.com) → proxy backend |

### Arquitectura sugerida (web)

```
Navegador (QuickCoop UI)
   │  1. inicia login (popup/redirect a Epic o login.live.com)
   ▼
Página de callback (tu dominio)  ──►  Backend QuickCoop (API routes)
                                        │  - token exchange (con client_secret)
                                        │  - XBL/XSTS (Xbox)
                                        │  - llamadas a APIs de biblioteca
                                        │  - guarda/refresca tokens por usuario
                                        ▼
                              APIs de Epic / Xbox Live
```

Puntos clave:
1. **Nunca** llames a los endpoints de Epic/Xbox ni hagas el token exchange desde
   el navegador: CORS lo bloquea y expondrías secretos.
2. Centraliza tokens y refresco en el backend (por usuario, cifrados/en sesión).
3. Para Epic, el método más fiable en web es el patrón "pegar el `authorizationCode`"
   (igual que Legendary/Heroic) o un callback propio.
4. Para Xbox, registra tu propia app en Azure para tener un flujo OAuth web limpio.

### Referencias de implementación (open source)

- Epic en web/CLI sin launcher: **Legendary** (Python) y **Heroic Games Launcher**
  (Electron) — mismas credenciales y endpoints que aquí.
- Xbox: cualquier librería que implemente el flujo **XBL/XSTS** (muy documentado en
  proyectos de Minecraft auth, que usan exactamente las etapas 2 y 3).
- Código fuente de referencia: `JosefNemec/PlayniteExtensions`
  (`source/Libraries/EpicLibrary` y `source/Libraries/XboxLibrary`).

---

## 5. Naturaleza de las APIs (importante)

Casi todos los endpoints de este documento son **APIs internas / no oficiales** —
las que consume el cliente oficial (Epic Games Launcher, app/consola Xbox). **No hay
documentación pública de Epic/Microsoft para ellas**; se conocen por ingeniería
inversa y por proyectos open source que las implementan.

Existe documentación oficial, pero de **APIs distintas** que **no sirven** para este
caso de uso (leer la cuenta personal de un usuario arbitrario):

- **Epic — EOS (Epic Online Services):** para desarrolladores de juegos, sobre
  `api.epicgames.dev`, requiere producto/deployment registrado. No da acceso a la
  biblioteca ni amigos de la cuenta personal de un usuario externo.
- **Xbox — Xbox Live SDK / GDK:** para títulos con licencia registrada. Documenta el
  *formato* de los endpoints `*.xboxlive.com` (útil como referencia de campos), pero
  el acceso desde un cliente propio sigue siendo no oficial.

Implicación práctica: funcionan hoy, pero **pueden cambiar/romperse sin aviso**.
Conviene aislar estas llamadas en tu backend para poder parchearlas en un solo sitio.

---

## 6. Fuentes de los endpoints

### Código fuente / clientes open source (de dónde salen los endpoints)

- **Playnite** (referencia principal): `JosefNemec/PlayniteExtensions`
  - Epic: <https://github.com/JosefNemec/PlayniteExtensions/blob/master/source/Libraries/EpicLibrary/Services/EpicAccountClient.cs>
  - Xbox: <https://github.com/JosefNemec/PlayniteExtensions/blob/master/source/Libraries/XboxLibrary/Services/XboxAccountClient.cs>
- **Legendary** (Epic, Python, sin launcher): <https://github.com/derrod/legendary>
- **Heroic Games Launcher** (Epic, Electron): <https://github.com/Heroic-Games-Launcher/HeroicGamesLauncher>
- **fortnite-php** (endpoints internos de Epic): <https://github.com/Tustin/fortnite-php/blob/master/src/FortniteClient.php>
- **xbox-webapi-python** (endpoints internos de Xbox): <https://github.com/OpenXbox/xbox-webapi-python> · docs: <https://xbox-webapi-ex.readthedocs.io/en/latest/>

### Tabla endpoint → fuente

| Endpoint | Plataforma | Fuente |
|---|---|---|
| `account-public-service-prod03.../oauth/token` | Epic (auth) | [PlayniteExtensions/EpicAccountClient.cs](https://github.com/JosefNemec/PlayniteExtensions/blob/master/source/Libraries/EpicLibrary/Services/EpicAccountClient.cs) · [fortnite-php](https://github.com/Tustin/fortnite-php/blob/master/src/FortniteClient.php) |
| `epicgames.com/id/login` · `id/api/redirect` | Epic (auth) | [PlayniteExtensions/EpicAccountClient.cs](https://github.com/JosefNemec/PlayniteExtensions/blob/master/source/Libraries/EpicLibrary/Services/EpicAccountClient.cs) · [Legendary](https://github.com/derrod/legendary) |
| `account-public-service-prod03.../public/account` (+ bulk `?accountId=`) | Epic (perfil) | [PlayniteExtensions/EpicAccountClient.cs](https://github.com/JosefNemec/PlayniteExtensions/blob/master/source/Libraries/EpicLibrary/Services/EpicAccountClient.cs) · [fortnite-php](https://github.com/Tustin/fortnite-php/blob/master/src/FortniteClient.php) |
| `library-service.live.use1a.on.epicgames.com/.../items` | Epic (biblioteca) | [PlayniteExtensions/EpicAccountClient.cs](https://github.com/JosefNemec/PlayniteExtensions/blob/master/source/Libraries/EpicLibrary/Services/EpicAccountClient.cs) · [Legendary](https://github.com/derrod/legendary) |
| `catalog-public-service-prod06.../bulk/items` | Epic (metadatos) | [PlayniteExtensions/EpicAccountClient.cs](https://github.com/JosefNemec/PlayniteExtensions/blob/master/source/Libraries/EpicLibrary/Services/EpicAccountClient.cs) |
| `friends-public-service-prod.../friends` | Epic (amigos) | [fortnite-php](https://github.com/Tustin/fortnite-php/blob/master/src/FortniteClient.php) |
| `login.live.com/oauth20_authorize.srf` · `oauth20_token.srf` | Xbox (auth MS) | [PlayniteExtensions/XboxAccountClient.cs](https://github.com/JosefNemec/PlayniteExtensions/blob/master/source/Libraries/XboxLibrary/Services/XboxAccountClient.cs) |
| `user.auth.xboxlive.com/user/authenticate` (XBL) | Xbox (auth) | [PlayniteExtensions/XboxAccountClient.cs](https://github.com/JosefNemec/PlayniteExtensions/blob/master/source/Libraries/XboxLibrary/Services/XboxAccountClient.cs) · [xbox-webapi](https://github.com/OpenXbox/xbox-webapi-python) |
| `xsts.auth.xboxlive.com/xsts/authorize` (XSTS) | Xbox (auth) | [PlayniteExtensions/XboxAccountClient.cs](https://github.com/JosefNemec/PlayniteExtensions/blob/master/source/Libraries/XboxLibrary/Services/XboxAccountClient.cs) · [xbox-webapi](https://github.com/OpenXbox/xbox-webapi-python) |
| `titlehub.xboxlive.com/.../titlehistory` | Xbox (biblioteca) | [PlayniteExtensions/XboxAccountClient.cs](https://github.com/JosefNemec/PlayniteExtensions/blob/master/source/Libraries/XboxLibrary/Services/XboxAccountClient.cs) · [Titlehub (xbox-webapi)](https://xbox-webapi-ex.readthedocs.io/en/latest/source/xbox.webapi.api.provider.titlehub.html) |
| `userstats.xboxlive.com/batch` | Xbox (playtime) | [PlayniteExtensions/XboxAccountClient.cs](https://github.com/JosefNemec/PlayniteExtensions/blob/master/source/Libraries/XboxLibrary/Services/XboxAccountClient.cs) |
| `peoplehub.xboxlive.com/users/me/people/social` | Xbox (amigos) | [xbox-webapi (people/presence)](https://xbox-webapi-ex.readthedocs.io/en/latest/source/xbox.webapi.api.provider.presence.html) · [netify: peoplehub](https://www.netify.ai/resources/hostnames/peoplehub.xboxlive.com) |
| `profile.xboxlive.com/users/batch/profile/settings` | Xbox (perfil bulk) | [Microsoft Learn — batch profile settings](https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/reference/live/rest/uri/profilev2/uri-usersbatchprofilesettingspost) · [xbox-webapi](https://github.com/OpenXbox/xbox-webapi-python) |

### Documentación oficial relacionada (APIs distintas / referencia de campos)

- Epic EOS — Friends Web API: <https://dev.epicgames.com/docs/web-api-ref/friends-web-api>
- Xbox GDK — `POST /users/batch/profile/settings`: <https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/reference/live/rest/uri/profilev2/uri-usersbatchprofilesettingspost>
- Xbox GDK — Title History URIs: <https://learn.microsoft.com/en-us/gaming/gdk/_content/gc/reference/live/rest/uri/titlehistory/atoc-reference-titlehistoryv2>
- Xbox — privacidad de actividad/historial: <https://support.xbox.com/en-US/help/family-online-safety/online-safety/online-presence>
