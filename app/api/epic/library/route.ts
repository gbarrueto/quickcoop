import { NextRequest, NextResponse } from "next/server"

const EPIC_LIBRARY_ENDPOINT = "https://library-service.live.use1a.on.epicgames.com/library/api/public/items"

export async function GET(request: NextRequest) {
  const accessToken = request.cookies.get("epic_access_token")?.value
  const accountId = request.cookies.get("epic_account_id")?.value

  if (!accessToken || !accountId) {
    return NextResponse.json({ error: "Epic session not found" }, { status: 401 })
  }

  try {
    const response = await fetch(
      `${EPIC_LIBRARY_ENDPOINT}?includeMetadata=true`,
      {
        headers: {
          Authorization: `Bearer ${accessToken}`,
          "Content-Type": "application/json",
        },
      }
    )

    if (!response.ok) {
      const err = await response.text()
      throw new Error(`Epic library fetch failed: ${err}`)
    }

    const data = await response.json() as {
      records?: {
        catalogItemId: string
        namespace: string
        appName?: string
      }[]
    }

    // Filtra solo juegos (namespace no es "epic") y mapea al formato esperado
    const games = (data.records ?? [])
      .filter((record) => record.namespace !== "epic") // excluye items internos
      .map((record) => ({
        id: record.catalogItemId,
        title: record.appName ?? record.catalogItemId,
        keyImages: [],
      }))

    return NextResponse.json({ games })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}