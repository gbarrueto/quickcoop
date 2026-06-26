// On-demand BDD population for Steam (docs/database-design.md section 4):
// reads the catalog cache before re-fetching appdetails, and upserts genuinely
// new games. Real price (price_overview) + description (detailed_description)
// come straight from Steam's own appdetails — no separate pipeline needed.

import { fetchAppDetails, type SteamAppDetailsData } from "@/lib/steam/store-api"
import { getCachedListings, upsertListings, type CachedListing } from "@/lib/catalog/store"
import type { SteamGameDetails, SteamGamePrice } from "@/types"

const PROVIDER = "steam"

// Same multiplayer-relevant category ids used by app/api/steam/search/route.ts.
const RELEVANT_CATEGORY_IDS = new Set([1, 9, 27, 36, 37, 47])

// Steam's appdetails has no documented per-request rate limit, but other
// routes in this codebase cap bulk appid fetches at 80 (see
// app/api/steam/game-categories/route.ts) — matching that here too.
const MAX_NEW_PER_REQUEST = 80

export type SteamGameDetailsResult = {
  games: SteamGameDetails[]
  listingIds: string[]
}

function extractPrice(data: SteamAppDetailsData): SteamGamePrice | null {
  if (data.is_free) {
    return { currency: "USD", initial: 0, final: 0, discountPercent: 0, initialFormatted: "Free", finalFormatted: "Free" }
  }

  const overview = data.price_overview
  if (!overview) {
    return null
  }

  return {
    currency: overview.currency ?? "USD",
    initial: overview.initial ?? 0,
    final: overview.final ?? 0,
    discountPercent: overview.discount_percent ?? 0,
    initialFormatted: overview.initial_formatted ?? "",
    finalFormatted: overview.final_formatted ?? "",
  }
}

function extractTags(data: SteamAppDetailsData): string[] {
  const genres = (data.genres ?? []).map((genre) => genre.description).filter((value): value is string => Boolean(value))
  const categories = (data.categories ?? [])
    .filter((category) => category.id !== undefined && RELEVANT_CATEGORY_IDS.has(category.id))
    .map((category) => category.description)
    .filter((value): value is string => Boolean(value))

  return [...new Set([...genres, ...categories])]
}

function cachedToDetails(appId: number, listing: CachedListing): SteamGameDetails {
  return {
    appId,
    title: listing.title,
    description: listing.description,
    imageUrl: listing.images[0]?.url ?? null,
    tags: listing.tags,
    price: listing.price as SteamGamePrice | null,
  }
}

export async function buildSteamGameDetails(appIds: number[]): Promise<SteamGameDetailsResult> {
  const storeGameIds = appIds.map(String)
  const cached = await getCachedListings(PROVIDER, storeGameIds)

  const games: SteamGameDetails[] = []
  const listingIds: string[] = []
  const missing: number[] = []

  for (const appId of appIds) {
    const listing = cached.get(String(appId))
    if (listing) {
      games.push(cachedToDetails(appId, listing))
      listingIds.push(listing.listingId)
    } else {
      missing.push(appId)
    }
  }

  if (missing.length === 0) {
    return { games, listingIds }
  }

  const fetched = await Promise.all(
    missing.slice(0, MAX_NEW_PER_REQUEST).map(async (appId) => ({ appId, data: await fetchAppDetails(appId) })),
  )

  const newListings = []
  const newDetails: SteamGameDetails[] = []

  for (const { appId, data } of fetched) {
    if (!data) {
      continue
    }

    const images = data.header_image ? [{ type: "header", url: data.header_image }] : []
    const price = extractPrice(data)
    const tags = extractTags(data)
    const title = data.name ?? `Steam App ${appId}`

    newListings.push({
      storeGameId: String(appId),
      title,
      description: data.detailed_description ?? null,
      images,
      requirements: [],
      tags,
      price,
      kind: "game" as const,
      providerMeta: {},
    })

    newDetails.push({ appId, title, description: data.detailed_description ?? null, imageUrl: data.header_image ?? null, tags, price })
  }

  const listingIdByStoreGameId = await upsertListings(PROVIDER, newListings)
  games.push(...newDetails)
  listingIds.push(...listingIdByStoreGameId.values())

  return { games, listingIds }
}
