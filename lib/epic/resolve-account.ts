// Dual resolution for routes that need the caller's Epic access token: try the
// logged-in qcoop user's persisted (BDD) account first, then fall back to the
// anonymous, ephemeral session. See docs/anonymous-first-flow-plan.md section 4.

import { cookies } from "next/headers"
import { createClient } from "@/utils/supabase/server"
import { getEpicTokens } from "@/lib/epic/token-store"
import { EPIC_EPHEMERAL_SESSION_COOKIE, getEphemeralEpicSession } from "@/lib/epic/ephemeral-session"

export type ResolvedEpicAccount = {
  accessToken: string
  accountId: string
  displayName: string | null
}

export async function resolveEpicAccount(): Promise<ResolvedEpicAccount | null> {
  const supabase = await createClient()
  const { data: userData } = await supabase.auth.getUser()

  if (userData.user) {
    const tokens = await getEpicTokens(userData.user.id)
    if (tokens) {
      return { accessToken: tokens.accessToken, accountId: tokens.accountId, displayName: tokens.displayName }
    }
  }

  const cookieStore = await cookies()
  const session = await getEphemeralEpicSession(cookieStore.get(EPIC_EPHEMERAL_SESSION_COOKIE)?.value)
  if (session) {
    return { accessToken: session.accessToken, accountId: session.accountId, displayName: session.displayName }
  }

  return null
}
