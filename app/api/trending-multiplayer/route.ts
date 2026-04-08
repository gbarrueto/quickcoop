import { NextResponse } from "next/server"

type TrendingGame = {
  name: string
  category: string
  playersNow: string
  trendLabel: string
  stores: string[]
  imageUrl: string
}

type SteamMostPlayedResponse = {
  response?: {
    ranks?: Array<{
      rank: number
      appid: number
      concurrent_in_game: number
    }>
  }
}

type SteamAppDetailsResponse = Record<
  string,
  {
    success?: boolean
    data?: {
      type?: string
      name?: string
      genres?: Array<{ description?: string }>
      categories?: Array<{ id?: number; description?: string }>
    }
  }
>

const MULTIPLAYER_CATEGORY_IDS = new Set([1, 9, 24, 27, 36, 37, 38, 39, 47])
const EPIC_AVAILABLE_APP_IDS = new Set([578080, 1172470, 252950, 271590, 1091500])
const TRENDING_CACHE_TTL_MS = 1000 * 60 * 60 * 24

let trendingCache:
  | {
      expiresAt: number
      payload: {
        source: string
        updatedAt: string
        games: TrendingGame[]
      }
    }
  | null = null

function formatPlayers(value: number): string {
  return new Intl.NumberFormat("en", {
    notation: "compact",
    maximumFractionDigits: 2,
  }).format(value)
}

function isMultiplayer(categories: Array<{ id?: number; description?: string }> = []): boolean {
  return categories.some((category) => {
    if (typeof category.id === "number" && MULTIPLAYER_CATEGORY_IDS.has(category.id)) {
      return true
    }

    const description = (category.description || "").toLowerCase()
    return (
      description.includes("multiplayer") ||
      description.includes("co-op") ||
      description.includes("online pvp") ||
      description.includes("online co-op")
    )
  })
}

async function fetchMostPlayedGamesFromSteam(apiKey: string) {
  const endpoint = new URL("https://api.steampowered.com/ISteamChartsService/GetMostPlayedGames/v1/")
  endpoint.searchParams.set("key", apiKey)

  const response = await fetch(endpoint.toString(), {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    throw new Error(`Steam charts request failed: ${response.status}`)
  }

  const payload = (await response.json()) as SteamMostPlayedResponse
  return payload.response?.ranks ?? []
}

async function fetchGameDetails(appid: number) {
  const detailsUrl = new URL("https://store.steampowered.com/api/appdetails")
  detailsUrl.searchParams.set("appids", String(appid))
  detailsUrl.searchParams.set("l", "english")

  const response = await fetch(detailsUrl.toString(), {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    return null
  }

  const payload = (await response.json()) as SteamAppDetailsResponse
  const details = payload[String(appid)]

  if (!details?.success || !details.data || details.data.type !== "game" || !details.data.name) {
    return null
  }

  return details.data
}

export async function GET() {
  const apiKey = process.env.STEAM_API_KEY

  if (!apiKey) {
    return NextResponse.json(
      { error: "Missing STEAM_API_KEY in server environment" },
      { status: 500 },
    )
  }

  const now = Date.now()
  if (trendingCache && now < trendingCache.expiresAt) {
    return NextResponse.json(
      {
        ...trendingCache.payload,
        cached: true,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
        },
      },
    )
  }

  try {
    const candidates = await fetchMostPlayedGamesFromSteam(apiKey)
    const topCandidates = candidates.slice(0, 30)

    const details = await Promise.all(
      topCandidates.map(async (candidate) => {
        const gameDetails = await fetchGameDetails(candidate.appid)
        if (!gameDetails) {
          return null
        }

        if (!isMultiplayer(gameDetails.categories)) {
          return null
        }

        const primaryGenre = gameDetails.genres?.[0]?.description ?? "Multiplayer"

        const game: TrendingGame = {
          name: gameDetails.name || "Unknown game",
          category: primaryGenre,
          playersNow: formatPlayers(candidate.concurrent_in_game),
          trendLabel: `Top #${candidate.rank}`,
          stores: EPIC_AVAILABLE_APP_IDS.has(candidate.appid) ? ["Steam", "Epic"] : ["Steam"],
          imageUrl: `https://cdn.cloudflare.steamstatic.com/steam/apps/${candidate.appid}/header.jpg`,
        }

        return game
      }),
    )

    const games = details.filter((item): item is TrendingGame => item !== null).slice(0, 4)

    if (games.length === 0) {
      return NextResponse.json({ error: "No multiplayer trending games found" }, { status: 502 })
    }

    const payload = {
      source: "steam-most-played-live",
      updatedAt: new Date().toISOString(),
      games,
    }

    trendingCache = {
      expiresAt: now + TRENDING_CACHE_TTL_MS,
      payload,
    }

    return NextResponse.json(
      {
        ...payload,
        cached: false,
      },
      {
        headers: {
          "Cache-Control": "public, max-age=3600, s-maxage=86400, stale-while-revalidate=86400",
        },
      },
    )
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown trending API error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
