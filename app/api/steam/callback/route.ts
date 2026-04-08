import { NextRequest, NextResponse } from "next/server"
import { RelyingParty } from "openid"

function getOrigin(request: NextRequest): string {
  return new URL(request.url).origin
}

function createRelyingParty(origin: string) {
  return new RelyingParty(`${origin}/api/steam/callback`, origin, true, true, [])
}

function verifyAssertion(rp: RelyingParty, request: NextRequest) {
  return new Promise<{ authenticated?: boolean; claimedIdentifier?: string }>((resolve, reject) => {
    rp.verifyAssertion(request, (error, result) => {
      if (error) {
        reject(error)
        return
      }
      resolve(result ?? {})
    })
  })
}

function htmlBridge(origin: string, payload: { type: string; steamId?: string; error?: string }) {
  const payloadText = JSON.stringify(payload)
  return `<!doctype html>
<html>
  <head>
    <meta charset="utf-8" />
    <title>Steam Auth Callback</title>
  </head>
  <body>
    <script>
      (function () {
        const payload = ${payloadText};
        if (window.opener) {
          window.opener.postMessage(payload, ${JSON.stringify(origin)});
        }
        window.close();
      })();
    </script>
    <p>Authentication completed. You can close this window.</p>
  </body>
</html>`
}

function extractSteamId(claimedIdentifier?: string): string | null {
  if (!claimedIdentifier) {
    return null
  }

  const steamIdMatch = claimedIdentifier.match(/\/(\d+)$/)
  return steamIdMatch?.[1] ?? null
}

export async function GET(request: NextRequest) {
  const origin = getOrigin(request)

  try {
    const rp = createRelyingParty(origin)
    const assertion = await verifyAssertion(rp, request)

    if (!assertion.authenticated) {
      return new NextResponse(htmlBridge(origin, { type: "steam-auth-error", error: "Steam authentication was not accepted." }), {
        headers: { "content-type": "text/html; charset=utf-8" },
      })
    }

    const steamId = extractSteamId(assertion.claimedIdentifier)
    if (!steamId) {
      return new NextResponse(htmlBridge(origin, { type: "steam-auth-error", error: "Unable to extract steamId from OpenID response." }), {
        headers: { "content-type": "text/html; charset=utf-8" },
      })
    }

    return new NextResponse(htmlBridge(origin, { type: "steam-auth-success", steamId }), {
      headers: { "content-type": "text/html; charset=utf-8" },
    })
  } catch (error) {
    const message = error instanceof Error ? error.message : "Steam callback verification failed"
    return new NextResponse(htmlBridge(origin, { type: "steam-auth-error", error: message }), {
      headers: { "content-type": "text/html; charset=utf-8" },
    })
  }
}
