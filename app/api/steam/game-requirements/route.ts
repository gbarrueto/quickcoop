import { NextRequest, NextResponse } from "next/server"

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

type ParsedRequirements = {
  os?: string
  processor?: string
  graphics?: string
  memoryGb?: number
  storageGb?: number
  vramGb?: number
}

const REQUIREMENTS_CACHE_TTL_MS = 1000 * 60 * 60 * 24

const requirementsCache = new Map<
  number,
  {
    expiresAt: number
    payload: {
      appId: number
      minimumText: string
      parsed: ParsedRequirements
    }
  }
>()

function stripHtml(input: string): string {
  return input
    .replace(/<\s*br\s*\/?\s*>/gi, "\n")
    .replace(/<\/li>/gi, "\n")
    .replace(/<li[^>]*>/gi, "")
    .replace(/<[^>]+>/g, "")
    .replace(/&nbsp;/gi, " ")
    .replace(/&amp;/gi, "&")
    .replace(/\r/g, "")
}

function normalizeLine(line: string): string {
  return line.replace(/\s+/g, " ").trim()
}

function parseFirstNumberGb(text?: string): number | undefined {
  if (!text) {
    return undefined
  }

  const match = text.match(/(\d+(?:\.\d+)?)\s*GB/i)
  if (!match) {
    return undefined
  }

  const value = Number(match[1])
  return Number.isFinite(value) ? value : undefined
}

function parseByLabel(lines: string[], label: string): string | undefined {
  const prefix = `${label.toLowerCase()}:`
  const line = lines.find((current) => current.toLowerCase().startsWith(prefix))
  if (!line) {
    return undefined
  }

  return line.slice(prefix.length).trim()
}

function parseMinimumRequirements(rawMinimumHtml: string): { minimumText: string; parsed: ParsedRequirements } {
  const minimumText = stripHtml(rawMinimumHtml)
  const lines = minimumText
    .split("\n")
    .map(normalizeLine)
    .filter(Boolean)

  const os = parseByLabel(lines, "OS")
  const processor = parseByLabel(lines, "Processor")
  const memoryLine = parseByLabel(lines, "Memory")
  const graphics = parseByLabel(lines, "Graphics")
  const storageLine = parseByLabel(lines, "Storage")

  const memoryGb = parseFirstNumberGb(memoryLine)
  const storageGb = parseFirstNumberGb(storageLine)
  const vramGb = parseFirstNumberGb(graphics)

  return {
    minimumText,
    parsed: {
      os,
      processor,
      graphics,
      memoryGb,
      storageGb,
      vramGb,
    },
  }
}

export async function GET(request: NextRequest) {
  const appIdParam = request.nextUrl.searchParams.get("appId")
  if (!appIdParam) {
    return NextResponse.json({ error: "Missing appId query parameter" }, { status: 400 })
  }

  const appId = Number(appIdParam)
  if (!Number.isFinite(appId)) {
    return NextResponse.json({ error: "Invalid appId query parameter" }, { status: 400 })
  }

  const now = Date.now()
  const cached = requirementsCache.get(appId)
  if (cached && now < cached.expiresAt) {
    return NextResponse.json({ ...cached.payload, cached: true })
  }

  try {
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
      const body = await response.text()
      return NextResponse.json(
        { error: `Steam appdetails request failed (${response.status}): ${body}` },
        { status: 502 },
      )
    }

    const payload = (await response.json()) as SteamAppDetailsRequirementsResponse
    const appPayload = payload[String(appId)]

    if (!appPayload?.success || !appPayload.data) {
      return NextResponse.json({ error: "Steam appdetails payload is not available for this appId" }, { status: 404 })
    }

    const minimumRaw = appPayload.data.pc_requirements?.minimum
    if (!minimumRaw) {
      return NextResponse.json({ error: "No minimum PC requirements found for this game" }, { status: 404 })
    }

    const parsedPayload = {
      appId,
      ...parseMinimumRequirements(minimumRaw),
    }

    requirementsCache.set(appId, {
      expiresAt: now + REQUIREMENTS_CACHE_TTL_MS,
      payload: parsedPayload,
    })

    return NextResponse.json({ ...parsedPayload, cached: false })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown game requirements API error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
