import { NextRequest, NextResponse } from "next/server"
import { parseMinimumRequirements, type ParsedSteamRequirements } from "@/lib/steam/requirements"

type SteamAppDetailsRequirementsResponse = Record<
  string,
  {
    success?: boolean
    data?: {
      pc_requirements?: {
        minimum?: string
      }
    }
  }
>

const REQUIREMENTS_CACHE_TTL_MS = 1000 * 60 * 60 * 24

const requirementsCache = new Map<
  number,
  {
    expiresAt: number
    payload: {
      appId: number
      minimumText: string
      parsed: ParsedSteamRequirements
    }
  }
>()

export async function GET(request: NextRequest) {
  const { searchParams } = new URL(request.url)
  const appId = searchParams.get("appId")
  const searchName = searchParams.get("searchName")
  
  let resolvedAppId = appId
  
  // Si viene de Game Pass o import, busca el appId en Steam por nombre
  if (searchName && (!appId || Number(appId) > 1000000)) {
    try {
      const searchRes = await fetch(
        `https://store.steampowered.com/api/storesearch/?term=${encodeURIComponent(searchName)}&l=english&cc=US`
      )
      const searchData = await searchRes.json() as {
        items?: { id: number; name: string }[]
      }
      const match = searchData.items?.[0]
      if (match) {
        resolvedAppId = String(match.id)
      }
    } catch {
      // Si falla la búsqueda, continúa con el appId original
    }
  }

  if (!resolvedAppId) {
    return NextResponse.json({ error: "appId is required" }, { status: 400 })
  }

  const now = Date.now()
  const cached = requirementsCache.get(Number(resolvedAppId))
  if (cached && now < cached.expiresAt) {
    return NextResponse.json({ ...cached.payload, cached: true })
  }

  try {
    const detailsUrl = new URL("https://store.steampowered.com/api/appdetails")
    detailsUrl.searchParams.set("appids", String(resolvedAppId))
    detailsUrl.searchParams.set("l", "english")

    const response = await fetch(detailsUrl.toString(), {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    })

    if (!response.ok) {
      const body = await response.text()
      return NextResponse.json(
        { error: `Steam appdetails request failed (${response.status}): ${body}` },
        { status: 502 },
      )
    }

    const payload = (await response.json()) as SteamAppDetailsRequirementsResponse
    const appPayload = payload[String(resolvedAppId)]

    if (!appPayload?.success || !appPayload.data) {
      return NextResponse.json({ error: "Steam appdetails payload is not available for this appId" }, { status: 404 })
    }

    const minimumRaw = appPayload.data.pc_requirements?.minimum
    if (!minimumRaw) {
      return NextResponse.json({ error: "No minimum PC requirements found for this game" }, { status: 404 })
    }

    const parsedPayload = {
      appId: Number(resolvedAppId),
      ...parseMinimumRequirements(minimumRaw),
    }

    requirementsCache.set(Number(resolvedAppId), {
      expiresAt: now + REQUIREMENTS_CACHE_TTL_MS,
      payload: parsedPayload,
    })

    return NextResponse.json({ ...parsedPayload, cached: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown game requirements API error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
