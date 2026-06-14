import { NextRequest, NextResponse } from "next/server"
import { createEpicSession, EPIC_SESSION_COOKIE } from "@/lib/epic-session"

const EPIC_TOKEN_ENDPOINT = "https://account-public-service-prod03.ol.epicgames.com/account/api/oauth/token"

function decodeJwtPayload(token: string) {
  const parts = token.split(".")
  if (parts.length !== 3) throw new Error("Invalid JWT format")
  const payload = parts[1]
  const decoded = Buffer.from(payload, "base64").toString("utf-8")
  return JSON.parse(decoded)
}

async function exchangeCodeForToken(code: string) {
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
      token_type: "eg1",
    }),
  })

  if (!response.ok) {
    const err = await response.text()
    throw new Error(`Token exchange failed (${response.status}): ${err}`)
  }

  return response.json()
}

export async function POST(request: NextRequest) {
  try {
    const { authorizationCode } = await request.json()

    if (!authorizationCode || typeof authorizationCode !== "string") {
      return NextResponse.json(
        { error: "Missing or invalid authorizationCode" },
        { status: 400 }
      )
    }

    if (!process.env.EPIC_CLIENT_ID || !process.env.EPIC_CLIENT_SECRET) {
      return NextResponse.json(
        { error: "Epic credentials not configured" },
        { status: 500 }
      )
    }

    console.log("[epic/auth/token-exchange] exchanging code for token")

    const tokenResponse = await exchangeCodeForToken(authorizationCode)
    const payload = decodeJwtPayload(tokenResponse.access_token)
    const accountId = payload.sub
    const displayName = payload.dn

    console.log("[epic/auth/token-exchange] authenticated user:", { accountId, displayName })

    // Epic eg1 access tokens are large JWTs (>4KB) and exceed the browser cookie
    // size limit, so we store them server-side and only set a small session cookie.
    const sessionId = createEpicSession({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      accountId,
      displayName,
      expiresAt: Date.now() + (tokenResponse.expires_in ?? 0) * 1000,
    })

    const response = NextResponse.json({
      success: true,
      accountId,
      displayName,
      expiresIn: tokenResponse.expires_in,
    })

    response.cookies.set(EPIC_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 2592000, // 30 days
    })

    // Account id is also exposed (non-httpOnly) for UI purposes.
    response.cookies.set("epic-account-id", accountId, {
      httpOnly: false,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 2592000,
    })

    return response
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[epic/auth/token-exchange] error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
