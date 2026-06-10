import { NextRequest, NextResponse } from "next/server"

const EPIC_TOKEN_ENDPOINT = "https://api.epicgames.dev/epic/oauth/v2/token"
const EPIC_FRIENDS_ENDPOINT = "https://api.epicgames.dev/epic/friends/v1"
const EOS_CONNECT_TOKEN_ENDPOINT = "https://api.epicgames.dev/auth/v1/oauth/token"

function decodeJwtPayload(token: string) {
  const parts = token.split(".")
  if (parts.length !== 3) throw new Error("Invalid JWT format")
  const payload = parts[1]
  const decoded = Buffer.from(payload, "base64").toString("utf-8")
  return JSON.parse(decoded)
}

function getOrigin(request: NextRequest): string {
  return new URL(request.url).origin
}

async function exchangeCodeForToken(code: string, redirectUri: string) {
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
      deploynment_id: process.env.EOS_DEPLOYMENT_ID || "",
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Token exchange failed (${response.status}): ${err}`)
  }

  return response.json()
}

async function getEosUserAccessToken(epicAccessToken: string) {
  if (!process.env.EOS_DEPLOYMENT_ID) {
    throw new Error("EOS_DEPLOYMENT_ID not configured in environment")
  }

  const credentials = Buffer.from(
    `${process.env.EPIC_CLIENT_ID}:${process.env.EPIC_CLIENT_SECRET}`
  ).toString("base64")

  const response = await fetch(EOS_CONNECT_TOKEN_ENDPOINT, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Authorization: `Basic ${credentials}`,
    },
    body: new URLSearchParams({
      grant_type: "external_auth",
      external_auth_type: "epicgames_access_token",
      external_auth_token: epicAccessToken,
      deployment_id: process.env.EOS_DEPLOYMENT_ID,
      nonce: crypto.randomUUID(),
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`EOS token exchange failed (${response.status}): ${err}`)
  }

  return response.json()
}

async function getFriends(accountId: string, accessToken: string) {
  const url = `${EPIC_FRIENDS_ENDPOINT}/${accountId}`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Friends API failed (${response.status}): ${err}`)
  }

  return response.json()
}

async function getEntitlements(accountId: string, accessToken: string) {
  const url = `${EPIC_ENTITLEMENTS_ENDPOINT}/${accountId}/entitlements`
  const response = await fetch(url, {
    headers: { Authorization: `Bearer ${accessToken}` },
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Entitlements API failed (${response.status}): ${err}`)
  }

  return response.json()
}

export async function GET(request: NextRequest) {
  try {
    const { searchParams } = new URL(request.url)
    const code = searchParams.get("code")
    const state = searchParams.get("state")
    const error = searchParams.get("error")

    if (error) {
      return NextResponse.json({ error }, { status: 400 })
    }

    if (!code) {
      return NextResponse.json({ error: "No authorization code received" }, { status: 400 })
    }

    const storedState = request.cookies.get("epic_oauth_state")?.value
    if (!storedState || storedState !== state) {
      return NextResponse.json({ error: "Invalid state parameter" }, { status: 400 })
    }

    console.log("[epic/callback] authorization code received")

    const origin = getOrigin(request)
    const tokenResponse = await exchangeCodeForToken(code, `${origin}/api/epic/callback`)

    const payload = decodeJwtPayload(tokenResponse.access_token)
    const accountId = payload.sub
    const displayName = payload.dn

    console.log("[epic/callback] authenticated user:", { accountId, displayName })

    // Llamar a endpoints de EOS
    console.log("[epic/callback] fetching friends...")
    const friendsData = await getFriends(accountId, tokenResponse.access_token)

    console.log("[epic/callback] friends:", friendsData)
    console.log("[epic/callback] response:", tokenResponse)
    console.log("[epic/callback] jwt payload:", payload)

    const friendsCount = friendsData?.friends?.length ?? 0

    const html = `<!doctype html>
      <html>
        <head><meta charset="utf-8" /><title>Epic OAuth · Friends</title></head>
        <body style="font-family: system-ui, sans-serif; padding: 24px; background:#111; color:#eee;">
          <h2>✅ Autenticación completada</h2>

          <section style="margin-bottom: 24px;">
            <h3>Usuario</h3>
            <ul>
              <li><strong>Account ID:</strong> <code>${accountId}</code></li>
              <li><strong>Display Name:</strong> <code>${displayName}</code></li>
            </ul>
          </section>

          <section style="margin-bottom: 24px;">
            <h3>JWT Payload</h3>
            <pre style="background:#000; padding:12px; border-radius:8px; word-break:break-all; white-space:pre-wrap; max-height:200px; overflow-y:auto;">${JSON.stringify(payload, null, 2)}</pre>
          </section>

          <section style="margin-bottom: 24px;">
            <h3>Access Token</h3>
            <pre style="background:#000; padding:12px; border-radius:8px; word-break:break-all; white-space:pre-wrap; max-height:150px; overflow-y:auto;">${tokenResponse.access_token}</pre>
          </section>

          <section style="margin-bottom: 24px;">
            <h3>Friends (${friendsCount})</h3>
            <pre style="background:#000; padding:12px; border-radius:8px; word-break:break-all; white-space:pre-wrap; max-height:300px; overflow-y:auto;">${JSON.stringify(friendsData, null, 2)}</pre>
          </section>

          <p style="margin-top: 24px;">Puedes cerrar esta ventana.</p>
        </body>
      </html>`

    const response = new NextResponse(html, {
      headers: { "Content-Type": "text/html" },
    })

    response.cookies.delete("epic_oauth_state")

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Epic callback error"
    console.error("[epic/callback] error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
