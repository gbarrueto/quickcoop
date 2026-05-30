"use client"

import { useCallback, useEffect, useState } from "react"
import { isTrustedOAuthMessage, openAuthPopup } from "@/lib/auth/oauth-popup"
import { updateStoredUserProfile } from "@/lib/user-profile"

export function useEpicAuth(initialEpicId: string | null = null) {
  const [epicId, setEpicId] = useState<string | null>(initialEpicId)
  const [epicError, setEpicError] = useState<string | null>(null)
  const [isWaiting, setIsWaiting] = useState(false)

  useEffect(() => {
    if (initialEpicId) {
      setEpicId(initialEpicId)
    }
  }, [initialEpicId])

  const startAuth = useCallback(() => {
    setEpicError(null)
    setIsWaiting(true)

    const popup = openAuthPopup("/api/epic/login", "epic-oauth-login")
    if (!popup) {
      setIsWaiting(false)
      setEpicError("Popup blocked. Please allow popups and try again.")
    }
  }, [])

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isTrustedOAuthMessage(event)) {
        return
      }

      if (event.data.type === "epic-auth-success") {
        const resolvedEpicId = String(event.data.epicAccountId || "")
        setEpicId(resolvedEpicId)
        updateStoredUserProfile((profile) => ({
          ...profile,
          connections: {
            ...profile.connections,
            epicAccountId: resolvedEpicId,
          },
        }))
        setIsWaiting(false)
      }

      if (event.data.type === "epic-auth-error") {
        setIsWaiting(false)
        setEpicError(event.data.error || "Epic authentication failed")
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  return { epicId, setEpicId, epicError, isWaiting, startAuth }
}
