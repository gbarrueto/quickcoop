// Low-level Steam Store API calls for the game-details pipeline. Unlike
// Epic's catalog endpoint, Steam's appdetails only accepts one appid per
// request (see app/api/steam/game-categories/route.ts for the same
// constraint already handled elsewhere in this codebase, in-memory only).

const APPDETAILS_URL = "https://store.steampowered.com/api/appdetails"

export type SteamAppDetailsData = {
  name?: string
  detailed_description?: string
  header_image?: string
  is_free?: boolean
  genres?: { description?: string }[]
  categories?: { id?: number; description?: string }[]
  price_overview?: {
    currency?: string
    initial?: number
    final?: number
    discount_percent?: number
    initial_formatted?: string
    final_formatted?: string
  }
}

type SteamAppDetailsResponse = Record<string, { success?: boolean; data?: SteamAppDetailsData }>

export async function fetchAppDetails(appId: number): Promise<SteamAppDetailsData | null> {
  const url = new URL(APPDETAILS_URL)
  url.searchParams.set("appids", String(appId))
  url.searchParams.set("l", "english")
  url.searchParams.set("cc", "us")

  const response = await fetch(url.toString(), { headers: { Accept: "application/json" }, cache: "no-store" })
  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as SteamAppDetailsResponse
  const entry = payload[String(appId)]
  return entry?.success && entry.data ? entry.data : null
}
