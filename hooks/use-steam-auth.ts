"use client"

import { useCallback, useEffect, useState } from "react"
import { isTrustedOAuthMessage, openAuthPopup } from "@/lib/auth/oauth-popup"
import { updateStoredUserProfile } from "@/lib/user-profile"
import { deleteSteamAccount, persistSteamAccount } from "@/lib/steam/persist-account"

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

        persistSteamAccount(resolvedSteamId).catch((error) => {
          setSteamError(error instanceof Error ? error.message : "Failed to save Steam connection")
        })
      }

      if (event.data.type === "steam-auth-error") {
        setIsWaiting(false)
        setSteamError(event.data.error || "Steam authentication failed")
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  const disconnect = useCallback(async () => {
    setSteamError(null)
    try {
      await deleteSteamAccount()
    } catch (error) {
      console.error("[use-steam-auth] failed to disconnect", error)
    }
    setSteamId(null)
    updateStoredUserProfile((profile) => ({
      ...profile,
      connections: { ...profile.connections, steamId: null },
    }))
  }, [])

  return { steamId, setSteamId, steamError, isWaiting, startAuth, disconnect }
}
