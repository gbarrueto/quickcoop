"use client"

import { useEffect, useState } from "react"
import { ensureStoredUserProfile, updateStoredUserProfile } from "@/lib/user-profile"

export function useLandingProfile() {
  const [hasGamePass, setHasGamePass] = useState<boolean | null>(null)
  const [xboxConnected, setXboxConnected] = useState(false)
  const [importedGames, setImportedGames] = useState<string[]>([])
  const [initialSteamId, setInitialSteamId] = useState<string | null>(null)
  const [initialEpicId, setInitialEpicId] = useState<string | null>(null)

  useEffect(() => {
    const profile = ensureStoredUserProfile()

    if (profile.connections.steamId) {
      setInitialSteamId(profile.connections.steamId)
    }

    if (profile.connections.epicAccountId) {
      setInitialEpicId(profile.connections.epicAccountId)
    }

    setHasGamePass(profile.connections.hasGamePass)
    setXboxConnected(profile.connections.hasGamePass)

    if (profile.importedGames.length > 0) {
      setImportedGames(profile.importedGames)
    }
  }, [])

  const toggleGamePass = () => {
    const next = !hasGamePass
    setHasGamePass(next)
    setXboxConnected(next)
    updateStoredUserProfile((profile) => ({
      ...profile,
      connections: {
        ...profile.connections,
        hasGamePass: next,
      },
    }))
    if (!next) {
      setXboxConnected(false)
    }
  }

  const confirmImport = (importText: string) => {
    const games = importText
      .split("\n")
      .map((game) => game.trim())
      .filter(Boolean)
    const mergedGames = Array.from(new Set([...importedGames, ...games]))

    setImportedGames(mergedGames)
    updateStoredUserProfile((profile) => ({
      ...profile,
      importedGames: mergedGames,
    }))
  }

  return {
    hasGamePass,
    xboxConnected,
    importedGames,
    initialSteamId,
    initialEpicId,
    toggleGamePass,
    confirmImport,
  }
}
