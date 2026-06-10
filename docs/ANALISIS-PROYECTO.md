# QuickCoop (QCoop) — Análisis técnico del proyecto

> Documento generado a partir del escaneo del código fuente.
> Stack: **Next.js 16** (App Router) · **React 19** · **TypeScript 5.7** · **Tailwind CSS v4** · **Radix UI / shadcn** · **pnpm**.

QCoop es una aplicación web que permite **sincronizar las bibliotecas de juegos de Steam, Epic Games y Xbox Game Pass**, **emparejar (match) juegos en común con amigos** y **recomendar qué jugar en multijugador**, comprobando además la compatibilidad del hardware de cada jugador contra los requisitos del juego.

---

## 1. Features principales y su ubicación en el código

| Feature | Descripción | Dónde está implementada |
|---|---|---|
| **Landing / Quick start** | Página de inicio con hero, conexión de plataformas, secciones de features, stats y CTA. | [components/landing/landing-page.tsx](components/landing/landing-page.tsx) + secciones (`hero-section`, `features-section`, `stats-section`, `cta-section`). |
| **Autenticación mock de usuario** | Sesión de usuario simulada (login/logout) persistida en cliente. | [lib/mock-auth.ts](lib/mock-auth.ts), [hooks/use-mock-auth-session.ts](hooks/use-mock-auth-session.ts), [components/landing/auth-dialog.tsx](components/landing/auth-dialog.tsx). |
| **Conexión Steam (OpenID)** | Login OpenID de Steam vía popup; resuelve el `steamId`. | [hooks/use-steam-auth.ts](hooks/use-steam-auth.ts), [app/api/steam/login/route.ts](app/api/steam/login/route.ts), [app/api/steam/callback/route.ts](app/api/steam/callback/route.ts), [lib/auth/oauth-popup.ts](lib/auth/oauth-popup.ts). |
| **Conexión Epic (OAuth)** | Login OAuth de Epic vía popup. | [hooks/use-epic-auth.ts](hooks/use-epic-auth.ts), [app/api/epic/login/route.ts](app/api/epic/login/route.ts), [app/api/epic/callback/route.ts](app/api/epic/callback/route.ts). |
| **Xbox Game Pass** | Toggle de Game Pass que añade el catálogo a la biblioteca. | [hooks/use-landing-profile.ts](hooks/use-landing-profile.ts), [app/api/gamepass/route.ts](app/api/gamepass/route.ts), [lib/api/gamepass.ts](lib/api/gamepass.ts). |
| **Importación manual de juegos** | Pegar una lista de títulos que luego se enriquecen con imágenes/tags de Steam. | [components/landing/import-games-dialog.tsx](components/landing/import-games-dialog.tsx), enriquecimiento en [hooks/use-matching-init.ts](hooks/use-matching-init.ts). |
| **Trending multiplayer** | Lista de juegos multijugador en tendencia (datos en vivo de Steam Charts + caché). | [components/landing/trending-games-panel.tsx](components/landing/trending-games-panel.tsx), [hooks/use-trending-games.ts](hooks/use-trending-games.ts), [app/api/trending-multiplayer/route.ts](app/api/trending-multiplayer/route.ts). |
| **Vista de Matching (núcleo)** | Orquesta biblioteca propia, amigos, recomendaciones, filtros y modales. | [components/matching/matching-page.tsx](components/matching/matching-page.tsx), inicialización en [hooks/use-matching-init.ts](hooks/use-matching-init.ts) + [lib/matching/load-matching-data.ts](lib/matching/load-matching-data.ts). |
| **Juegos compartidos** | Intersección de la biblioteca propia con las de los amigos seleccionados. | [lib/matching/filter-utils.ts](lib/matching/filter-utils.ts) (`filterSharedGames`, `buildSelectedLibrarySets`). |
| **Carga de bibliotecas de amigos** | Descarga perezosa de la biblioteca Steam de cada amigo seleccionado. | [hooks/use-identity-library.ts](hooks/use-identity-library.ts). |
| **Merge / Un-merge de identidades** | Drag & drop para fusionar perfiles de un mismo amigo en distintas plataformas, y deshacer. | [components/matching/matching-friends-panel.tsx](components/matching/matching-friends-panel.tsx), lógica en [matching-page.tsx](components/matching/matching-page.tsx) (`mergeProfiles`, `unmergeProfile`) y [lib/matching/friend-utils.ts](lib/matching/friend-utils.ts). |
| **Filtros por categoría** | Filtrado de juegos por categorías con modos ANY/ALL. | [hooks/use-game-categories.ts](hooks/use-game-categories.ts), [lib/matching/filter-utils.ts](lib/matching/filter-utils.ts), UI en [matching-library-panel.tsx](components/matching/matching-library-panel.tsx). |
| **Requisitos vs. specs del jugador** | Compara los requisitos de un juego con las specs de cada participante (compatibilidad). | [lib/matching/specs-engine.ts](lib/matching/specs-engine.ts), [components/matching/matching-requirements-dialog.tsx](components/matching/matching-requirements-dialog.tsx), [app/api/steam/game-requirements/route.ts](app/api/steam/game-requirements/route.ts). |
| **Editor de specs del sistema** | Modal para configurar CPU/GPU/RAM por participante. | [components/matching/matching-specs-dialog.tsx](components/matching/matching-specs-dialog.tsx). |
| **Recomendaciones** | Carrusel horizontal de juegos recomendados. | [components/matching/matching-recommendations-panel.tsx](components/matching/matching-recommendations-panel.tsx). |
| **Persistencia local** | Perfil de usuario y caché guardados en `localStorage`. | [lib/user-profile.ts](lib/user-profile.ts), [lib/storage/](lib/storage/). |
| **Privacy policy** | Página estática de política de privacidad. | [app/privacy/page.tsx](app/privacy/page.tsx), [components/privacy-policy.tsx](components/privacy-policy.tsx). |

---

## 2. Estrategias de rendering y su justificación

El proyecto usa el **App Router de Next.js 16** y combina varias estrategias:

### a) Server Components estáticos (envoltorios de ruta)
Las rutas son Server Components que solo importan y renderizan el componente cliente:
- [app/page.tsx](app/page.tsx) → `<LandingPage />`
- [app/matching/page.tsx](app/matching/page.tsx) → reexporta `MatchingPage`
- [app/privacy/page.tsx](app/privacy/page.tsx) → `<PrivacyPolicy />` con `metadata` exportada.

**Justificación:** mantener las páginas como Server Components permite exportar `metadata` (SEO) y servir el shell HTML de forma estática/rápida, dejando la interactividad al cliente. El `RootLayout` ([app/layout.tsx](app/layout.tsx)) también es server: configura fuentes (`next/font/google`), metadata global e inyecta `<Analytics />` solo en producción.

### b) Client-Side Rendering (CSR) para las vistas interactivas
La landing y el matching son `"use client"` y dependen de estado, efectos, `localStorage`, popups OAuth y `fetch` a las API routes:
- [components/landing/landing-page.tsx](components/landing/landing-page.tsx)
- [components/matching/matching-page.tsx](components/matching/matching-page.tsx)

**Justificación:** todo el flujo gira en torno a datos del usuario que **solo existen en el navegador** (perfil en `localStorage`, sesión mock, tokens OAuth recibidos por `postMessage`). No hay sesión en servidor, por lo que SSR de estos datos no aportaría valor; se renderiza un estado de carga (`Loading matching preparation...`) y luego se hidrata con datos del cliente.

### c) Route Handlers como capa "backend" (server-side fetching + caché)
Los `app/api/**/route.ts` se ejecutan en el servidor y actúan como proxy/agregador hacia Steam/Epic/Game Pass, protegiendo claves (`STEAM_API_KEY`) y evitando CORS:
- [app/api/trending-multiplayer/route.ts](app/api/trending-multiplayer/route.ts) implementa **caché en memoria (TTL 24h)** + cabeceras `Cache-Control` con `stale-while-revalidate`, y `cache: "no-store"` en los fetch upstream.
- [app/api/steam/owned-games/route.ts](app/api/steam/owned-games/route.ts), `steam/friends`, `epic/library`, etc.

**Justificación:** las claves de API y la lógica de agregación deben permanecer en el servidor; la caché reduce llamadas a Steam y acelera la respuesta.

### d) Caché en cliente complementaria
[hooks/use-trending-games.ts](hooks/use-trending-games.ts) cachea en `localStorage` con TTL y valida datos corruptos (`NaN`), con **fallback** a una lista estática (`FALLBACK_TRENDING_GAMES`) si la API falla.

**En resumen:** mezcla de **shell estático (Server Components) + CSR para la app interactiva + Route Handlers con caché en servidor**. Es esencialmente una SPA centrada en cliente sobre Next.js, sin SSR de datos de usuario (decisión coherente con que no hay backend de sesión real).

---

## 3. Hooks custom disponibles

| Hook | Función |
|---|---|
| [use-mock-auth-session.ts](hooks/use-mock-auth-session.ts) | Inicializa usuarios mock y expone `currentUser`, `setCurrentUser`, `logout`. |
| [use-landing-profile.ts](hooks/use-landing-profile.ts) | Lee/escribe el perfil persistido: Steam/Epic iniciales, Game Pass, juegos importados; `toggleGamePass`, `confirmImport`. |
| [use-steam-auth.ts](hooks/use-steam-auth.ts) | Flujo OpenID de Steam vía popup + escucha de `postMessage`; expone `steamId`, `steamError`, `isWaiting`, `startAuth`. |
| [use-epic-auth.ts](hooks/use-epic-auth.ts) | Equivalente para OAuth de Epic. |
| [use-trending-games.ts](hooks/use-trending-games.ts) | Carga juegos en tendencia con caché en `localStorage`, validación y fallback. |
| [use-matching-init.ts](hooks/use-matching-init.ts) | **Hook de arranque de la vista matching**: valida sesión, carga datos (`loadMatchingData`), gestiona estado global de la página y enriquece juegos importados / Game Pass en segundo plano. |
| [use-identity-library.ts](hooks/use-identity-library.ts) | Carga perezosa de la biblioteca Steam de cada amigo seleccionado; rastrea `loadingIdentities` y `identityErrors`. |
| [use-game-categories.ts](hooks/use-game-categories.ts) | Obtiene categorías por `appId` en lotes (máx. 80), con `ref` para evitar peticiones duplicadas. |
| [use-mobile.ts](hooks/use-mobile.ts) | Detecta viewport móvil (`matchMedia`, breakpoint 768px). |
| [use-toast.ts](hooks/use-toast.ts) | Sistema de toasts tipo react-hot-toast (reducer + store global). |

---

## 4. Client Components vs Server Components

### Server Components (sin `"use client"`)
- **Rutas/layout:** [app/layout.tsx](app/layout.tsx), [app/page.tsx](app/page.tsx), [app/matching/page.tsx](app/matching/page.tsx), [app/privacy/page.tsx](app/privacy/page.tsx).
- **Componentes de presentación pura** (sin estado ni eventos de navegador propios): [hero-section.tsx](components/landing/hero-section.tsx), [features-section.tsx](components/landing/features-section.tsx), [stats-section.tsx](components/landing/stats-section.tsx), [cta-section.tsx](components/landing/cta-section.tsx), [trending-games-panel.tsx](components/landing/trending-games-panel.tsx), [layout/site-header.tsx](components/layout/site-header.tsx) (header + footer), [layout/background-effects.tsx](components/layout/background-effects.tsx).
- **Route Handlers** (`app/api/**`): código exclusivamente de servidor.

### Client Components (`"use client"`)
- [landing-page.tsx](components/landing/landing-page.tsx) y todos los diálogos: `auth-dialog`, `steam-connect-dialog`, `epic-connect-dialog`, `import-games-dialog`, `quick-start-panel`.
- [matching-page.tsx](components/matching/matching-page.tsx), [matching-friends-panel.tsx](components/matching/matching-friends-panel.tsx) (drag & drop con `pointer events`).
- [privacy-policy.tsx](components/privacy-policy.tsx), [theme-provider.tsx](components/theme-provider.tsx).

> **Matiz importante:** varios componentes de matching **no declaran `"use client"`** ([matching-library-panel.tsx](components/matching/matching-library-panel.tsx), `matching-header`, `matching-recommendations-panel`, `matching-requirements-dialog`, `matching-specs-dialog`, `platform-badge`, `matching-friend-group-panel`). Como son importados por el client component `MatchingPage`, Next.js los incluye en el **bundle de cliente** automáticamente. En la práctica son componentes de cliente "por contagio"; mantenerlos sin la directiva los deja como presentacionales reutilizables que reciben todo por props (patrón presentational/container).

**Patrón general:** el estado y la lógica viven en *hooks* + *container components* (`LandingPage`, `MatchingPage`), mientras que los paneles/secciones son **presentacionales puros que reciben datos y callbacks por props**.

---

## 5. Patrones de Gestalt en el diseño de la UI

Sí, se identifican varios principios de la Gestalt aplicados de forma consistente:

- **Proximidad:** agrupación por `Card` con `space-y-*` / `gap-*`. Cada panel (biblioteca, amigos, recomendaciones) agrupa sus controles relacionados; en [matching-library-panel.tsx](components/matching/matching-library-panel.tsx) los filtros de categoría se agrupan en una caja propia separada de la grilla de juegos.
- **Similitud:** elementos del mismo tipo comparten forma y estilo — los `GameTile` son idénticos en estructura, los chips de categoría usan el mismo *pill* (`rounded-full border px-2.5 py-1 text-[10px] uppercase`), las `PlatformBadge` son uniformes. El usuario reconoce "tipos" por su apariencia repetida.
- **Región común / cerramiento:** las tarjetas (`Card` con `border` + `bg-card/50`) encierran contenido relacionado; los modales/dialogs delimitan una región de tarea. La grilla y los paneles están claramente "encajonados".
- **Figura-fondo:** fondo oscuro (`--background` muy bajo en OKLCH) con tarjetas ligeramente más claras y el color **primary teal** + *glows*/blur ([background-effects.tsx](components/layout/background-effects.tsx), `drop-shadow` neón en el hero) que hacen resaltar la figura sobre el fondo.
- **Destino común (continuación):** el avatar-stack solapado (`marginLeft: -0.625rem`) de "Playing with" se lee como un grupo único; el carrusel de recomendaciones implica continuidad horizontal mediante scroll.
- **Continuidad de la línea:** alineación en grillas (`grid-cols-2 … xl:grid-cols-4`) y filas que guían la lectura.
- **Feedback de agrupación dinámica (merge):** durante el drag, el *target* se resalta con `ring`/`bg-primary/15` y aparece un **ghost flotante** ([matching-friends-panel.tsx](components/matching/matching-friends-panel.tsx)), reforzando visualmente que dos elementos se van a unir (proximidad + región común en acción).

---

## 6. Jerarquía visual y principios de interacción

### Jerarquía visual
- **Tipográfica:** títulos grandes y bold (`text-4xl md:text-6xl` en el hero, `text-3xl/4xl` en secciones, `text-xl` en `CardTitle`) descendiendo a `text-sm`/`text-xs`/`text-[10px]` para metadatos. El texto secundario usa `text-muted-foreground` (menor contraste) para bajar su peso.
- **Color como guía de atención:** un único **color de acento (primary teal, OKLCH `0.7 0.25 180`)** marca lo accionable e importante (CTAs, estado activo de filtros, badges "Live now", glows). Lo neutro queda en grises; los estados de error/aviso usan `destructive` (rojo) y `amber`.
- **Profundidad y elevación:** sombras (`shadow-2xl`, `shadow-primary/10`), blur de fondo y `bg-card/50` con `backdrop-blur` crean capas; el *drag ghost* usa una sombra muy marcada y `scale(1.03)` para "levantarlo" sobre el resto.
- **Layout y foco:** contenedores centrados (`max-w-7xl mx-auto`), y en matching una grilla `lg:grid-cols-[2.2fr_1fr]` que da **prioridad visual a la biblioteca** (panel ancho) frente a amigos/recomendaciones (columna lateral `aside`).
- **Tema visual:** estética *cyber/neon gaming* (tema `cyber` + default), tipografías Geist Sans/Mono, esquinas redondeadas (`--radius`) y scrollbars personalizadas con degradado primary→accent.

### Principios de interacción
- **Feedback inmediato:** `hover:` en casi todos los interactivos (escala de avatares, `hover:-translate-y-px`, cambios de borde/fondo), `transition-colors`/`transition-all duration-150/300`.
- **Estados claros:** seleccionado vs no seleccionado en tarjetas de amigo y chips de filtro; modos ANY/ALL como toggle segmentado resaltado.
- **Affordances de arrastre:** icono `GripVertical` con `cursor-grab`, *ghost* que sigue al puntero, resaltado del *drop target* y cancelación con `Escape`; el handle se atenúa (`/25`) cuando no se puede arrastrar (`canDragMerge`).
- **Estados de carga / vacío / error:** "Loading library...", "Refreshing...", mensajes de "No shared games found", banners de error (`destructive`/`amber`) y *fallbacks* — el sistema nunca queda en blanco.
- **Prevención de errores y reversibilidad:** el merge entre amigos de la misma plataforma se bloquea con aviso (`mergeNotice` temporal), y existe **Un-merge** para deshacer.
- **Divulgación progresiva:** identidades fusionadas ocultas tras "Show merged identities"; requisitos y specs en modales bajo demanda; carga perezosa de bibliotecas/categorías solo cuando se necesitan.
- **Accesibilidad:** uso de `aria-label`/`aria-labelledby`, encabezados `sr-only`, HTML semántico (`<header>`, `<main>`, `<aside>`, `<article>`, `<nav>`, listas `<ul>`), `loading="lazy"` en imágenes y `alt` descriptivos.
- **Consistencia:** componentes shadcn/Radix (`Card`, `Button`, `Badge`, `Tooltip`, `ScrollArea`, `Dialog`) garantizan comportamiento y apariencia uniformes en toda la app.
