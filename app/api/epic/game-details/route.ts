import { NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { resolveEpicAccount } from "@/lib/epic/resolve-account"
import { buildEpicGameDetails, type EpicLibraryRecord } from "@/lib/epic/game-details-pipeline"
import { linkUserGames } from "@/lib/catalog/store"

// Enriches the caller's Epic library with real names/images/tags/price (see
// docs/epic-game-details-pipeline.md), reading from/writing to the shared
// catalog cache (docs/database-design.md section 4) so repeat imports don't
// re-fetch external data for games already in the BDD.
export async function GET() {
  const account = await resolveEpicAccount()

  if (!account) {
    return NextResponse.json(
      { error: "Not authenticated. Please connect your Epic Games account first." },
      { status: 401 },
    )
  }

  try {
    const response = await fetch(
      "https://library-service.live.use1a.on.epicgames.com/library/api/public/items?includeMetadata=true&platform=Windows",
      { headers: { Authorization: `Bearer ${account.accessToken}` } },
    )

    if (!response.ok) {
      const err = await response.text()
      console.error("[epic/game-details] library fetch error:", err)
      return NextResponse.json({ error: `Epic API error: ${response.status}` }, { status: response.status })
    }

    const data = await response.json()
    const records: EpicLibraryRecord[] = (data.records ?? []).filter(
      (record: Partial<EpicLibraryRecord>) => record.namespace && record.catalogItemId,
    )

    const { games, listingIds } = await buildEpicGameDetails(account.accessToken, records)

    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    if (userData.user) {
      await linkUserGames(userData.user.id, listingIds)
    }

    return NextResponse.json({ success: true, accountId: account.accountId, gamesCount: games.length, games })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[epic/game-details] error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
