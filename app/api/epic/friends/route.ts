import { NextRequest, NextResponse } from "next/server"

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("epic_access_token")?.value
  const accountId = request.cookies.get("epic_account_id")?.value

  console.log("[epic/friends] accessToken:", accessToken ? "present" : "missing")
  console.log("[epic/friends] accountId:", accountId ?? "missing")

  if (!accessToken || !accountId) {
    return NextResponse.json({ error: "Epic session not found" }, { status: 401 })
  }

  try {
    // Obtiene lista de amigos
    const friendsRes = await fetch(
      `https://friends-public-service-prod.ol.epicgames.com/friends/api/public/friends/${accountId}?includePending=false`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    if (!friendsRes.ok) {
      const err = await friendsRes.text()
      console.log("[epic/friends] Epic API error:", err)
      throw new Error(`Epic friends fetch failed: ${err}`)
    }

    const friendsData = await friendsRes.json() as {
      accountId: string
      alias?: string
    }[]

    if (friendsData.length === 0) {
      return NextResponse.json({ friends: [] })
    }

    // Obtiene display names en bulk (máx 100 por request)
    const accountIds = friendsData.slice(0, 100).map((f) => f.accountId)
    const displayNamesRes = await fetch(
      `https://account-public-service-prod.ol.epicgames.com/account/api/public/account?${accountIds.map((id) => `accountId=${id}`).join("&")}`,
      {
        headers: { Authorization: `Bearer ${accessToken}` },
      }
    )

    type EpicAccountInfo = { id: string; displayName?: string; externalAuths?: unknown }
    let accountInfoMap: Record<string, EpicAccountInfo> = {}

    if (displayNamesRes.ok) {
      const accountInfoList = await displayNamesRes.json() as EpicAccountInfo[]
      accountInfoMap = Object.fromEntries(accountInfoList.map((a) => [a.id, a]))
    }

    const friends = friendsData.slice(0, 100).map((friend) => ({
      accountId: friend.accountId,
      displayName:
        friend.alias ||
        accountInfoMap[friend.accountId]?.displayName ||
        `Epic User ${friend.accountId.slice(0, 6)}`,
    }))

    return NextResponse.json({ friends })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.log("[epic/friends] catch error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}