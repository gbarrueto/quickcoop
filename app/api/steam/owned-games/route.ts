import { NextRequest, NextResponse } from "next/server"

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
    const steamUrl = new URL("https://api.steampowered.com/IPlayerService/GetOwnedGames/v0001/")
    steamUrl.searchParams.set("key", steamApiKey)
    steamUrl.searchParams.set("steamid", steamId)
    steamUrl.searchParams.set("format", "json")
    steamUrl.searchParams.set("include_appinfo", "true")
    steamUrl.searchParams.set("include_played_free_games", "true")

    const response = await fetch(steamUrl.toString(), {
      headers: {
        Accept: "application/json",
      },
      cache: "no-store",
    })

    const rawText = await response.text()

    if (!response.ok) {
      return NextResponse.json(
        {
          error: "Steam API request failed",
          status: response.status,
          body: rawText,
        },
        { status: 502 },
      )
    }

    let parsedBody: unknown = rawText
    try {
      parsedBody = JSON.parse(rawText)
    } catch {
      // Keep plain text if Steam responds with a non-JSON payload.
    }

    return NextResponse.json({
      steamId,
      endpoint: "IPlayerService/GetOwnedGames/v0001",
      data: parsedBody,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Steam API error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
