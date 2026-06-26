// Ephemeral, in-memory store for Epic tokens belonging to a user who is NOT
// logged into qcoop. Connecting Epic must never require a qcoop account
// (see docs/anonymous-first-flow-plan.md), so anonymous sessions live here,
// keyed by a random session id cookie, instead of in the BDD.
//
// Epic eg1 access tokens are large JWTs (>4KB) that exceed the browser cookie
// size limit, so only the session id goes in the cookie. The Map is stored on
// globalThis so it survives Next.js dev HMR reloads. Accepted limitation: it
// is lost on a server restart/serverless cold start — registering persists
// the connection to the BDD instead (see migrate-ephemeral-session.ts).

export type EphemeralEpicSession = {
  accessToken: string
  refreshToken: string
  accountId: string
  displayName: string
  expiresAt: number
}

const globalForEpic = globalThis as unknown as {
  __epicEphemeralSessions?: Map<string, EphemeralEpicSession>
}

const sessions: Map<string, EphemeralEpicSession> =
  globalForEpic.__epicEphemeralSessions ?? (globalForEpic.__epicEphemeralSessions = new Map())

export function createEphemeralEpicSession(session: EphemeralEpicSession): string {
  const sessionId = crypto.randomUUID()
  sessions.set(sessionId, session)
  return sessionId
}

export function getEphemeralEpicSession(sessionId: string | undefined): EphemeralEpicSession | null {
  if (!sessionId) return null
  return sessions.get(sessionId) ?? null
}

export function deleteEphemeralEpicSession(sessionId: string | undefined): void {
  if (sessionId) sessions.delete(sessionId)
}

export const EPIC_EPHEMERAL_SESSION_COOKIE = "epic-session-id"
