// Carries an anonymous, ephemeral Epic session over into the BDD the moment a
// user logs in or registers, so they never have to reconnect Epic after
// creating a qcoop account. See docs/anonymous-first-flow-plan.md section 3.

import { cookies } from "next/headers"
import { saveEpicTokens } from "@/lib/epic/token-store"
import {
  EPIC_EPHEMERAL_SESSION_COOKIE,
  deleteEphemeralEpicSession,
  getEphemeralEpicSession,
} from "@/lib/epic/ephemeral-session"

export async function migrateEphemeralEpicSession(userId: string): Promise<void> {
  const cookieStore = await cookies()
  const sessionId = cookieStore.get(EPIC_EPHEMERAL_SESSION_COOKIE)?.value
  const session = await getEphemeralEpicSession(sessionId)

  if (!session) {
    return
  }

  try {
    await saveEpicTokens(userId, {
      accountId: session.accountId,
      displayName: session.displayName,
      accessToken: session.accessToken,
      refreshToken: session.refreshToken,
      expiresAt: session.expiresAt,
    })

    await deleteEphemeralEpicSession(sessionId)
    cookieStore.delete(EPIC_EPHEMERAL_SESSION_COOKIE)
  } catch (error) {
    // Most likely this Epic account is already linked to a different qcoop
    // user (unique violation). Leave the ephemeral session intact so the
    // anonymous connection keeps working even though it couldn't persist.
    console.error("[epic] failed to migrate ephemeral session for user", userId, error)
  }
}
