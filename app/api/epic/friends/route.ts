import { NextResponse } from "next/server"
import { resolveEpicAccount } from "@/lib/epic/resolve-account"

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

    // The public/friends/{accountId} endpoint returns a plain array of friends.
    const friends = Array.isArray(data) ? data : (data.friends ?? [])

    return NextResponse.json({
      success: true,
      accountId,
      friendsCount: friends.length,
      friends,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[epic/friends] error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
