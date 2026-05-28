import { NextRequest, NextResponse } from "next/server"

type SteamSearchResult = {
  items?: {
    id: number
    name: string
    tiny_image?: string
  }[]
}

type SteamAppDetails = {
  [appId: string]: {
    success: boolean
    data?: {
      genres?: { id: string; description: string }[]
      categories?: { id: number; description: string }[]
    }
  }
}

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const term = searchParams.get("term")

  if (!term) {
    return NextResponse.json({ error: "term is required" }, { status: 400 })
  }

  try {
    const response = await fetch(
      `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(term)}&l=english&cc=US`,
      { next: { revalidate: 60 * 60 * 24 } }
    )

    if (!response.ok) {
      return NextResponse.json({ error: "Steam search failed" }, { status: 502 })
    }

    const data = await response.json() as SteamSearchResult
    const match = data.items?.[0]

    if (!match) {
      return NextResponse.json({ appId: null, imageUrl: null, tags: [] })
    }

    const imageUrl = `https://cdn.akamai.steamstatic.com/steam/apps/${match.id}/header.jpg`

    // Obtiene géneros y categorías del juego
    let tags: string[] = []
    try {
      const detailsRes = await fetch(
        `https://store.steampowered.com/api/appdetails?appids=${match.id}&filters=genres,categories&l=english`,
        { next: { revalidate: 60 * 60 * 24 } }
      )

      if (detailsRes.ok) {
        const detailsData = await detailsRes.json() as SteamAppDetails
        const appData = detailsData[String(match.id)]?.data

        const genres = (appData?.genres ?? []).map((g) => g.description)
        const relevantCategoryIds = new Set([1, 9, 27, 36, 47, 37])
        const multiplayerCats = (appData?.categories ?? [])
          .filter((c) => relevantCategoryIds.has(c.id))
          .map((c) => c.description)

        tags = [...new Set([...genres, ...multiplayerCats])]
      }
    } catch {
      // Tags no críticos, continúa sin ellos
    }

    return NextResponse.json({
      appId: match.id,
      name: match.name,
      imageUrl,
      tags,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}