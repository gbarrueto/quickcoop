import { NextRequest, NextResponse } from "next/server"

type SteamAppDetailsResponse = Record<
  string,
  {
    success?: boolean
    data?: {
      genres?: Array<{ description?: string }>
    }
  }
>

const CACHE_TTL_MS = 1000 * 60 * 60 * 24

const categoriesCache = new Map<number, { expiresAt: number; categories: string[] }>()

async function fetchGameGenres(appId: number): Promise<string[]> {
  const detailsUrl = new URL("https://store.steampowered.com/api/appdetails")
  detailsUrl.searchParams.set("appids", String(appId))
  detailsUrl.searchParams.set("l", "english")

  const response = await fetch(detailsUrl.toString(), {
    headers: {
      Accept: "application/json",
    },
    cache: "no-store",
  })

  if (!response.ok) {
    return []
  }

  const payload = (await response.json()) as SteamAppDetailsResponse
  const details = payload[String(appId)]

  if (!details?.success || !details.data) {
    return []
  }

  const categories = (details.data.genres ?? [])
    .map((genre) => (genre.description || "").trim())
    .filter(Boolean)

  return [...new Set(categories)]
}

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

  const now = Date.now()
  const categoriesByApp: Record<number, string[]> = {}
  const missingAppIds: number[] = []

  parsedAppIds.forEach((appId) => {
    const cached = categoriesCache.get(appId)
    if (cached && now < cached.expiresAt) {
      categoriesByApp[appId] = cached.categories
      return
    }

    missingAppIds.push(appId)
  })

  const fetched = await Promise.all(
    missingAppIds.map(async (appId) => {
      const categories = await fetchGameGenres(appId)
      categoriesCache.set(appId, {
        expiresAt: now + CACHE_TTL_MS,
        categories,
      })
      return { appId, categories }
    }),
  )

  fetched.forEach(({ appId, categories }) => {
    categoriesByApp[appId] = categories
  })

  return NextResponse.json({
    categoriesByApp,
  })
}
