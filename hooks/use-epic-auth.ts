"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { isTrustedOAuthMessage, openAuthPopup } from "@/lib/auth/oauth-popup"
import { updateStoredUserProfile } from "@/lib/user-profile"

// Public Epic Games Launcher client id (used by Playnite, Legendary, Heroic, etc.)
const EPIC_CLIENT_ID = "34a02cf8f4414e29b15921876da36f9a"

// Epic login that auto-redirects to the JSON endpoint exposing the authorizationCode.
const EPIC_LOGIN_URL = `https://www.epicgames.com/id/login?redirect_uri=${encodeURIComponent(
  `https://www.epicgames.com/id/api/redirect?clientId=${EPIC_CLIENT_ID}&responseType=code`
)}`

export function useEpicAuth(initialEpicId: string | null = null) {
  const [epicId, setEpicId] = useState<string | null>(initialEpicId)
  const [epicError, setEpicError] = useState<string | null>(null)
  const [isWaiting, setIsWaiting] = useState(false)
  const [popupClosed, setPopupClosed] = useState(false)
  const [extensionAvailable, setExtensionAvailable] = useState(false)

  const popupRef = useRef<Window | null>(null)
  const closePollRef = useRef<ReturnType<typeof setInterval> | null>(null)
  // True once we receive a code via the extension, so the popup-close handler
  // doesn't fall back to the manual paste flow.
  const codeReceivedRef = useRef(false)

  useEffect(() => {
    if (initialEpicId) {
      setEpicId(initialEpicId)
    }
  }, [initialEpicId])

  const clearClosePoll = useCallback(() => {
    if (closePollRef.current) {
      clearInterval(closePollRef.current)
      closePollRef.current = null
    }
  }, [])

  const submitAuthCode = useCallback(async (code: string) => {
    if (!code.trim()) {
      setEpicError("Authorization code cannot be empty")
      return
    }

    setEpicError(null)
    setIsWaiting(true)

    try {
      const response = await fetch("/api/epic/auth/token-exchange", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ authorizationCode: code.trim() }),
      })

      if (!response.ok) {
        const errorData = await response.json()
        throw new Error(errorData.error || "Token exchange failed")
      }

      const data = await response.json()
      setEpicId(data.accountId)
      updateStoredUserProfile((profile) => ({
        ...profile,
        connections: {
          ...profile.connections,
          epicAccountId: data.accountId,
        },
      }))
      setPopupClosed(false)
      setIsWaiting(false)
    } catch (error) {
      setEpicError(error instanceof Error ? error.message : "Authentication failed")
      setIsWaiting(false)
    }
  }, [])

  const startPopupAuth = useCallback(() => {
    setEpicError(null)
    setIsWaiting(true)
    setPopupClosed(false)
    codeReceivedRef.current = false

    // Open the Epic login directly (single popup).
    const popup = openAuthPopup(EPIC_LOGIN_URL, "epic-oauth-popup")
    if (!popup) {
      setIsWaiting(false)
      setEpicError("Popup blocked. Please allow popups and try again.")
      return
    }
    popupRef.current = popup

    // Detect when the popup is closed. With the extension this rarely fires
    // (we close it ourselves on code receipt); without it, this drives the
    // manual paste fallback.
    clearClosePoll()
    closePollRef.current = setInterval(() => {
      if (popup.closed) {
        clearClosePoll()
        if (!codeReceivedRef.current) {
          setIsWaiting(false)
          setPopupClosed(true)
        }
      }
    }, 500)
  }, [clearClosePoll])

  // Listen for messages from the browser extension (content-app.js).
  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (!isTrustedOAuthMessage(event)) {
        return
      }

      // Extension announces itself → enable automatic mode.
      if (event.data.type === "epic-ext-ready") {
        setExtensionAvailable(true)
        return
      }

      // Extension delivered the authorization code → finish automatically.
      if (event.data.type === "epic-auth-code" && event.data.code) {
        codeReceivedRef.current = true
        clearClosePoll()
        // Close the Epic popup we own.
        if (popupRef.current && !popupRef.current.closed) {
          popupRef.current.close()
        }
        setPopupClosed(false)
        submitAuthCode(event.data.code)
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [clearClosePoll, submitAuthCode])

  useEffect(() => clearClosePoll, [clearClosePoll])

  const reset = useCallback(() => {
    setEpicError(null)
    setIsWaiting(false)
    setPopupClosed(false)
    codeReceivedRef.current = false
    clearClosePoll()
  }, [clearClosePoll])

  const disconnect = useCallback(async () => {
    setEpicError(null)
    try {
      await fetch("/api/epic/auth/disconnect", { method: "POST" })
    } catch (error) {
      console.error("[use-epic-auth] failed to disconnect", error)
    }
    setEpicId(null)
    updateStoredUserProfile((profile) => ({
      ...profile,
      connections: { ...profile.connections, epicAccountId: null },
    }))
  }, [])

  return {
    epicId,
    setEpicId,
    epicError,
    isWaiting,
    popupClosed,
    extensionAvailable,
    startPopupAuth,
    submitAuthCode,
    reset,
    disconnect,
  }
}
