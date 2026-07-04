import { NextRequest, NextResponse } from "next/server"
import { getCachedListings } from "@/lib/catalog/store"

// Categories now come from game_listings.tags (populated by the catalog
// enrichment pipeline, lib/steam/game-details-pipeline.ts) instead of calling
// Steam's appdetails again per appId — see docs/status-28-06-26-revision.md
// punto 5. No live fallback: an appId not yet in the catalog just returns no
// tags (it'll show up once it's been imported/enriched once).
export async function GET(request: NextRequest) {
  const appIdsParam = request.nextUrl.searchParams.get("appIds")

  if (!appIdsParam) {
    return NextResponse.json({ error: "Missing appIds query parameter" }, { status: 400 })
  }

  const parsedAppIds = appIdsParam
    .split(",")
    .map((value) => Number(value.trim()))
    .filter((value) => Number.isFinite(value))
    .slice(0, 80)

  if (parsedAppIds.length === 0) {
    return NextResponse.json({ error: "No valid appIds provided" }, { status: 400 })
  }

  const cached = await getCachedListings("steam", parsedAppIds.map(String))

  const categoriesByApp: Record<number, string[]> = {}
  parsedAppIds.forEach((appId) => {
    categoriesByApp[appId] = cached.get(String(appId))?.tags ?? []
  })

  return NextResponse.json({ categoriesByApp })
}
