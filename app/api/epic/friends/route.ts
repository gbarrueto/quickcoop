import { NextRequest, NextResponse } from "next/server"
import { EPIC_SESSION_COOKIE, getEpicSession } from "@/lib/epic-session"

export async function GET(request: NextRequest) {
  const session = getEpicSession(request.cookies.get(EPIC_SESSION_COOKIE)?.value)

  if (!session) {
    return NextResponse.json(
      { error: "Not authenticated. Please connect your Epic Games account first." },
      { status: 401 }
    )
  }

  const { accessToken, accountId } = session

  try {
    console.log("[epic/friends] fetching friends for account:", accountId)

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

    // Log the raw shape to verify what Epic returns
    console.log("[epic/friends] raw response type:", Array.isArray(data) ? "array" : typeof data)
    console.log("[epic/friends] raw response:", JSON.stringify(data).slice(0, 500))

    // The public/friends/{accountId} endpoint returns a plain array of friends.
    const friends = Array.isArray(data) ? data : (data.friends ?? [])
    console.log("[epic/friends] received friends:", friends.length, "friends")

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
