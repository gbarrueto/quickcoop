// Real catalog candidates for recommendations (docs/database-design.md):
// games/game_listings are publicly readable, so this queries Supabase
// directly from the client — no Next.js API route needed.

import { createClient } from "@/utils/supabase/client"
import { formatStoredPrice, hashIdFromString } from "@/lib/matching/game-utils"
import type { RecommendedGame } from "@/types"

const CANDIDATE_LIMIT = 20

type CatalogRow = {
  name: string
  primary_image_url: string | null
  tags: string[] | null
  game_listings: { price: unknown; description: string | null } | { price: unknown; description: string | null }[] | null
}

// Returns games from the BDD catalog whose tags overlap with `tags` — the
// real-data pool for "similar" recommendations. Empty if the catalog has
// nothing relevant yet (on-demand population, see database-design.md
// section 4) — callers should fall back to a static pool in that case.
export async function fetchCatalogCandidates(tags: string[]): Promise<RecommendedGame[]> {
  if (tags.length === 0) {
    return []
  }

  const supabase = createClient()
  const { data, error } = await supabase
    .from("games")
    .select("name, primary_image_url, tags, game_listings(price, description)")
    .overlaps("tags", tags)
    .limit(CANDIDATE_LIMIT)

  if (error || !data) {
    return []
  }

  return (data as CatalogRow[]).map((row) => {
    const listing = Array.isArray(row.game_listings) ? row.game_listings[0] : row.game_listings
    const matchedTags = (row.tags ?? []).filter((tag) => tags.includes(tag))

    return {
      appId: hashIdFromString(row.name),
      name: row.name,
      imageUrl: row.primary_image_url ?? "",
      categories: [matchedTags[0] ?? "Game", matchedTags[1] ?? "Library"],
      rating: 0,
      description: listing?.description ?? "",
      price: formatStoredPrice(listing?.price) ?? "—",
    }
  })
}
