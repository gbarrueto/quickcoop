import { NextRequest, NextResponse } from "next/server"
import { RelyingParty } from "openid"

const STEAM_OPENID_ENDPOINT = "https://steamcommunity.com/openid"

function getOrigin(request: NextRequest): string {
  return new URL(request.url).origin
}

function createRelyingParty(origin: string) {
  return new RelyingParty(`${origin}/api/steam/callback`, origin, true, true, [])
}

function authenticateWithSteam(rp: RelyingParty): Promise<string> {
  return new Promise((resolve, reject) => {
    rp.authenticate(STEAM_OPENID_ENDPOINT, false, (error, authUrl) => {
      if (error || !authUrl) {
        reject(error ?? new Error("Steam OpenID did not return an authentication URL"))
        return
      }
      resolve(authUrl)
    })
  })
}

export async function GET(request: NextRequest) {
  try {
    const rp = createRelyingParty(getOrigin(request))
    const authUrl = await authenticateWithSteam(rp)
    return NextResponse.redirect(authUrl)
  } catch (error) {
    const message = error instanceof Error ? error.message : "Unknown Steam OpenID error"
    return NextResponse.json({ error: message }, { status: 500 })
  }
}
