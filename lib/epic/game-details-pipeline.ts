// Orchestrates the full Epic game-details enrichment pipeline — TS port of
// the validated Python prototype (scripts/steam_api.py), extended to also
// pull price/discount data. See docs/epic-game-details-pipeline.md.
//
// On-demand BDD population (docs/database-design.md section 4): namespaces
// already fully cached in game_listings skip every external call; only
// genuinely new games run get_product + bulk metadata/offers.

import {
  fetchMetadataBulk,
  fetchOffersBulk,
  fetchProduct,
  pickMainPage,
  type EpicCatalogOffer,
  type EpicOfferSpec,
} from "@/lib/epic/store-api"
import { resolveSlugsForNamespaces } from "@/lib/epic/namespace-slug"
import { getCachedListings, upsertListings, type CachedListing, type NewListingInput } from "@/lib/catalog/store"
import type { EpicGameDetails, EpicGamePrice } from "@/types"

const PROVIDER = "epic"

export type EpicLibraryRecord = {
  namespace: string
  catalogItemId: string
  sandboxName?: string
}

export type EpicGameDetailsResult = {
  games: EpicGameDetails[]
  listingIds: string[]
}

function extractPrice(offer: EpicCatalogOffer | undefined): EpicGamePrice | null {
  const totalPrice = offer?.price?.totalPrice
  if (!totalPrice) {
    return null
  }

  return {
    currencyCode: totalPrice.currencyCode ?? "USD",
    decimals: totalPrice.currencyInfo?.decimals ?? 2,
    originalPrice: totalPrice.originalPrice ?? 0,
    discountPrice: totalPrice.discountPrice ?? 0,
    discount: totalPrice.discount ?? 0,
    voucherDiscount: totalPrice.voucherDiscount ?? 0,
    formatted: {
      originalPrice: totalPrice.fmtPrice?.originalPrice ?? "",
      discountPrice: totalPrice.fmtPrice?.discountPrice ?? "",
      intermediatePrice: totalPrice.fmtPrice?.intermediatePrice ?? "",
    },
  }
}

function offerImages(offer: EpicCatalogOffer | undefined): { type: string; url: string }[] {
  return offer?.keyImages ?? []
}

function primaryImageUrl(images: { type: string; url: string }[]): string | null {
  return images.find((image) => image.type === "DieselGameBoxTall")?.url ?? images[0]?.url ?? null
}

function offerTags(offer: EpicCatalogOffer | undefined): string[] {
  return (offer?.tags ?? []).filter((tag) => tag.groupName === "genre" || tag.groupName === "feature").map((tag) => tag.name)
}

// Not every game has `data.about.shortDescription` (confirmed empirically —
// see scripts/control.json). Fall back to the offer's own description (from
// the offers bulk call, usually equivalent) and then `data.about.description`
// (the longer "About" copy from the same productHome page) — any valid one
// is fine, there's no meaningful quality difference for our use.
function firstNonEmptyString(...candidates: (string | null | undefined)[]): string | null {
  for (const candidate of candidates) {
    if (candidate && candidate.trim().length > 0) {
      return candidate
    }
  }
  return null
}

function cachedToDetails(namespace: string, base: CachedListing, dlcs: CachedListing[]): EpicGameDetails {
  return {
    namespace,
    slug: typeof base.providerMeta.epicSlug === "string" ? base.providerMeta.epicSlug : null,
    catalogItemId: base.storeGameId,
    title: base.title,
    description: base.description,
    offerDescription: typeof base.providerMeta.offerDescription === "string" ? base.providerMeta.offerDescription : null,
    imageUrl: primaryImageUrl(base.images),
    requirements: base.requirements,
    tags: base.tags,
    metaTags: Array.isArray(base.providerMeta.metaTags) ? (base.providerMeta.metaTags as string[]) : [],
    price: base.price as EpicGamePrice | null,
    offerId: typeof base.providerMeta.offerId === "string" ? base.providerMeta.offerId : null,
    isDlc: false,
    dlcs: dlcs.map((dlc) => ({ catalogItemId: dlc.storeGameId, title: dlc.title })),
  }
}

export async function buildEpicGameDetails(
  accessToken: string,
  records: EpicLibraryRecord[],
): Promise<EpicGameDetailsResult> {
  const byNamespace = new Map<string, EpicLibraryRecord[]>()
  for (const record of records) {
    const group = byNamespace.get(record.namespace) ?? []
    group.push(record)
    byNamespace.set(record.namespace, group)
  }

  const cached = await getCachedListings(PROVIDER, records.map((record) => record.catalogItemId))

  const games: EpicGameDetails[] = []
  const listingIds: string[] = []
  const namespacesNeedingFetch: string[] = []

  for (const [namespace, recs] of byNamespace) {
    const allCached = recs.every((rec) => cached.has(rec.catalogItemId))
    const cachedRecs = allCached ? recs.map((rec) => cached.get(rec.catalogItemId)!) : []
    const base = cachedRecs.find((listing) => listing.parentListingId === null) ?? cachedRecs[0]

    // A base listing with no price almost always means a prior run's offers
    // bulk call failed partway (e.g. the Cloudflare 403 this check exists
    // for) — the row exists but is incomplete. Treat it as a cache miss so
    // it self-heals on the next successful fetch instead of staying broken
    // forever (getCachedListings would otherwise keep "hitting" it).
    const looksComplete = Boolean(base && base.price !== null)

    if (!allCached || !looksComplete) {
      namespacesNeedingFetch.push(namespace)
      continue
    }

    const dlcs = cachedRecs.filter((listing) => listing !== base)

    games.push(cachedToDetails(namespace, base, dlcs))
    for (const listing of cachedRecs) {
      listingIds.push(listing.listingId)
    }
  }

  if (namespacesNeedingFetch.length === 0) {
    return { games, listingIds }
  }

  const slugByNamespace = await resolveSlugsForNamespaces(namespacesNeedingFetch)

  type PendingGame = {
    namespace: string
    slug: string
    productName?: string
    offerId: string | null
    requirements: Record<string, unknown>[]
    shortDescription: string | null
    aboutDescription: string | null
    metaTags: string[]
    catalogItemIds: string[]
  }

  const pending: PendingGame[] = []
  const allCatalogItemIds = new Set<string>()
  const offerSpecs: EpicOfferSpec[] = []

  for (const namespace of namespacesNeedingFetch) {
    const slug = slugByNamespace[namespace]
    if (!slug) {
      continue // No slug after a guarded refresh — likely not a real product (DLC/entry).
    }

    const product = await fetchProduct(slug)
    if (!product) {
      continue
    }

    const mainPage = pickMainPage(product)
    if (!mainPage) {
      continue
    }

    const offerId = mainPage.offer?.id ?? null
    const recs = byNamespace.get(namespace) ?? []
    for (const rec of recs) {
      allCatalogItemIds.add(rec.catalogItemId)
    }
    if (offerId) {
      offerSpecs.push({ namespace, offerId })
    }

    pending.push({
      namespace,
      slug,
      productName: product.productName,
      offerId,
      requirements: mainPage.data?.requirements?.systems ?? [],
      shortDescription: mainPage.data?.about?.shortDescription ?? null,
      aboutDescription: mainPage.data?.about?.description ?? null,
      metaTags: mainPage.data?.meta?.tags ?? [],
      catalogItemIds: recs.map((rec) => rec.catalogItemId),
    })
  }

  const [metadata, offers] = await Promise.all([
    fetchMetadataBulk(accessToken, Array.from(allCatalogItemIds)),
    fetchOffersBulk(offerSpecs),
  ])

  const newListings: NewListingInput[] = []
  const newGames: Array<{ namespace: string; details: EpicGameDetails }> = []

  for (const game of pending) {
    let baseCatalogItemId: string | null = null
    let baseTitle: string | null = null
    const dlcs: { catalogItemId: string; title: string | null }[] = []

    for (const catalogItemId of game.catalogItemIds) {
      const meta = metadata[catalogItemId]
      const title = meta?.title ?? null
      if (meta && "mainGameItem" in meta) {
        dlcs.push({ catalogItemId, title })
      } else if (baseCatalogItemId === null) {
        baseCatalogItemId = catalogItemId
        baseTitle = title
      }
    }

    const offer = game.offerId ? offers[game.offerId] : undefined
    const finalTitle = baseTitle ?? game.productName ?? "Unknown"
    const images = offerImages(offer)
    const price = extractPrice(offer)
    const tags = offerTags(offer)
    const offerDescription = offer?.description ?? null
    const description = firstNonEmptyString(game.shortDescription, offerDescription, game.aboutDescription)

    if (baseCatalogItemId) {
      newListings.push({
        storeGameId: baseCatalogItemId,
        title: finalTitle,
        description,
        images,
        requirements: game.requirements,
        tags,
        price,
        kind: "game",
        providerMeta: {
          epicNamespace: game.namespace,
          epicSlug: game.slug,
          offerId: game.offerId,
          offerDescription,
          metaTags: game.metaTags,
        },
      })

      for (const dlc of dlcs) {
        newListings.push({
          storeGameId: dlc.catalogItemId,
          title: dlc.title ?? finalTitle,
          description: null,
          images: [],
          requirements: [],
          tags: [],
          price: null,
          kind: "dlc",
          parentStoreGameId: baseCatalogItemId,
          providerMeta: { epicNamespace: game.namespace },
        })
      }

      newGames.push({
        namespace: game.namespace,
        details: {
          namespace: game.namespace,
          slug: game.slug,
          catalogItemId: baseCatalogItemId,
          title: finalTitle,
          description,
          offerDescription,
          imageUrl: primaryImageUrl(images),
          requirements: game.requirements,
          tags,
          metaTags: game.metaTags,
          price,
          offerId: game.offerId,
          isDlc: false,
          dlcs,
        },
      })
    }
  }

  const listingIdByStoreGameId = await upsertListings(PROVIDER, newListings)

  for (const { details } of newGames) {
    games.push(details)
  }
  for (const listingId of listingIdByStoreGameId.values()) {
    listingIds.push(listingId)
  }

  return { games, listingIds }
}
