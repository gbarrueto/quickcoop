// Simple in-memory session store for Epic tokens.
// Epic eg1 access tokens are large JWTs (>4KB) that exceed the browser cookie
// size limit, so we keep them server-side keyed by a small session id cookie.
//
// The Map is stored on globalThis so it survives Next.js dev HMR reloads and is
// shared across route handler modules. For production this should be swapped for
// a real persistence layer (DB / Redis).

export type EpicSession = {
  accessToken: string
  refreshToken: string
  accountId: string
  displayName: string
  expiresAt: number
}

const globalForEpic = globalThis as unknown as {
  __epicSessions?: Map<string, EpicSession>
}

const sessions: Map<string, EpicSession> =
  globalForEpic.__epicSessions ?? (globalForEpic.__epicSessions = new Map())

export function createEpicSession(session: EpicSession): string {
  const sessionId = crypto.randomUUID()
  sessions.set(sessionId, session)
  return sessionId
}

export function getEpicSession(sessionId: string | undefined): EpicSession | null {
  if (!sessionId) return null
  return sessions.get(sessionId) ?? null
}

export function deleteEpicSession(sessionId: string | undefined): void {
  if (sessionId) sessions.delete(sessionId)
}

export const EPIC_SESSION_COOKIE = "epic-session-id"
