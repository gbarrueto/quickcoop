# Pipeline de detalles de juego de Epic ("appdetails" de Epic)

Flujo para enriquecer los juegos de la biblioteca de Epic de un usuario con
**descripción, imágenes, requisitos, géneros y funciones (features)** — el equivalente
a `appdetails` de Steam. Pensado para integrarse en la app más adelante.

Prototipo funcional: [scripts/steam_api.py](../scripts/steam_api.py) (genera `final_pipe.json`).

---

## 1. Identificadores de Epic (importante)

Cada API pide un id distinto:

| Id | De dónde sale | Para qué |
|---|---|---|
| `namespace` (sandbox) | biblioteca del usuario | mapear a slug, agrupar juego |
| `catalogItemId` | biblioteca del usuario | metadata (título base, detección de DLC) |
| `slug` | `productmapping` (namespace→slug) | `get_product` |
| `offerId` | page `productHome` de `get_product` | tags completos (genre+feature) vía offer |

Las entradas de la biblioteca **no son todas juegos**: se filtran las que no mapean a slug;
las duplicadas dentro de un mismo namespace suelen ser **base + DLC**.

---

## 2. Flujo

```
1. query_user_lib            → entradas (namespace, catalogItemId, productId, sandboxName)
2. filtrar + agrupar         → descartar sin slug; agrupar por namespace (1 namespace = 1 juego)
3. productmapping            → namespace → slug
4. get_product(slug)         → page type=="productHome": offerId, requirements, shortDescription, meta.tags
5. metadata bulk (catalog)   → título base + detección de DLC (mainGameItem)
6. offers bulk (GraphQL)     → tags completos con groupName (genre/feature) + descripción
7. merge                     → un registro por juego base, con sus DLC anidados
```

### Detalles clave por paso

- **Page principal (paso 4):** elegir `page.type == "productHome"` (fallback: primera page con
  `offer.hasOffer` y `data.about`). **El `offer.id` de esa page es el offerId del juego base.**
- **Requisitos:** solo viven en store-content → `page.data.requirements.systems[]`. No están en la
  offer; por eso `get_product` es obligatorio.
- **DLC vs base (paso 5):** la metadata de catálogo del DLC contiene `mainGameItem`; la del base **no**.
  El **título base** se toma de `metadata[catalogItemId].title`.
- **Tags (paso 6):** `page.data.meta.tags` es un subconjunto parcial e inconsistente (a veces solo
  géneros). El set completo (géneros **y** funciones) está en `offer.tags`, cada uno con `groupName`.
  Se filtran `groupName in ("genre", "feature")` y se toma `name` directamente (ya viene el nombre,
  no hace falta resolver id→nombre).
- **Descripción (29-06-26):** `data.about.shortDescription` no siempre existe (confirmado
  empíricamente — ver `scripts/control.json` en el repo del usuario). El campo `description` final
  usa una cadena de fallback: `shortDescription` → `offer.description` (de la offer bulk, paso 6,
  suele coincidir con shortDescription) → `data.about.description` (la copia "About" más larga de la
  misma productHome). Cualquiera que sea válida sirve, no hay diferencia de calidad relevante entre
  ellas. Implementado en `lib/epic/game-details-pipeline.ts` (`firstNonEmptyString`).

---

## 3. Endpoints

| Paso | Endpoint | Auth |
|---|---|---|
| Biblioteca | `GET library-service.live.use1a.on.epicgames.com/library/api/public/items?includeMetadata=true&platform=Windows` | bearer (sesión) |
| namespace→slug | `GET store-content.ak.epicgames.com/api/content/productmapping` | — |
| Producto | `GET store-content.ak.epicgames.com/api/{locale}/content/products/{slug}` | — |
| **Metadata bulk** | `GET catalog-public-service-prod06.ol.epicgames.com/catalog/api/shared/bulk/items?id={catId}&id={catId2}…&country=US&locale=en-US&includeMainGameDetails=true` | bearer (sesión) |
| **Offers bulk** | `POST store.epicgames.com/graphql` — `catalogOffer(namespace, id){ description tags{ id name groupName } }` (batched) | — |

> **Hallazgo clave de la optimización:** el endpoint de catálogo `/catalog/api/shared/bulk/items`
> (sin namespace en la ruta) acepta **catalogItemIds de distintos namespaces** en una sola llamada
> y devuelve un dict keyed por catalogItemId. Esto permite traer toda la metadata en ~1 llamada en
> lugar de una por juego.

---

## 4. Optimización (lo que se implementó)

El cuello de botella es `get_product`, que es **por slug** (no se puede batchear). Lo demás sí:

| | Antes (por entrada) | Ahora |
|---|---|---|
| `get_product` | 1 × N entradas | 1 × **namespace único** |
| metadata | 1 × N | **bulk** cross-namespace (1 cada ~50 ids) |
| offers | 1 × N | **bulk** batched GraphQL (1 cada ~20) |

Resultado medido (biblioteca de prueba, 108 entradas → 48 juegos):
**48 get_product + 2 metadata + 3 offers = 53 queries** (antes ~168). Para ~80 juegos: **82 vs 240**.

Helpers en el script: `get_metadata_bulk()`, `get_offers_bulk()`, `pick_main_page()`.

---

## 5. Formato de salida (`final_pipe.json`)

Lista de juegos base; cada uno:

```json
{
  "namespace": "2a09fb19b47f46dfb11ebd382f132a8f",
  "slug": "marvels-guardians-of-the-galaxy",
  "productName": "Marvel's Guardians of the Galaxy",
  "title": "Marvel's Guardians of the Galaxy",
  "catalogItemId": "88f4bb0bb06e4962a2042d5e20fb6ace",
  "is_dlc": false,
  "dlcs": [
    { "catalogItemId": "b2666e21…", "title": "…: Social-Lord Outfit" }
  ],
  "description": "You are Star-Lord. …",
  "offer_description": "You are Star-Lord. …",
  "requirements": [ { /* systems: OS, processor, memory, graphics, storage */ } ],
  "meta_tags": ["ACTION", "ADVENTURE"],
  "tags": ["Action", "Controller Support", "Action-Adventure", "Single Player", "Adventure"],
  "offer_id": "a2fc9e21…"
}
```

- `tags` = géneros + funciones (lo que se muestra en la store), con nombre legible.
- `dlcs` = DLC que el usuario posee de ese juego (vacío si ninguno).

---

## 6. Notas para integrar en la app

- **Auth:** reutilizar la sesión de Epic ya existente (`lib/epic-session.ts`); biblioteca y catalog
  bulk requieren el bearer. productmapping, get_product y offers (GraphQL) son públicos.
- **Dónde:** un endpoint backend tipo `/api/epic/game-details` (o un job de enriquecimiento de la
  biblioteca), nunca desde el navegador (CORS + token).
- **Cachear:** `productmapping` y los detalles por juego cambian poco → cachear (TTL ~24h) como ya
  se hace con Steam/Game Pass. La biblioteca del usuario sí es por-usuario.
- **Dependencia:** el prototipo usa `epicstore_api` (Python) con la `OFFERS_QUERY` modificada para
  traer `tags { id name groupName }`. En el backend (TS) se replican las mismas llamadas REST/GraphQL.
- **Robustez:** manejar juegos sin `productHome`, sin offer, o sin base entre las entradas (degradar
  a `productName`/`meta_tags`).

### Decisiones de arquitectura

- **Portar a TS dentro de Next.js** (no montar un servicio Python aparte). Lo que abstrae
  `epicstore_api` es delgado: 4 `fetch` + 1 query GraphQL constante + la lógica de merge (que se
  traduce 1:1 del prototipo). El token ya vive en el backend Next (`lib/epic-session.ts`); un
  servicio aparte añadiría deploy, CORS, compartir token y ops para ahorrar ~200 líneas.
  **Fallback futuro:** FastAPI/Flask solo si el backend crece mucho o se quiere usar más superficie
  de `epicstore_api` (búsqueda, colecciones, reviews, media…).
- **TanStack Query (React Query)** para consumir estos datos desde el front: aplica a los hooks de
  **datos GET** (game-details, trending, steam, library), NO a flujos OAuth/popup ni a estado
  local/localStorage. Empezar la adopción por `epic/game-details`.
- **Simplificación:** recortar la `OFFERS_QUERY` a solo `description` + `tags { name groupName }`
  para un port más liviano (es lo único que se usa de la offer).

Relacionado: [integracion-epic-xbox.md](integracion-epic-xbox.md) · [rutas-backend.md](rutas-backend.md)
