import { NextRequest, NextResponse } from "next/server"

type SteamSearchResult = {
  items?: {
    id: number
    name: string
    tiny_image?: string
  }[]
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
      return NextResponse.json({ appId: null, imageUrl: null })
    }

    return NextResponse.json({
      appId: match.id,
      name: match.name,
      imageUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${match.id}/header.jpg`,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}