import { NextRequest, NextResponse } from "next/server"

type SteamFriend = {
  steamid: string
  relationship: string
  friend_since: number
}

type FriendListResponse = {
  friendslist?: {
    friends?: SteamFriend[]
  }
}

type PlayerSummary = {
  steamid: string
  personaname: string
  avatarfull?: string
}

type PlayerSummariesResponse = {
  response?: {
    players?: PlayerSummary[]
  }
}

async function fetchJson<T>(url: string): Promise<T> {
  const response = await fetch(url, {
    headers: { Accept: "application/json" },
    cache: "no-store",
  })

  if (!response.ok) {
    const body = await response.text()
    throw new Error(`Steam API failed (${response.status}): ${body}`)
  }

  return response.json() as Promise<T>
}

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
    const friendsUrl = new URL("https://api.steampowered.com/ISteamUser/GetFriendList/v0001/")
    friendsUrl.searchParams.set("key", steamApiKey)
    friendsUrl.searchParams.set("steamid", steamId)
    friendsUrl.searchParams.set("relationship", "friend")

    const friendListPayload = await fetchJson<FriendListResponse>(friendsUrl.toString())
    const friends = friendListPayload.friendslist?.friends ?? []

    if (friends.length === 0) {
      return NextResponse.json({ steamId, friends: [] })
    }

    const friendIds = friends.map((friend) => friend.steamid)
    const summaries: PlayerSummary[] = []

    for (let i = 0; i < friendIds.length; i += 100) {
      const chunk = friendIds.slice(i, i + 100)
      const summariesUrl = new URL("https://api.steampowered.com/ISteamUser/GetPlayerSummaries/v0002/")
      summariesUrl.searchParams.set("key", steamApiKey)
      summariesUrl.searchParams.set("steamids", chunk.join(","))

      const chunkPayload = await fetchJson<PlayerSummariesResponse>(summariesUrl.toString())
      summaries.push(...(chunkPayload.response?.players ?? []))
    }

    const summaryMap = new Map(summaries.map((summary) => [summary.steamid, summary]))
    const enrichedFriends = friends.map((friend) => {
      const summary = summaryMap.get(friend.steamid)
      return {
        steamId: friend.steamid,
        name: summary?.personaname ?? `Steam User ${friend.steamid}`,
        avatar: summary?.avatarfull ?? null,
      }
    })

    return NextResponse.json({ steamId, friends: enrichedFriends })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Steam friends API error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
