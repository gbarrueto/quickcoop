"use client"

import { useEffect, useState } from "react"
import { createClient } from "@/utils/supabase/client"
import { useUserProfile } from "@/hooks/use-user-profile"
import type { AuthUser } from "@/types"
import type { User } from "@supabase/supabase-js"

export function useAuthSession() {
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const supabase = createClient()

    supabase.auth.getUser().then(({ data, error }) => {
      if (error) {
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
