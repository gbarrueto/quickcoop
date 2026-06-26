"use client"

import { useEffect, useState } from "react"
import { ensureStoredUserProfile, updateStoredUserProfile } from "@/lib/user-profile"
import { ImportGame } from "@/types/game"

export function useLandingProfile() {
  const [hasGamePass, setHasGamePass] = useState<boolean | null>(null)
  const [xboxConnected, setXboxConnected] = useState(false)
  const [importedGames, setImportedGames] = useState<ImportGame[]>([])
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

  const confirmImport = (importGames: ImportGame[]) => {
    const mergedGames = Array.from(new Set([...importedGames, ...importGames]))

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
