import { NextRequest, NextResponse } from "next/server"

const EPIC_TOKEN_ENDPOINT = "https://api.epicgames.dev/epic/oauth/v2/token"
const EPIC_USERINFO_ENDPOINT = "https://api.epicgames.dev/epic/oauth/v2/userInfo"

function getOrigin(request: NextRequest): string {
  return new URL(request.url).origin
}

async function exchangeCodeForToken(
  code: string,
  redirectUri: string
): Promise<{ access_token: string; refresh_token: string }> {
  const credentials = Buffer.from(
    `${process.env.EPIC_CLIENT_ID}:${process.env.EPIC_CLIENT_SECRET}`
  ).toString("base64")

  const response = await fetch(EPIC_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "authorization_code",
      code,
      redirect_uri: redirectUri,
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Token exchange failed: ${err}`)
  }

  return response.json()
}

async function getEpicUserInfo(accessToken: string) {
  const response = await fetch(EPIC_USERINFO_ENDPOINT, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) throw new Error("Failed to fetch Epic user info")
  return response.json()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    // El usuario canceló o hubo error de Epic
    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    if (!code) {
      return NextResponse.json({ error: "No authorization code received" }, { status: 400 })
    }

    // Verificar state contra CSRF
    const storedState = request.cookies.get("epic_oauth_state")?.value
    if (!storedState || storedState !== state) {
      return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 })
    }

    const origin = getOrigin(request)
    const { access_token, refresh_token } = await exchangeCodeForToken(
      code,
      `${origin}/api/epic/callback`
    )

    const user = await getEpicUserInfo(access_token)
    // user.sub  → Epic Account ID
    // user.name → display name

    // Aquí guardas el usuario en tu DB/sesión según tu arquitectura
    console.log("Epic user connected:", user)

    const html = `
      <script>
        window.opener?.postMessage(
          { type: "epic-auth-success", epicAccountId: "${user.sub}", displayName: "${user.name}" },
          "${origin}"
        )
        window.close()
      </script>
    `
    const response = new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    })
    response.cookies.delete("epic_oauth_state")

    // Guarda el access token en cookie httpOnly para usarlo en las API routes
    response.cookies.set("epic_access_token", access_token, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8, // 8 horas
      path: "/",
    })
    response.cookies.set("epic_account_id", user.sub, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 60 * 60 * 8,
      path: "/",
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Epic callback error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}