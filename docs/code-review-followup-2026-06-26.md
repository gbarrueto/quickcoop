# Seguimiento a la revisión de calidad (pre-entrega anterior)

Verificación + corrección de los puntos señalados en la revisión de hace ~20-25 días
(antes del cambio de estilo), hecha el 2026-06-26. Por punto: estado encontrado →
qué se hizo → por qué.

---

## Calidad de diseño (UI + Interaction)

### Features cards eran fake buttons / Stats hardcoded / "Smart Recommendations" inexistente
**Encontrado:** `FeaturesSection`/`StatsSection` ya estaban comentadas en
`landing-page.tsx` (no se renderizaban) — pero el código seguía vivo: `LANDING_FEATURES`
incluía literalmente "Smart Recommendations" (función que en ese momento no existía) y
`LANDING_STATS` tenía `"50K+ Games Indexed"`, `"100K+ Active Users"`, etc. sin ningún
respaldo real.

**Decisión:** eliminar `features-section.tsx`, `stats-section.tsx` y las constantes
`LANDING_FEATURES`/`LANDING_STATS` en vez de dejarlas comentadas-pero-presentes. Eran
contenido no respaldado (cards no clickeables con `hover:` que sugería interactividad,
stats sin métrica real detrás). Si se quiere una sección de features/stats a futuro,
debería construirse con contenido honesto (ej. "Smart Recommendations" ya es real desde
hoy — Fase E del catálogo — recién ahí tendría sentido publicitarla).

### Banner "fallback list" visible al usuario
**Encontrado:** `hooks/use-trending-games.ts` mostraba literal
`"Live trend data unavailable. Showing fallback list."` en `trending-games-panel.tsx`
cada vez que fallaba el fetch de trending — mensaje de debug, no UX. Además el badge
"Live now" se mostraba igual aunque los datos fueran el fallback (contradicción: un
badge dice "en vivo", el texto debajo dice "no disponible, viendo fallback").

**Fix:** `useTrendingGames` ahora expone `isLive: boolean` en vez de un string de error
(el error real solo se loggea a consola, nunca al usuario). El badge pasa a
`"Live now" | "Refreshing..." | "Trending"` según corresponda — nunca afirma "en vivo"
si no lo es, y la lista de fallback (que es curada, no inventada) se muestra sin alarmar
al usuario.

### Affordances engañosas (botones que parecen menos clickeables que las fake cards)
**Encontrado de paso, mientras se revisaba lint:** en `game-recommendations-carousel.tsx`
cada slide tenía `cursor-pointer` y estilos de hover pero **sin `onClick`** — exactamente
el patrón inverso señalado (elemento que se ve clickeable, no hace nada). El prop
`onSelect` existía, se pasaba, pero nunca se usaba.

**Fix:** se conectó `onClick={() => onSelect(index)}` — ahora el affordance visual
coincide con el comportamiento real.

---

## Calidad técnica (React / Next.js)

### Componentes shadcn muertos
**Encontrado:** 38 de 53 componentes en `components/ui/` sin ningún import fuera de esa
carpeta (verificado con análisis transitivo — varios solo se importaban entre sí, ej.
`sidebar.tsx` era el único consumidor de `sheet.tsx`/`skeleton.tsx`). Quedaban 15 vivos:
avatar, badge, button, card, dialog, input, label, scroll-area, separator, spinner,
switch, tabs, toast, toaster, tooltip.

**Fix:** se borraron los 38 archivos muertos + `components/theme-provider.tsx` (nunca se
montaba en `layout.tsx`) + `hooks/use-mobile.ts` (solo lo usaba el `sidebar` ya borrado).
Regenerables con `npx shadcn@latest add <nombre>` si hacen falta a futuro.

### Libs muertas
**Encontrado:** cada componente shadcn muerto sostenía su propia dependencia de npm sin
uso real (ej. `cmdk` solo por `command.tsx`, `react-hook-form` solo por `form.tsx`).
Sumado a 3 con cero referencias en todo el repo (`@hookform/resolvers`, `date-fns`,
`zod`) y `next-themes` (solo usado por `sonner.tsx` y el `theme-provider.tsx` huérfano).

**Fix:** se removieron 27 dependencias de `package.json` tras verificar una por una que
ninguna se usaba fuera de los archivos borrados. `pnpm install` limpio, `pnpm build`
exitoso después.

### Scaffold v0 sin depurar
**Encontrado:** los archivos runtime de v0 (`__v0_*`, `.snowflake/`, `.v0-trash/`) nunca
llegaron a estar en el repo (ya estaban limpios). Quedaba `generator: 'v0.app'` en el
metadata de `app/layout.tsx`.

**Fix:** se quitó esa línea. Los 38 componentes shadcn de arriba eran, en los hechos, el
verdadero residuo del scaffold — ya tratados.

### Lint roto
**Encontrado:** `pnpm lint` salía con exit code 1 (40 errores, 31 warnings) — bloquearía
cualquier CI que dependiera de lint. Entre los errores había parsing errors reales sobre
archivos Python vendoreados en `scripts/.venv` (PyQt5) porque el eslint config no
excluía `scripts/`.

**Fix:**
- `eslint.config.mjs`: se agregó `ignores: ["scripts/**"]` (ese directorio es prototipado
  local en Python, gitignored, nunca debió lintearse como JS/TS).
- `eslint --fix` resolvió automáticamente la mayoría de los `unused-imports` (muchos
  eran justamente los imports de los componentes/libs ya borrados).
- Limpieza manual de las advertencias restantes: una función completa sin usar
  (`FriendAvatarStack` en `matching-library-panel.tsx`, con su `getInitials`/`countGames`
  y los imports que solo ella necesitaba), un `ref`+handler de scroll nunca conectado a
  ningún elemento (`scrollRecommendations`/`recommendationsRef` en `matching-page.tsx`),
  un prop sin uso (`steamId` en `MatchingHeader`), y un objeto usado solo como tipo
  (`actionTypes` en `use-toast.ts`, convertido a type literal).
- Un caso se completó en vez de borrarse: `use-carousel.ts` tenía `resetKey`/`setResetKey`
  declarados pero `setResetKey` nunca se llamaba — el `goTo` (usado al hacer click en un
  slide) ahora lo dispara, así un click manual reinicia el autoplay en vez de competir
  con él.

**Resultado:** `pnpm lint` ahora sale con exit code 0 (21 warnings, todos
`@next/next/no-img-element`/accesibilidad/casos puntuales en `addon/` — nada bloqueante).

### Sin tests
**Encontrado:** `git log` confirma que el primer test se agregó el 2026-06-25, un día
antes de esta revisión — es decir, en el momento de la revisión original efectivamente
no había tests.

**Estado actual:** 5 archivos, 20 tests, todos pasando. No requirió acción — ya estaba
resuelto por trabajo de sesiones anteriores.

---

## Verificación final

`tsc --noEmit` limpio · `pnpm lint` exit 0 · `pnpm test` 20/20 · `pnpm build` exitoso
(22 rutas compiladas) · `next dev` sirviendo `/` y `/matching` sin errores.

Relacionado: [database-design.md](database-design.md) ·
[anonymous-first-flow-plan.md](anonymous-first-flow-plan.md)
