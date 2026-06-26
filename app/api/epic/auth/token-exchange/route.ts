import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { saveEpicTokens } from "@/lib/epic/token-store"

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
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()
    const user = userData.user

    if (!user) {
      return NextResponse.json(
        { error: "You must be signed in to connect an Epic Games account." },
        { status: 401 }
      )
    }

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

    const tokenResponse = await exchangeCodeForToken(authorizationCode)
    const payload = decodeJwtPayload(tokenResponse.access_token)
    const accountId = payload.sub
    const displayName = payload.dn

    await saveEpicTokens(user.id, {
      accountId,
      displayName,
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      tokenType: tokenResponse.token_type,
      expiresAt: Date.now() + (tokenResponse.expires_in ?? 0) * 1000,
    })

    return NextResponse.json({
      success: true,
      accountId,
      displayName,
      expiresIn: tokenResponse.expires_in,
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[epic/auth/token-exchange] error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
