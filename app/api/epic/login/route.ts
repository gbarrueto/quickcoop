import { NextRequest, NextResponse } from "next/server"

const EPIC_AUTH_ENDPOINT = "https://www.epicgames.com/id/authorize"

function getOrigin(request: NextRequest): string {
  return new URL(request.url).origin
}

function generateState(): string {
  return crypto.randomUUID()
}

function buildEpicAuthUrl(origin: string, state: string): string {
  const params = new URLSearchParams({
    client_id: process.env.EPIC_CLIENT_ID!,
    redirect_uri: `${origin}/api/epic/callback`,
    response_type: "code",
    scope: "basic_profile",
    state,
  })

  return `${EPIC_AUTH_ENDPOINT}?${params.toString()}`
}

export async function GET(request: NextRequest) {
  try {
    const origin = getOrigin(request)
    const state = generateState()

    const authUrl = buildEpicAuthUrl(origin, state)

    const response = NextResponse.redirect(authUrl)

    // Guardar state en cookie para verificarlo en el callback (previene CSRF)
    response.cookies.set("epic_oauth_state", state, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 10, // 10 minutos
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Epic OAuth error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}