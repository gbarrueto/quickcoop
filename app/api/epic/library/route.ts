import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { getEpicTokens } from "@/lib/epic/token-store"

export async function GET(request: NextRequest) {
  const cursor = request.nextUrl.searchParams.get("cursor") || ""

  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()
  const user = userData.user

  if (!user) {
    return NextResponse.json({ error: "Not signed in." }, { status: 401 })
  }

  const tokens = await getEpicTokens(user.id)

  if (!tokens) {
    return NextResponse.json(
      { error: "Not authenticated. Please connect your Epic Games account first." },
      { status: 401 }
    )
  }

  const { accessToken, accountId } = tokens

  try {
    const params = new URLSearchParams({
      includeMetadata: "true",
      platform: "Windows",
      ...(cursor && { cursor }),
    })

    const response = await fetch(
      `https://library-service.live.use1a.on.epicgames.com/library/api/public/items?${params}`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
        },
      }
    )

    if (!response.ok) {
      const err = await response.text()
      console.error("[epic/library] error:", err)
      return NextResponse.json(
        { error: `Epic API error: ${response.status} ${err}` },
        { status: response.status }
      )
    }

    const data = await response.json()

    return NextResponse.json({
      success: true,
      accountId,
      itemsCount: data.records?.length ?? 0,
      items: data.records ?? [],
      cursor: data.pageNumerator || data.pageNumber || null,
      hasMore: data.hasMore || false,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[epic/library] error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
