import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { buildSteamGameDetails } from "@/lib/steam/game-details-pipeline"
import { linkUserGames } from "@/lib/catalog/store"

// Enriches the caller's Steam library with real description/price (see
// store.steampowered.com/api/appdetails), reading from/writing to the shared
// catalog cache (docs/database-design.md section 4). Works anonymously —
// steamId is public, no qcoop session required.
export async function GET(request: NextRequest) {
  const steamId = request.nextUrl.searchParams.get("steamId")

  if (!steamId) {
    return NextResponse.json({ error: "Missing steamId query parameter" }, { status: 400 })
  }

  const steamApiKey = process.env.STEAM_API_KEY
  if (!steamApiKey) {
    return NextResponse.json({ error: "Missing STEAM_API_KEY in server environment" }, { status: 500 })
  }

  try {
    const ownedGamesUrl = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/")
    ownedGamesUrl.searchParams.set("key", steamApiKey)
    ownedGamesUrl.searchParams.set("steamid", steamId)
    ownedGamesUrl.searchParams.set("format", "json")

    const response = await fetch(ownedGamesUrl.toString(), { cache: "no-store" })
    if (!response.ok) {
      return NextResponse.json({ error: "Steam API request failed" }, { status: 502 })
    }

    const payload: { response?: { games?: { appid: number }[] } } = await response.json()
    const appIds = (payload.response?.games ?? []).map((game) => game.appid)

    const { games, listingIds } = await buildSteamGameDetails(appIds)

    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (userData.user) {
      await linkUserGames(userData.user.id, listingIds)
    }

    return NextResponse.json({ success: true, steamId, gamesCount: games.length, games })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[steam/game-details] error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
