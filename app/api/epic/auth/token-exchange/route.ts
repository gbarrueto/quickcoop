import { NextRequest, NextResponse } from "next/server"
import { createClient } from "@/utils/supabase/server"
import { saveEpicTokens } from "@/lib/epic/token-store"
import { EPIC_EPHEMERAL_SESSION_COOKIE, createEphemeralEpicSession } from "@/lib/epic/ephemeral-session"
import { DuplicateAccountLinkError } from "@/lib/external-accounts/duplicate-link-error"

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

    const tokenResponse = await exchangeCodeForToken(authorizationCode)
    const payload = decodeJwtPayload(tokenResponse.access_token)
    const accountId = payload.sub
    const displayName = payload.dn
    const expiresAt = Date.now() + (tokenResponse.expires_in ?? 0) * 1000

    // Connecting Epic never requires a qcoop account (see
    // docs/anonymous-first-flow-plan.md). Logged-in users persist straight to
    // the BDD; everyone else gets an ephemeral, cookie-keyed session that's
    // migrated to the BDD if/when they register (migrate-ephemeral-session.ts).
    const supabase = await createClient()
    const { data: userData } = await supabase.auth.getUser()

    if (userData.user) {
      await saveEpicTokens(userData.user.id, {
        accountId,
        displayName,
        accessToken: tokenResponse.access_token,
        refreshToken: tokenResponse.refresh_token,
        tokenType: tokenResponse.token_type,
        expiresAt,
      })

      return NextResponse.json({
        success: true,
        accountId,
        displayName,
        expiresIn: tokenResponse.expires_in,
      })
    }

    const sessionId = createEphemeralEpicSession({
      accessToken: tokenResponse.access_token,
      refreshToken: tokenResponse.refresh_token,
      accountId,
      displayName,
      expiresAt,
    })

    const response = NextResponse.json({
      success: true,
      accountId,
      displayName,
      expiresIn: tokenResponse.expires_in,
    })

    response.cookies.set(EPIC_EPHEMERAL_SESSION_COOKIE, sessionId, {
      httpOnly: true,
      secure: process.env.NODE_ENV === "production",
      sameSite: "lax",
      maxAge: 2592000, // 30 days
    })

    return response
  } catch (error) {
    if (error instanceof DuplicateAccountLinkError) {
      return NextResponse.json({ error: error.message }, { status: 409 })
    }
    const message = error instanceof Error ? error.message : "Unknown error"
    console.error("[epic/auth/token-exchange] error:", message)
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
