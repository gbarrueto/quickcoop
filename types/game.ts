import type { Platform } from "./platform"

export type GameCard = {
  appId: number
  name: string
  imageUrl: string
  rating: number
  players: string
  platform: Platform
  tags?: string[]
  playtimeMinutes?: number
}

export type RecommendedGame = {
  appId: number
  name: string
  imageUrl: string
  categories: [string, string]
  rating: number
  description: string
  price: string
}

export type TrendingGame = {
  name: string
  category: string
  playersNow: string
  trendLabel: string
  stores: string[]
  imageUrl?: string
}

export type ImportGame = {
  title: string
  imageUrl?: string
}

export type SteamOwnedGame = {
  appid: number
  name?: string
  playtime_forever?: number
}

export type GamePassGame = {
  id: string
  title: string
  imageUrl: string
}

// Output of the Epic game-details enrichment pipeline (lib/epic/game-details-pipeline.ts).
// Where each field surfaces in the UI is a later (UIUX phase) decision — this
// just needs to exist and be queryable. See docs/epic-game-details-pipeline.md.
export type EpicGamePrice = {
  currencyCode: string
  decimals: number
  originalPrice: number
  discountPrice: number
  discount: number
  voucherDiscount: number
  formatted: {
    originalPrice: string
    discountPrice: string
    intermediatePrice: string
  }
}

export type EpicGameDlc = {
  catalogItemId: string
  title: string | null
}

export type EpicGameDetails = {
  namespace: string
  slug: string | null
  catalogItemId: string | null
  title: string
  description: string | null
  offerDescription: string | null
  imageUrl: string | null
  requirements: Record<string, unknown>[]
  tags: string[]
  metaTags: string[]
  price: EpicGamePrice | null
  offerId: string | null
  isDlc: boolean
  dlcs: EpicGameDlc[]
}

// Output of the Steam game-details enrichment pipeline (lib/steam/game-details-pipeline.ts).
// `initial`/`final` are in the smallest currency unit (e.g. cents), as Steam's
// own appdetails returns them — see the formatted fields for display.
export type SteamGamePrice = {
  currency: string
  initial: number
  final: number
  discountPercent: number
  initialFormatted: string
  finalFormatted: string
}

export type SteamGameDetails = {
  appId: number
  title: string
  description: string | null
  imageUrl: string | null
  tags: string[]
  requirements: Record<string, unknown>[]
  price: SteamGamePrice | null
}
