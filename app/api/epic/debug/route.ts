import { NextRequest, NextResponse } from "next/server"
import { EPIC_SESSION_COOKIE, getEpicSession } from "@/lib/epic-session"

// DEBUG ONLY - exposes the stored Epic session (including tokens) for local testing.
// Remove before production.
export async function GET(request: NextRequest) {
  const sessionId = request.cookies.get(EPIC_SESSION_COOKIE)?.value
  const session = getEpicSession(sessionId)

  if (!session) {
    return NextResponse.json(
      { error: "No active session", sessionIdCookie: sessionId ?? null },
      { status: 401 }
    )
  }

  return NextResponse.json({
    sessionId,
    accountId: session.accountId,
    displayName: session.displayName,
    expiresAt: new Date(session.expiresAt).toISOString(),
    accessToken: session.accessToken,
    refreshToken: session.refreshToken,
  })
}
