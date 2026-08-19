# Avances 05-07-26 — Epic offers: nuevo endpoint autenticado

Sesión de análisis y planificación. Sin código nuevo todavía — todo queda anotado
para implementar en una sesión próxima.

Referencia: [status-28-06-26-revision.md](status-28-06-26-revision.md) punto 9
(Epic precio/tags) y [epic-game-details-pipeline.md](epic-game-details-pipeline.md).

---

## 1. Nuevo endpoint: CatalogService REST (autenticado)

### Hallazgo principal

Existe un endpoint REST autenticado en el CatalogService que devuelve datos
de offers completos (precio, imágenes, descripción) sin pasar por GraphQL ni
por Cloudflare. Usa el Bearer token del usuario, que ya tenemos del flujo de
auth. Funciona desde Vercel sin ningún problema.

Fuente: https://gist.github.com/Amrsatrio/20d2174583354ae4f0a24cf63764049f

### Los tres endpoints descubiertos

| Endpoint | Response | Comentario |
|---|---|---|
| `GET /catalog/api/shared/namespace/{ns}/offers` | `{elements:[...]}` | Paginado, devuelve TODAS las offers del namespace. Útil para curación/seed, no para el pipeline. |
| `GET /catalog/api/shared/bulk/offers?id=X&id=Y` | `{offerId: offer}` | **Sin namespace**, cross-namespace, bulk por IDs. ✅ Confirmado funcionando. |
| `GET /catalog/api/shared/namespace/{ns}/bulk/offers?id=X` | `{offerId: offer}` | Igual que el anterior pero limitado a un namespace. Sin ventaja frente al opción 2. |

**Decisión:** usar `api/shared/bulk/offers` (opción 2) — cross-namespace en un solo
call, devuelve un Map keyed por offerId, es drop-in directo para reemplazar
`fetchOffersBulk`. Base URL: `https://catalog-public-service-prod06.ol.epicgames.com/catalog/`

### Diferencias de estructura respecto al GraphQL (impacto en código)

#### Precio — estructura flat

```
// GraphQL (actual, roto en prod)
price.totalPrice.originalPrice     ← precio original (cents)
price.totalPrice.discountPrice     ← precio con descuento (cents)
price.totalPrice.discount          ← monto de descuento (cents)
price.totalPrice.voucherDiscount
price.totalPrice.currencyInfo.decimals
price.totalPrice.fmtPrice.{originalPrice, discountPrice, intermediatePrice}

// Nuevo endpoint REST
basePrice       ← precio original (cents)
currentPrice    ← precio con descuento (cents)
currencyCode    ← "USD"
currencyDecimals ← 2
// No tiene voucherDiscount. Los strings formateados se calculan.
```

`extractPrice()` en `game-details-pipeline.ts` necesita actualizarse. Discount =
`basePrice - currentPrice`. Formatted strings: dividir por `10^currencyDecimals`.

#### Tags — solo IDs enteros (PENDIENTE: mapping, ver sección 2)

```
// GraphQL (actual)
tags: [{ id: "1088", name: "Strategy", groupName: "genre" }]

// Nuevo endpoint REST
tags: [1088, 21122, 1388, ...]    ← solo IDs numéricos, sin nombre ni groupName
```

Sin el mapping, `offerTags()` devuelve vacío. Mientras no esté el mapping,
usar `metaTags` (de `get_product`, ya guardados en `providerMeta.metaTags`)
como fuente de tags efectivos para Epic. Ver sección 2.

#### Imágenes — tipos distintos

```
// GraphQL: DieselGameBoxTall (portrait, preferido)
// Nuevo: DieselStoreFrontTall, OfferImageTall, DieselStoreFrontWide, OfferImageWide, Thumbnail
```

Actualizar `primaryImageUrl()`: prioridad `DieselGameBoxTall` (fallback compat)
→ `DieselStoreFrontTall` → `OfferImageTall` → primer elemento.

### Cambios de implementación pendientes

| Archivo | Cambio |
|---|---|
| `lib/epic/store-api.ts` | Reemplazar `fetchOffersBulk` (bridge → catalog REST). Agregar `accessToken: string` al parámetro. Actualizar tipo `EpicCatalogOffer`. |
| `lib/epic/game-details-pipeline.ts` | `extractPrice()` → nueva estructura de precio. `offerTags()` → devolver vacío (tags son IDs) y usar `metaTags` como fallback. `primaryImageUrl()` → nuevo orden de tipos. Agregar `accessToken` al call de `fetchOffersBulk`. |
| `.env.local` / Vercel | Eliminar `EPIC_OFFERS_BRIDGE_URL` y `EPIC_OFFERS_BRIDGE_SECRET`. |

**Beneficio colateral:** el campo `looksComplete` en el pipeline detecta filas con
`price = null` y las reprocessa. Las entradas existentes en la BDD sin precio
(por el bridge no configurado en prod) se auto-sanarán en el próximo import
del usuario, sin necesidad de un script de backfill.

---

## 2. Mapping de tag IDs (nuevo gap)

El nuevo endpoint devuelve tag IDs enteros sin nombres. Necesitamos un mapping
`tagId → {name, groupName}` para poder filtrar por `genre`/`feature` como lo
hacía la pipeline anterior.

**Propuesta:** tabla `epic_tag_ids(id integer PK, name text, group_name text)`
— mismo patrón que `epic_namespace_slug`. Se puede popular una vez y actualizar
rara vez (los tags del catálogo de Epic son estables). Proceso similar al
mapping de slugs: download bulk de la tabla de tags de Epic (vía el endpoint
`/offers` paginado para un namespace conocido, acumulando IDs únicos) →
resolver nombres con un call específico o manteniendo una tabla curada a mano.

Mientras no esté implementado: usar `metaTags` (strings de `get_product`) como
única fuente de tags para Epic. Menos granulares (no tienen `groupName`), pero
funcionales para el filtro de categorías.

**Prioridad:** Media — bloquea tener tags completos con el nuevo endpoint, pero
`metaTags` es un fallback funcional para el MVP.

---

## 3. DLC processing — pendiente de decisión

### Comportamiento actual (confirmado)

- `buildEpicGameDetails` agrupa library records por namespace. Si cualquier
  `catalogItemId` del namespace no está en cache → se reprocessa el namespace completo.
- Caso User 1 importa [Game X, DLC Y], User 2 importa [Game X, DLC Y, DLC Z]:
  DLC Z no está en cache → cache miss → pipeline corre → DLC Z se inserta. ✅
- Identificación de DLCs: `fetchMetadataBulk` detecta los que tienen `mainGameItem`
  en su metadata. Genera `game_listings` con `kind: 'dlc'` y `parent_listing_id`.

### Simplificación propuesta (en evaluación)

No identificar DLCs en detalle. Normalizar base + DLC juntos por nombre, sin el
paso de metadata bulk para distinguirlos. Beneficio: eliminar una llamada de API.

**Argumentos a favor de simplificar:**
- Mostrar "cuántos DLC tiene el juego" puede ser suficiente para matching (sin
  especificar cuáles tiene cada amigo).
- Muchos DLC son cosméticos (ropa, skins, packs de música) — no relevantes para
  decidir si jugar juntos.
- Juegos con catálogos masivos de DLC (The Sims, Football Manager, etc.) generan
  docenas de `game_listings` sin valor práctico para el matching.

**Argumentos en contra de simplificar:**
- DLC de contenido real (expansiones, mapas, campañas) sí afectan qué se puede
  jugar juntos — es útil saber si todos tienen la misma expansión.
- La metadata bulk ya se usa para identificar el juego base también (detecta qué
  catalogItemId es el base game). Eliminarlo requiere otra forma de hacer esa
  distinción.

**Decisión:** sin implementar todavía. Requiere evaluar qué porcentaje del catálogo
real de Epic (por namespace) son DLCs cosméticos vs contenido. Si la mayoría son
cosméticos, simplificar tiene sentido. Ver la tabla `tags` como referencia del
tipo de contenido ya catalogado.

### Side issue detectado (menor)

`upsertListings` hace `INSERT` en `games` (no upsert) antes de upsertear
`game_listings`. Si el mismo juego se importa por dos usuarios, se generan rows
duplicados en `games`. El row viejo queda huérfano (sin `game_listings` apuntando).
No rompe nada hoy, pero es técnica deuda que limpiar eventualmente — convertir ese
INSERT en un upsert por `(name, kind)` o similar.

---

## Otros endpoints relevantes del Gist

Además del CatalogService, el Gist documenta otros servicios potencialmente útiles:

- **LibraryService** `GET /library/api/public/items` — lista los items de la
  biblioteca del usuario. Alternativa directa a `GET /launcher/api/public/assets/...`
  para obtener la library. Vale revisar si devuelve `namespace`+`catalogItemId`
  directamente (evitaría el paso de resolución actual).
- **FriendsService** `GET /friends/api/v1/{id}/summary` — ya lo usamos para amigos.
  El endpoint `summary` también expone `recentPlayers` y `blocklist`.
- **UserSearchService** `GET /api/v1/search?prefix=...&platform=...` — búsqueda de
  usuarios por nombre. Útil si en algún momento se quiere agregar amigos de Epic
  manualmente sin importar desde la lista de amigos.
- **PresenceService** `GET /presence/api/v1/_/{id}/last-online` — última vez online.
  Potencialmente útil para ordenar amigos por actividad reciente.
