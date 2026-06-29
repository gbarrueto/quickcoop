# Revisión priorizada de [status-28-06-26.md](status-28-06-26.md)

Mismos temas que el documento original, reordenados por urgencia, con solución
propuesta + dificultad estimada por punto. Para cruzar los puntos contra el estado
real revisé el código (`lib/`, `app/api/`, `components/`) y los otros docs
(especialmente [anonymous-first-flow-plan.md](anonymous-first-flow-plan.md), del
26-06, que ya resuelve o reabre varios de estos puntos sin que el doc de estado lo
refleje).

Escala de dificultad: **Baja** (horas, sin diseño nuevo) · **Media** (días, requiere
algo de diseño/decisiones) · **Alta** (requiere investigación, nueva infraestructura
o es un feature grande).

---

## Notas de contexto

- **El proyecto no tiene (ya no tiene) un sesgo "frontend/UIUX primero".** Era la
  fase de un curso que ya terminó; ahora es un proyecto independiente. Las
  prioridades de este documento para temas backend-heavy (integraciones nuevas,
  rediseño de pipelines) están evaluadas solo por costo/beneficio técnico, no por
  ese foco.
- **`scripts/` está en `.gitignore`** y `curate_epic_offers.py` (la única vía que
  hoy funciona para precio/tags de Epic) vive solo en una máquina específica — hoy
  es una fricción real, no solo un riesgo hipotético de pérdida (ver punto 9).
- **Sí hay mock data activa y visible en la app**, con nombres concretos: 3 amigos
  demo y una librería importada demo en `lib/user-profile.ts`, más una lista fija
  de juegos en el diálogo de import manual (ver puntos 2 y 3).
- **El pedido de unificar categories/requirements es más concreto que "falta
  compartir caché"**: se vuelve a pedir un dato que ya se trajo en el mismo flujo de
  enriquecimiento, y depender solo de Steam para categorías es incompleto con más de
  una tienda (ver punto 5).

---

## Prioridad Alta

### 1. Cuentas privadas — feedback en UI + verificar self-import

**Prioridad:** Alta · **Dificultad:** Baja

Dos tareas baratas y distintas:

- **Disclosure en UI**: un amigo con perfil privado devuelve lista vacía sin
  contexto — se ve como si la app estuviera rota.
- **Verificar self-import**: confirmar que un usuario con su propia cuenta de Steam
  en privado pueda importar su propia librería sin problemas (la key es tuya, la
  consulta es sobre su `steamId`). Es un test de 10 minutos con una cuenta de
  prueba, no investigación.

**Solución propuesta:** detectar el caso (Steam: `communityvisibilitystate` en
`GetPlayerSummaries`; Epic no expone esta señal) y mostrar un estado vacío explícito
en vez de una lista vacía muda.

### 2. Import manual — validar prerequisitos + reemplazar el catálogo placeholder

**Prioridad:** Alta · **Dificultad:** Baja-Media

Confirmado en código: el diálogo de import manual
([components/landing/import-games-dialog.tsx:21-26](../components/landing/import-games-dialog.tsx))
tiene un `GAMES_LIST` hardcodeado de 4 juegos (Forza Horizon 5, Dark Souls 3, Black
Desert, Tainted Grail: Fall of Avalon) como única fuente para buscar/agregar — es
literalmente el "no tiene datos reales" que ya señalaba el doc original, ahora con
ubicación exacta. Sumado al bug ya conocido: se puede llegar a matching sin conectar
ninguna cuenta ni tener amigos.

**Solución propuesta:**
1. Guard: exigir al menos una cuenta conectada + un amigo resuelto antes de habilitar
   matching, con copy explicando qué falta (Baja dificultad).
2. Reemplazar `GAMES_LIST` por una búsqueda real contra `/api/steam/search` (ya
   existe y ya hace exactamente esto: resolver appId+imagen+tags por nombre) en vez
   de una lista fija de 4 juegos (Media dificultad — conectar un endpoint existente
   a un input de búsqueda).

### 3. Perfil demo (Alex/Maya/Noah + librería falsa) — decidir y reemplazar

**Prioridad:** Alta · **Dificultad:** Media

Ubicado en [lib/user-profile.ts](../lib/user-profile.ts): `createDefaultFriends()`
(3 amigos mock: Alex/Steam, Maya/Epic, Noah/Game Pass) y
`createDefaultUserProfile()` (librería importada mock: Hades, Deep Rock Galactic,
Baldur's Gate 3, Cyberpunk 2077, Rocket League). Se inyectan vía
`ensureStoredUserProfile()` cada vez que no hay un perfil guardado en
`localStorage` — es decir, es lo que ve **cualquier usuario nuevo** antes de
conectar algo real, presentado como si fuera su propia data. Mismo problema de
fondo que el punto 4 (datos que se ven reales pero no lo son), aplicado a todo el
perfil en vez de a un campo puntual.

**Solución propuesta:** es una decisión de producto, no solo técnica:
1. **Reemplazar por un estado vacío/onboarding real** ("Conecta Steam o Epic para
   ver tu biblioteca", sin amigos/juegos de relleno). Más simple y más honesto, pero
   pierde el efecto "la app ya se ve poblada" en la primera visita.
2. **Mantenerlo, pero etiquetado explícitamente como demo** ("Así se ve con datos de
   ejemplo — conecta tu cuenta para ver lo real"), si el valor de mostrar la UI
   poblada de entrada importa más que el costo de mantener data falsa.

Cualquiera de las dos es Media dificultad (toca `matching-page.tsx` y el flujo de
perfil); lo que decide la dificultad real es la decisión de producto, no el código.

### 4. Game cards — sacar o arreglar los datos inventados (rating/jugadores)

**Prioridad:** Alta · **Dificultad:** Baja (ocultar) / Media (dato real)

`deriveRating`/`derivePlayers` en
[lib/matching/game-utils.ts](../lib/matching/game-utils.ts) son un hash del appId,
no datos reales, mostrados como si lo fueran. Es un problema de integridad de
producto, no solo de UX — fácil de detectar por cualquier usuario que conozca el
juego.

**Solución propuesta:** corto plazo, ocultar/marcar "no disponible". Mediano plazo,
ver punto 5 — RAWG (que ya se evalúa ahí para tags) también expone rating real
(Metacritic + su propio rating), y resolvería esto en el mismo movimiento en vez de
ir a buscar una fuente aparte solo para esto.

### 5. Categories y requirements: dejar de re-consultar lo que ya se trajo

**Prioridad:** Alta · **Dificultad:** Media (fixes puntuales) / Alta (rediseño
cross-store completo)

Confirmado en código:

- **Categories se piden dos veces.** Al importar, `load-matching-data.ts:63-65`
  llama a `fetchSteamGameDetails()` (pipeline que ya extrae géneros/tags y los
  guarda en `game_listings`). Pero en la UI de matching,
  [hooks/use-game-categories.ts:41](../hooks/use-game-categories.ts) dispara
  **otra** llamada a `/api/steam/game-categories` para esos mismos appIds, porque
  las categorías no vuelven en la respuesta de import ni se leen desde
  `game_listings` — se piden de nuevo contra Storefront.
- **Requirements se piden recién al hacer click.**
  [matching-page.tsx:275-296](../components/matching/matching-page.tsx) confirma que
  `openRequirementsModal()` solo chequea un cache en memoria (`requirementsByApp`) y,
  si no está, dispara un fetch nuevo a `/api/steam/game-requirements` en ese momento
  — el dato no viene precargado con el resto de la info del juego.
- **Depender solo de Steam para categorías es incompleto** apenas hay más de una
  tienda — Epic ya tiene su propio set de tags (parcial vía `meta.tags`, completo
  vía la offer bloqueada por Cloudflare, ver punto 9) que no se cruza con las
  categorías de Steam para el mismo juego canónico.

**Solución propuesta**, en dos niveles:

1. **Fix puntual (Media):** que el pipeline de enriquecimiento (que ya corre al
   importar) sea la única fuente — devolver categories/requirements ya resueltos en
   esa misma respuesta, y que `use-game-categories`/`openRequirementsModal` lean
   primero de `game_listings` (vía el mismo cache-check que ya usa el pipeline de
   Epic/Steam) antes de tocar Storefront. Esto solo requiere conectar piezas que ya
   existen, no pipeline nuevo.
2. **Rediseño cross-store (Alta, opcional/fase 2):** en vez de que cada tienda
   aporte su propio set de tags inconsistente, usar una fuente externa de metadata
   unificada por juego — investigué **RAWG.io** (`api.rawg.io`, gratis para uso
   personal/hobby, >350k juegos, tags incluyen `singleplayer`/`multiplayer`,
   géneros, y rating/Metacritic real). Resolvería de un saque: tags unificados
   cross-store, y el rating real que falta en el punto 4. No reemplaza
   `game-requirements` (RAWG no tiene specs de PC) ni el precio (eso sigue siendo
   por tienda). Antes de comprometerse: falta verificar cobertura real de matching
   por nombre+plataforma contra el catálogo actual y límites de la free tier a la
   escala de este proyecto — es una apuesta de arquitectura, no un fix de tarde.

### 6. Juegos NSFW — decidir política

**Prioridad:** Alta · **Dificultad:** Baja

Mientras no se decida, cada importación de Steam puede poblar la BDD compartida con
contenido NSFW sin filtro.

**Solución propuesta:** opción 2 del doc original (toggle desactivado por defecto)
es la más segura y barata — filtro en el import de Steam por
`appdetails.required_age`/categorías adultas antes de upsertear a `games`.

### 7. Profile imgs de amigos (Steam) — wiring directo

**Prioridad:** Alta · **Dificultad:** Baja

El avatar de Steam ya llega hasta `FriendIdentity.avatar`
(`app/api/steam/friends/route.ts` lo trae de `GetPlayerSummaries`), solo falta
renderizarlo. Epic sí es un gap real — su bulk lookup no expone avatar.

**Solución propuesta:** en
[components/matching/matching-friends-panel.tsx](../components/matching/matching-friends-panel.tsx),
usar `<AvatarImage src={friend.avatar ?? undefined}>` con el `<AvatarFallback>` de
iniciales que ya existe como fallback.

### 8. Filtro rápido coop/multiplayer

**Prioridad:** Alta · **Dificultad:** Baja

Alto ratio impacto/esfuerzo — es un preset de los filtros cooperativo/multiplayer
que ya existen, no un filtro nuevo. Justo el caso de uso principal del sitio.

---

## Prioridad Media

### 9. Epic: precio/tags — evaluar automatizar vs. buscar alternativa

**Prioridad:** Media · **Dificultad:** depende del camino, ver abajo

`curate_epic_offers.py` (curación manual, corre con `cloudscraper` porque
Cloudflare bloquea cualquier IP de PaaS/cloud conocida sin importar el host —
confirmado en Render y PythonAnywhere) nunca fue pensado como solución final y
tiene un límite real: depende de la reputación de IP de una máquina específica —
hoy, literalmente la que no tenés a mano. Dos caminos, no uno:

**Camino A — quedarse con curación manual y reforzarla (Dificultad: Baja-Media).**
Trackear el script en git (no tiene secretos hardcodeados, lee
`SUPABASE_SERVICE_ROLE_KEY` de `.env.local`) para no depender de tener acceso a una
sola máquina, y programarlo vía Task Scheduler/cron en la máquina principal. Sigue
atado a que esa máquina esté disponible — reduce la fricción de lo manual, pero no
es automatización real.

**Camino B — explorar una fuente externa que ya resolvió el bypass de Cloudflare
(Dificultad: Media-Alta, investigación primero).** Investigué **IsThereAnyDeal
(ITAD)**: tiene API pública (`docs.isthereanydeal.com`), key gratis, rate limit de
1000 req/5min con cuenta verificada, y **sí cubre Epic Games Store** (shop id 16,
~14k juegos trackeados, deals en vivo). Esto resolvería específicamente **precio y
descuento** sin tocar Cloudflare en absoluto — el backend de QuickCoop le pediría a
un tercero que ya tiene la infraestructura para esto, en vez de scrapear Epic
directo. Importante: ITAD es comparador de precios, no fuente de tags completos
(genre+feature) — esa parte del problema original seguiría sin resolver por esta
vía (ver punto 5, RAWG cubre tags pero no precio). `get_product` + metadata bulk
(nombre, imagen, descripción, géneros parciales) siguen funcionando sin problema
hoy, no son parte de este punto.

**Recomendación concreta:** si se quiere automatizar precio/descuento de Epic de
verdad (sin script local), spike corto contra la API de ITAD primero — es gratis,
documentada, y si la cobertura/frescura de sus datos de Epic es suficiente, resuelve
el problema de raíz en vez de mitigarlo. Si no alcanza, Camino A queda como
respaldo razonable igual.

### 10. Consistencia de precios (multi-tienda)

**Prioridad:** Media · **Dificultad:** Media

El esquema ya soporta TTL por fila (`game_listings.fetched_at`, ver
[database-design.md](database-design.md) sección 7), pero hoy el refresh es lazy
(solo al re-consultar). Si el punto 9/Camino B se valida, ITAD también puede ser la
fuente para mantener precios frescos de **todas** las tiendas que cubre (no solo
Epic) en vez de construir un cron de revalidación propio por tienda — vale evaluarlo
junto con el punto 9 en lugar de por separado. Mientras no haya tráfico real, no es
bloqueante (mismo bloqueo que el punto 19, Base de datos).

### 11. Otros datos faltantes (imágenes rotas, requirements/descripciones vacías)

**Prioridad:** Media · **Dificultad:** Baja-Media

Ya diagnosticado en la Fase D de
[anonymous-first-flow-plan.md](anonymous-first-flow-plan.md): juegos no-DLC con
`description`/`requirements` vacíos porque `get_product` no encontró `productHome`
o vino sin esos campos — degrada con gracia, no rompe nada, pero el dato falta. El
script de diagnóstico que propone el doc original (query a `game_listings` por
campos NULL, cruzada con `namespace`/`slug` para reproducir la llamada a Epic) es el
camino correcto. Bajo riesgo, es solo lectura + logging.

### 12. Fetch refactor → TanStack (y la causa de los fetches duplicados en dev)

**Prioridad:** Media · **Dificultad:** Media

`next.config.mjs` no define `reactStrictMode` explícitamente, así que aplica el
default de Next.js (esta app usa **16.2.0**), que es `true`. En dev, React
monta→desmonta→remonta efectos a propósito para exponer side effects no
idempotentes. Para hooks ya migrados a TanStack (`useQuery`, ej.
`use-epic-game-details.ts`) esto no duplica la llamada de red real porque el query
cache dedupea por `queryKey`. Para los que siguen con `fetch` crudo en `useEffect`
— [hooks/use-trending-games.ts:82](../hooks/use-trending-games.ts) y los fetches de
[lib/matching/load-matching-data.ts](../lib/matching/load-matching-data.ts) — sí se
duplica la petición en dev. No es bug de producción (ahí no hay doble mount), pero
es una razón concreta más (no solo "consistencia de código") para terminar esta
migración.

**Solución propuesta:** migrar `use-trending-games.ts` primero (más chico, buen
piloto); `load-matching-data.ts` conviene abordarlo junto con el punto 5 y el 15, ya
que las tres tocan el mismo flujo de datos hacia la card.

### 13. Steam: grupo familiar

**Prioridad:** Media · **Dificultad:** Media-Alta

Análisis correcto en el doc original (consulta cruzada a miembros del grupo
familiar, limitado por perfiles privados). Tiene valor real para matching pero es
funcionalidad nueva — no un bug — y depende de APIs de Steam menos estandarizadas
que `GetOwnedGames`/`GetFriendList`.

**Solución propuesta:** validar primero con una cuenta de prueba que sí tenga grupo
familiar qué devuelve realmente el endpoint candidato, antes de comprometerse al
diseño — el doc ya lo plantea bien, solo falta ese spike inicial.

### 14. Specs — reubicar, simplificar tiers, motor de comparación

**Prioridad:** Media (alta en la parte de reubicación, baja en auto-detección) ·
**Dificultad:** mixta, ver abajo

Separar las 4 ideas del doc original por dificultad real:

- **Reubicar el entry point** (de "click en card" a un lugar donde se espera ver
  specs, ej. pool de amigos seleccionados): **Baja** dificultad, urgencia relativa
  alta dentro de este punto — es solo mover dónde se dispara un modal que ya existe,
  y resuelve la confusión que el doc señala (usuario no sabe que el click abre specs
  en vez de info del juego).
- **Simplificar a tiers (low/mid/high end)**: **Media** dificultad — diseño de qué
  tier mapea a qué specs mínimas, reusar `specs-engine.ts` existente.
- **Motor de comparación setup vs. requisitos**: **Media**, no Alta — los
  requirements ya se parsean y guardan (`game-requirements`/pipeline de Steam), así
  que la pieza de "datos de requisitos" ya existe; falta la lógica de comparación,
  no la fuente de datos.
- **Detección automática de hardware**: **Alta** dificultad real (no hay API web
  estándar y confiable para esto sin un paquete nativo/extensión, más fricción de
  consentimiento) — dejar para después, ver punto 24.

### 15. Game cards — rediseño completo

**Prioridad:** Media-Alta · **Dificultad:** Alta

Más allá del fix urgente del punto 4, el rediseño completo que pide el doc original
(qué se muestra al hacer click, organizado por las 6 preguntas que lista) es un
trabajo de UI grande. Buena noticia: varias respuestas ya tienen dato real
disponible y no requieren pipeline nuevo — descripción/categorías/imágenes (Steam y
Epic), DLC por usuario (el pipeline de Epic ya devuelve `dlcs[]` anidados). Lo que
falta de fuente real es rating (punto 4) y "cuántos pueden jugar" más allá de lo que
ya da `categories`.

**Solución propuesta:** encarar junto con el punto 5 (categories/requirements ya
disponibles sin re-fetch) y el punto 12 (migrar `load-matching-data.ts` a TanStack),
ya que las tres tocan el mismo flujo de datos hacia la card.

### 16. Repensar multicuentas

**Prioridad:** Media · **Dificultad:** Media-Alta

El problema de fondo (la UX de "arrastrar para unir" es funcional pero incómoda) es
válido. Es más un problema de interacción que de datos — el modelo de
`external_accounts`/`friend_links` con resolución de identidad ya soporta el caso
"mismo amigo, varias cuentas" a nivel de BDD.

**Solución propuesta:** antes de rediseñar la interacción, vale definir qué
reemplaza al drag — por ejemplo selección múltiple + botón "unir" explícito suele
ser menos ambiguo que drag-to-merge en términos de affordance, sin necesitar
animación nueva.

### 17. Mejor feedback visual

**Prioridad:** Media · **Dificultad:** Media

De acuerdo con el diagnóstico del doc original. Es trabajo de pulido transversal, no
atado a un bug puntual — buen candidato para abordar una vez que el guard del punto
2 y el filtro del punto 8 estén listos, ya que ambos generan nuevos puntos de
feedback que conviene diseñar juntos.

### 18. QCoop extension — puerto a Firefox

**Prioridad:** Media · **Dificultad:** Media

El manifest actual (V3, `addon/manifest.json`) usa permisos y content scripts que
en general portan bien a Firefox (que ya soporta MV3), pero hay diferencias de API
(`browser.*` vs `chrome.*`, manejo de `background.service_worker`) que requieren
probar, no solo copiar.

**Solución propuesta:** usar `webextension-polyfill` para no duplicar
`background.js`/`content-*.js` por navegador.

### 19. Base de datos — validación con uso real

**Prioridad:** Media (importante, pero bloqueada) · **Dificultad:** N/A — no es
trabajo de código pendiente

El esquema (ver [database-design.md](database-design.md)) está más completo de lo
que el doc original sugiere: identidad/amigos, catálogo cross-store, matching,
permisos RLS y TTLs ya están diseñados e implementados (migración
`20260626190137_catalog_games_schema.sql` aplicada). Lo que falta no es diseño, es
**tráfico**: desempeño real con más usuarios importando es algo que no se puede
simular sin usuarios.

**Solución propuesta:** no es una tarea para priorizar en el roadmap de código — es
una métrica a observar a medida que se consiga más gente probando la app (conectado
con el punto 10, ambos esperan lo mismo).

---

## Prioridad Baja

### 20. Recomendaciones — el pool no-"most played" sigue siendo mock en la práctica

**Prioridad:** Baja · **Dificultad:** Baja-Media (mitigación) / N/A (fix de fondo)

`recommendation-utils.ts` sí prefiere `catalogCandidates` reales (de la BDD) sobre
`RECOMMENDED_GAMES` (mock estático en
[lib/matching/constants.ts](../lib/matching/constants.ts)), pero eso es
**prácticamente irrelevante hoy**: el catálogo real está casi vacío en cold-start,
así que la única categoría que se ve real consistentemente es "Most played" (viene
directo de `userGames`, sin pasar por el catálogo) — todo lo demás cae al pool
estático casi siempre. Esto ya estaba identificado como decisión consciente
("esperar a tener más datos importados", 26-06) — sigue siendo razonable esperar.

**Mitigación barata mientras se espera (Baja-Media):** un script de seed que corra
el pipeline ya existente (Steam/Epic) sobre una lista curada de ~50-100 juegos
co-op/multiplayer conocidos, para poblar `games`/`game_listings` sin depender de que
usuarios reales los importen primero. No reemplaza la espera por uso real, pero
reduce cuánto domina el mock mientras tanto.

### 21. Auditoría de código muerto

**Prioridad:** Baja · **Dificultad:** Baja

Encontré poco: `deriveRating`/`derivePlayers` exportados desde
[lib/matching/index.ts](../lib/matching/index.ts) sin uso externo (solo se usan
internamente en `toGameCards`), y `LEGACY_STORAGE_KEYS` en
[lib/storage/keys.ts](../lib/storage/keys.ts) marcado `@deprecated`. No hay bloques
comentados grandes ni módulos huérfanos — el codebase está más limpio de lo que el
doc original da a entender. Tarea de una hora, no urgente.

### 22. Documentación

**Prioridad:** Baja-Media · **Dificultad:** Baja

La documentación ya es notablemente buena (los docs en `docs/` revisados para este
análisis son detallados y están al día). Único cabo suelto encontrado: algunos docs
referencian `docs/session-handoff-2026-06-26.md`, que ya no existe (probablemente
removido en el commit "docs: remove old documentation"). Mantener el hábito actual
es suficiente — solo limpiar referencias a docs eliminados.

### 23. Buscador/orden en friends

**Prioridad:** Baja · **Dificultad:** Baja

Correcto que sea de baja prioridad ahora — solo importa con listas grandes de
amigos, y con pocos usuarios reales hoy no es el cuello de botella actual. Fácil de
agregar cuando haga falta (filtro de texto + sort sobre un array ya en memoria, sin
tocar backend).

### 24. Specs — detección automática de hardware

**Prioridad:** Baja (por ahora) · **Dificultad:** Alta

Coincide con los "Desafíos" que el doc original plantea. No hay una API web estándar
confiable para esto (WebGPU expone algo de info de GPU de forma limitada e
inconsistente entre navegadores; CPU/RAM no son accesibles desde el navegador sin
una extensión nativa). Requeriría una extensión (ya existe la de Epic, podría
ampliarse) o aceptar que el modo avanzado manual siga siendo la única vía confiable.
No bloquea nada mientras tanto — el modo tiers (punto 14) cubre la mayoría del valor
con mucho menos esfuerzo.

### 25. Xbox — integración completa

**Prioridad:** Baja · **Dificultad:** Alta

Evaluado solo por costo/beneficio técnico: sigue siendo la integración más cara de
las tres (3 etapas OAuth, app propia en Azure, tokens efímeros que se regeneran cada
sesión) para un payoff que solo aparece cuando se cruza contra amigos con
Steam/Epic. El toggle básico de Game Pass ya cubre el caso de uso principal. Si en
algún momento Xbox pasa a ser prioridad de producto, vale re-evaluar con ese
criterio.

### 26. Otras tiendas (EA, GOG)

**Prioridad:** Baja · **Dificultad:** Alta

Igual que el punto anterior: costo/beneficio puro. El esquema ya soporta agregar
tiendas sin migración (sección 5 de [database-design.md](database-design.md)), el
costo real es de investigación por tienda (probablemente APIs no oficiales otra
vez, como con Epic). Exploratorio, no bloqueante.

### 27. QCoop extension — publicar en Chrome Web Store

**Prioridad:** Baja (no depende de ustedes) · **Dificultad:** Baja

Bloqueado en revisión externa, sin acción posible hasta que salga. Cuando salga, es
solo agregar el link en el landing — trivial.

---

## Cómo usar este documento

Los puntos 1-8 (Alta) son el candidato para la próxima tanda — la mayoría son
acotados a una sesión de trabajo, salvo el punto 5 (categories/requirements) que
tiene un fix puntual rápido (Media) y una apuesta de rediseño más grande y opcional
(Alta, RAWG) que conviene separar en el tiempo. Los puntos 9-19 (Media) en su
mayoría son extensión de trabajo ya construido (pipeline, esquema, decisiones), no
diseño desde cero — el 9 y 10 además comparten la misma investigación (ITAD) y
conviene resolverlos juntos. Los de Baja prioridad no necesitan entrar al roadmap
activo todavía.
