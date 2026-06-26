// BDD enrichment for the catalog (docs/database-design.md sections 3-4):
// reads cached game_listings to avoid re-fetching external data, and upserts
// freshly-pipelined games. Provider-agnostic — Epic and Steam both call this.

import { createServiceClient } from "@/utils/supabase/service"

// `price` is stored as-is per provider (Epic and Steam have different native
// shapes — see EpicGamePrice/SteamGamePrice) — this layer doesn't normalize it.
export type CachedListing = {
  listingId: string
  storeGameId: string
  parentListingId: string | null
  title: string
  description: string | null
  images: { type: string; url: string }[]
  requirements: Record<string, unknown>[]
  tags: string[]
  price: Record<string, unknown> | null
  providerMeta: Record<string, unknown>
}

export async function getCachedListings(provider: string, storeGameIds: string[]): Promise<Map<string, CachedListing>> {
  const result = new Map<string, CachedListing>()
  if (storeGameIds.length === 0) {
    return result
  }

  const supabase = createServiceClient()
  const { data, error } = await supabase
    .from("game_listings")
    .select("id, store_game_id, parent_listing_id, title, description, images, requirements, tags, price, provider_meta")
    .eq("provider", provider)
    .in("store_game_id", storeGameIds)

  if (error) {
    console.error("[catalog/store] failed to read cached listings", error)
    return result
  }

  for (const row of data ?? []) {
    result.set(row.store_game_id, {
      listingId: row.id,
      storeGameId: row.store_game_id,
      parentListingId: row.parent_listing_id,
      title: row.title,
      description: row.description,
      images: row.images ?? [],
      requirements: row.requirements ?? [],
      tags: row.tags ?? [],
      price: row.price,
      providerMeta: row.provider_meta ?? {},
    })
  }

  return result
}

export type NewListingInput = {
  storeGameId: string
  title: string
  description: string | null
  images: { type: string; url: string }[]
  requirements: Record<string, unknown>[]
  tags: string[]
  price: Record<string, unknown> | null
  providerMeta: Record<string, unknown>
  kind: "game" | "dlc"
  // For DLC entries, the base game's storeGameId — resolved to a
  // parent_listing_id once the base listing has been inserted.
  parentStoreGameId?: string | null
}

function primaryImageUrl(images: { type: string; url: string }[]): string | null {
  return images.find((image) => image.type === "DieselGameBoxTall")?.url ?? images[0]?.url ?? null
}

// Inserts a fresh `games` row (1:1, unmatched — cross-store matching is a
// separate, not-yet-implemented concern, see docs/database-design.md section
// 3) plus its `game_listings` row, for every input. Base games are processed
// before DLCs so `parentStoreGameId` can resolve to a real listing id.
export async function upsertListings(provider: string, listings: NewListingInput[]): Promise<Map<string, string>> {
  const supabase = createServiceClient()
  const listingIdByStoreGameId = new Map<string, string>()
  const ordered = [...listings.filter((l) => l.kind === "game"), ...listings.filter((l) => l.kind === "dlc")]

  for (const listing of ordered) {
    const { data: game, error: gameError } = await supabase
      .from("games")
      .insert({
        name: listing.title,
        description: listing.description,
        primary_image_url: primaryImageUrl(listing.images),
        tags: listing.tags,
        kind: listing.kind,
      })
      .select("id")
      .single()

    if (gameError || !game) {
      console.error("[catalog/store] failed to insert games row", gameError)
      continue
    }

    const parentListingId = listing.parentStoreGameId
      ? listingIdByStoreGameId.get(listing.parentStoreGameId) ?? null
      : null

    const { data: gameListing, error: listingError } = await supabase
      .from("game_listings")
      .upsert(
        {
          game_id: game.id,
          provider,
          store_game_id: listing.storeGameId,
          title: listing.title,
          description: listing.description,
          images: listing.images,
          requirements: listing.requirements,
          tags: listing.tags,
          price: listing.price,
          provider_meta: listing.providerMeta,
          parent_listing_id: parentListingId,
          fetched_at: new Date().toISOString(),
        },
        { onConflict: "provider,store_game_id" },
      )
      .select("id")
      .single()

    if (listingError || !gameListing) {
      console.error("[catalog/store] failed to upsert game_listings row", listingError)
      continue
    }

    listingIdByStoreGameId.set(listing.storeGameId, gameListing.id)
  }

  return listingIdByStoreGameId
}

// Links a qcoop user's library to the resolved listings. No-op for anonymous
// callers (see docs/anonymous-first-flow-plan.md) — callers should skip this
// entirely when there's no userId rather than call it with an empty id.
export async function linkUserGames(userId: string, listingIds: string[]): Promise<void> {
  if (listingIds.length === 0) {
    return
  }

  const supabase = createServiceClient()
  const rows = listingIds.map((listingId) => ({
    user_id: userId,
    listing_id: listingId,
    last_synced_at: new Date().toISOString(),
  }))

  const { error } = await supabase.from("user_games").upsert(rows, { onConflict: "user_id,listing_id" })
  if (error) {
    console.error("[catalog/store] failed to link user_games", error)
  }
}
