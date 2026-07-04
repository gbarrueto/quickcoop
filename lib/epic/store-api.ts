// Low-level Epic Games Store API calls used by the game-details pipeline.
// Faithful TS port of the validated Python prototype (scripts/steam_api.py +
// epicstore_api) — see docs/epic-game-details-pipeline.md for the full flow
// and docs/integracion-epic-xbox.md section 3 for endpoint details.

const STORE_CONTENT_BASE = "https://store-content.ak.epicgames.com/api"
const CATALOG_BULK_URL = "https://catalog-public-service-prod06.ol.epicgames.com/catalog/api/shared/bulk/items"

const LOCALE = "en-US"
const COUNTRY = "US"

const METADATA_CHUNK = 50

// store-content and the GraphQL endpoint sit behind Cloudflare's bot
// detection — Node's fetch() sends no User-Agent by default, which gets
// flagged and 403'd. A normal browser UA is enough to pass (no need for the
// Python prototype's cloudscraper/JS-challenge solving). See
// docs/epic-game-details-pipeline.md and project-epic-game-details memory.
const BROWSER_USER_AGENT =
  "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/124.0.0.0 Safari/537.36"

export type EpicProductPage = {
  type?: string
  offer?: { id?: string; hasOffer?: boolean }
  data?: {
    about?: { shortDescription?: string; description?: string }
    requirements?: { systems?: Record<string, unknown>[] }
    meta?: { tags?: string[] }
  }
}

export type EpicProductData = {
  productName?: string
  pages?: EpicProductPage[]
}

// `productmapping` is a full bulk dump ({namespace: slug, ...}), not queryable
// by namespace — cached in epic_namespace_slug (see namespace-slug.ts).
export async function fetchProductMapping(): Promise<Record<string, string>> {
  const response = await fetch(`${STORE_CONTENT_BASE}/content/productmapping`, {
    headers: { "User-Agent": BROWSER_USER_AGENT },
  })
  if (!response.ok) {
    throw new Error(`Epic productmapping failed: ${response.status}`)
  }
  return response.json()
}

// No auth required — public store-content endpoint.
export async function fetchProduct(slug: string): Promise<EpicProductData | null> {
  const response = await fetch(`${STORE_CONTENT_BASE}/${LOCALE}/content/products/${slug}`, {
    headers: { "User-Agent": BROWSER_USER_AGENT },
  })
  if (!response.ok) {
    return null
  }
  return response.json()
}

export function pickMainPage(product: EpicProductData): EpicProductPage | null {
  const pages = product.pages ?? []
  const productHome = pages.find((page) => page.type === "productHome")
  if (productHome) {
    return productHome
  }
  return pages.find((page) => page.offer?.hasOffer && page.data?.about) ?? null
}

export type EpicCatalogMetadata = {
  title?: string
  mainGameItem?: unknown
}

// Cross-namespace: a single call accepts catalogItemIds from different
// namespaces — { catalogItemId: metadata }. Requires the user's bearer token.
export async function fetchMetadataBulk(
  accessToken: string,
  catalogItemIds: string[],
): Promise<Record<string, EpicCatalogMetadata>> {
  const result: Record<string, EpicCatalogMetadata> = {}

  for (let i = 0; i < catalogItemIds.length; i += METADATA_CHUNK) {
    const batch = catalogItemIds.slice(i, i + METADATA_CHUNK)
    const params = new URLSearchParams({ country: COUNTRY, locale: LOCALE, includeMainGameDetails: "true" })
    batch.forEach((id) => params.append("id", id))

    const response = await fetch(`${CATALOG_BULK_URL}?${params}`, {
      headers: { Authorization: `Bearer ${accessToken}`, "User-Agent": BROWSER_USER_AGENT },
    })

    if (!response.ok) {
      console.error("[epic/store-api] metadata bulk batch failed", response.status)
      continue
    }

    Object.assign(result, await response.json())
  }

  return result
}

export type EpicCatalogOfferPrice = {
  totalPrice?: {
    currencyCode?: string
    discount?: number
    discountPrice?: number
    originalPrice?: number
    voucherDiscount?: number
    currencyInfo?: { decimals?: number }
    fmtPrice?: { originalPrice?: string; discountPrice?: string; intermediatePrice?: string }
  }
}

export type EpicCatalogOffer = {
  id?: string
  description?: string
  keyImages?: { type: string; url: string }[]
  tags?: { name: string; groupName: string | null }[]
  price?: EpicCatalogOfferPrice
}

export type EpicOfferSpec = { namespace: string; offerId: string }

// store.epicgames.com/graphql (the offers endpoint) is behind a Cloudflare
// challenge that blocks every plain HTTP client, browser headers or not —
// confirmed by hand: curl with full browser headers still gets a real
// challenge page, while Python's cloudscraper passes through fine. Routed
// through a tiny dedicated relay (services/epic-offers-bridge) instead of
// calling Epic directly. Not configured → returns {} (price/tags/image from
// the offer stay empty; get_product/metadata-derived fields are unaffected).
const BRIDGE_URL = process.env.EPIC_OFFERS_BRIDGE_URL
const BRIDGE_SECRET = process.env.EPIC_OFFERS_BRIDGE_SECRET

export async function fetchOffersBulk(offerSpecs: EpicOfferSpec[]): Promise<Record<string, EpicCatalogOffer>> {
  if (!BRIDGE_URL) {
    console.error("[epic/store-api] EPIC_OFFERS_BRIDGE_URL not set — skipping offer enrichment (see services/epic-offers-bridge)")
    return {}
  }

  try {
    const response = await fetch(`${BRIDGE_URL}/offers`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        ...(BRIDGE_SECRET ? { "X-Bridge-Secret": BRIDGE_SECRET } : {}),
      },
      body: JSON.stringify({ offers: offerSpecs }),
    })

    if (!response.ok) {
      console.error("[epic/store-api] offers bridge request failed", response.status)
      return {}
    }

    const data: { offers?: Record<string, EpicCatalogOffer> } = await response.json()
    return data.offers ?? {}
  } catch (error) {
    console.error("[epic/store-api] offers bridge unreachable", error)
    return {}
  }
}
