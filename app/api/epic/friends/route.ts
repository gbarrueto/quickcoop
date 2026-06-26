import { NextResponse } from "next/server"
import { resolveEpicAccount } from "@/lib/epic/resolve-account"
import { fetchEpicDisplayNames } from "@/lib/epic/account-lookup"

export async function GET() {
  const account = await resolveEpicAccount()

  if (!account) {
    return NextResponse.json(
      { error: "Not authenticated. Please connect your Epic Games account first." },
      { status: 401 }
    )
  }

  const { accessToken, accountId } = account

  try {
    const response = await fetch(
      `https://friends-public-service-prod.ol.epicgames.com/friends/api/public/friends/${accountId}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error("[epic/friends] error:", err)
      return NextResponse.json(
        { error: `Epic API error: ${response.status} ${err}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    // The public/friends/{accountId} endpoint returns a plain array of
    // friends with bare accountIds — no display name (see
    // docs/integracion-epic-xbox.md section 3.1). Resolve names separately.
    const friends: Array<{ accountId: string }> = Array.isArray(data) ? data : (data.friends ?? [])
    const displayNames = await fetchEpicDisplayNames(
      accessToken,
      friends.map((friend) => friend.accountId).filter(Boolean),
    )

    const enrichedFriends = friends.map((friend) => ({
      ...friend,
      displayName: displayNames[friend.accountId] ?? null,
    }))

    return NextResponse.json({
      success: true,
      accountId,
      friendsCount: enrichedFriends.length,
      friends: enrichedFriends,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[epic/friends] error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
