"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useUserProfile } from "@/hooks/use-user-profile"
import { ensureStoredUserProfile } from "@/lib/user-profile"
import { persistSteamAccount } from "@/lib/steam/persist-account"
import type { AuthUser } from "@/types"
import { isAuthSessionMissingError, type User } from "@supabase/supabase-js"

export function useAuthSession() {
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data, error }) => {
      // Anonymous browsing is the default (see docs/anonymous-first-flow-plan.md),
      // so "no session" is an expected outcome here, not a failure to log.
      if (error && !isAuthSessionMissingError(error)) {
        console.error("[use-auth-session] getUser failed", error)
      }
      setAuthUser(data.user ?? null)
      setLoading(false)
    })

    const { data: listener } = supabase.auth.onAuthStateChange((_event, session) => {
      // Defer: calling supabase.from(...) here directly would deadlock, since
      // it awaits getSession() while signInWithPassword/signOut still hold
      // the auth lock that's dispatching this event.
      setTimeout(() => {
        setAuthUser(session?.user ?? null)
      }, 0)
    })

    return () => listener.subscription.unsubscribe()
  }, [])

  useEffect(() => {
    // Carries an anonymously-connected Steam account into the BDD the moment
    // a session appears — covers login/register AND the email-confirmation
    // redirect, where there's no single call site to hook the migration into
    // (see docs/anonymous-first-flow-plan.md section 3).
    if (!authUser) {
      return
    }

    const steamId = ensureStoredUserProfile().connections.steamId
    if (steamId) {
      persistSteamAccount(steamId).catch((error) => {
        console.error("[use-auth-session] failed to persist Steam account", error)
      })
    }
  }, [authUser])

  const { data: profile } = useUserProfile(authUser?.id)

  const currentUser: AuthUser | null = authUser
    ? {
        id: authUser.id,
        name: profile?.username ?? authUser.email?.split("@")[0] ?? "Player",
        email: authUser.email ?? "",
      }
    : null

  const logout = async () => {
    const supabase = createClient()
    await supabase.auth.signOut()
    setAuthUser(null)
  }

  return { currentUser, logout, loading }
}
