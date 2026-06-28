// Shared, expiring store for Epic tokens belonging to a user who is NOT
// logged into qcoop. Connecting Epic must never require a qcoop account
// (see docs/anonymous-first-flow-plan.md), so anonymous sessions live here,
// keyed by a random session id cookie, instead of in the BDD.
//
// Backed by Upstash Redis (the REST client works over plain HTTPS, no
// persistent connection, which is what makes it safe to call from any
// serverless invocation). This used to be an in-memory Map on globalThis,
// but that only works as long as every request lands on the same server
// instance — which Vercel does not guarantee, especially for the two
// concurrent requests (game-details + friends) matching fires right after
// connecting. That mismatch caused intermittent 401s in production: each
// instance had its own, empty copy of the map. Redis is shared across every
// instance, so this is no longer instance-dependent.

import { Redis } from "@upstash/redis"

export type EphemeralEpicSession = {
  accessToken: string
  refreshToken: string
  accountId: string
  displayName: string
  expiresAt: number
}

// Vercel's Upstash marketplace integration namespaces these env vars with
// the integration name (QCOOP_) instead of the plain UPSTASH_REDIS_REST_*
// names Redis.fromEnv() looks for, so we read them explicitly.
const redis = new Redis({
  url: process.env.QCOOP_UPSTASH_KV_REST_API_URL!,
  token: process.env.QCOOP_UPSTASH_KV_REST_API_TOKEN!,
})

const KEY_PREFIX = "epic-session:"
// Matches the cookie's maxAge below — the underlying Epic access token
// expires long before this anyway, so this is just an upper bound.
const SESSION_TTL_SECONDS = 2592000 // 30 days

export async function createEphemeralEpicSession(session: EphemeralEpicSession): Promise<string> {
  const sessionId = crypto.randomUUID()
  // The client auto-(de)serializes JSON values, so we can store the object as-is.
  await redis.set(KEY_PREFIX + sessionId, session, { ex: SESSION_TTL_SECONDS })
  return sessionId
}

export async function getEphemeralEpicSession(sessionId: string | undefined): Promise<EphemeralEpicSession | null> {
  if (!sessionId) return null
  return await redis.get<EphemeralEpicSession>(KEY_PREFIX + sessionId)
}

export async function deleteEphemeralEpicSession(sessionId: string | undefined): Promise<void> {
  if (!sessionId) return
  await redis.del(KEY_PREFIX + sessionId)
}

export const EPIC_EPHEMERAL_SESSION_COOKIE = "epic-session-id"
