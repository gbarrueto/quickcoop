"use client"

import { useCallback, useEffect, useState } from "react"
import { isTrustedOAuthMessage, openAuthPopup } from "@/lib/auth/oauth-popup"
import { updateStoredUserProfile } from "@/lib/user-profile"

export function useSteamAuth(initialSteamId: string | null = null) {
  const [steamId, setSteamId] = useState<string | null>(initialSteamId)
  const [steamError, setSteamError] = useState<string | null>(null)
  const [isWaiting, setIsWaiting] = useState(false)

  useEffect(() => {
    if (initialSteamId) {
      setSteamId(initialSteamId)
    }
  }, [initialSteamId])

  const startAuth = useCallback(() => {
    setSteamError(null)
    setIsWaiting(true)

    const popup = openAuthPopup("/api/steam/login", "steam-openid-login")
    if (!popup) {
      setIsWaiting(false)
      setSteamError("Popup blocked. Please allow popups and try again.")
    }
  }, [])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isTrustedOAuthMessage(event)) {
        return
      }

      if (event.data.type === "steam-auth-success") {
        const resolvedSteamId = String(event.data.steamId || "")

        if (!resolvedSteamId) {
          setIsWaiting(false)
          setSteamError("Steam authentication finished but no steamId was returned.")
          return
        }

        setSteamId(resolvedSteamId)
        updateStoredUserProfile((profile) => ({
          ...profile,
          connections: {
            ...profile.connections,
            steamId: resolvedSteamId,
          },
        }))
        setIsWaiting(false)
      }

      if (event.data.type === "steam-auth-error") {
        setIsWaiting(false)
        setSteamError(event.data.error || "Steam authentication failed")
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  return { steamId, setSteamId, steamError, isWaiting, startAuth }
}
