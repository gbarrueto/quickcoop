"use client"

import { useCallback, useEffect, useState } from "react"
import { fetchSteamOwnedGames } from "@/lib/api"
import { identityKey, normalizeGameName } from "@/lib/matching"
import { updateStoredUserProfile } from "@/lib/user-profile"
import type { FriendLibrarySnapshot, FriendProfile, IdentityRef } from "@/types"

export function useIdentityLibrary(
  friendProfiles: FriendProfile[],
  identityLibraries: Record<string, FriendLibrarySnapshot>,
  setIdentityLibraries: React.Dispatch<
    React.SetStateAction<Record<string, FriendLibrarySnapshot>>
  >,
) {
  const [loadingIdentities, setLoadingIdentities] = useState<Record<string, boolean>>({})
  const [identityErrors, setIdentityErrors] = useState<Record<string, string | null>>({})

  const loadIdentityLibrary = useCallback(
    async (identity: IdentityRef) => {
      const key = identityKey(identity)

      if (identityLibraries[key] || loadingIdentities[key]) {
        return
      }

      if (identity.platform !== "steam") {
        return
      }

      setLoadingIdentities((prev) => ({ ...prev, [key]: true }))
      setIdentityErrors((prev) => ({ ...prev, [key]: null }))

      try {
        const payload = await fetchSteamOwnedGames(identity.accountId)
        const games = payload.data?.response?.games ?? []
        const appIds = games.map((game) => game.appid)
        const nameKeys = new Set(
          games
            .map((game) => normalizeGameName(game.name ?? `Steam App ${game.appid}`))
            .filter(Boolean),
        )

        setIdentityLibraries((prev) => ({
          ...prev,
          [key]: { appIds: new Set(appIds), nameKeys },
        }))

        updateStoredUserProfile((profile) => ({
          ...profile,
          friends: profile.friends.map((friend) =>
            friend.identities.some((current) => identityKey(current) === key)
              ? {
                  ...friend,
                  libraryAppIds: appIds,
                  libraryTitles: games.map((game) => game.name ?? `Steam App ${game.appid}`),
                }
              : friend,
          ),
        }))
      } catch (error) {
        setIdentityErrors((prev) => ({
          ...prev,
          [key]: error instanceof Error ? error.message : "Failed to load friend library",
        }))
      } finally {
        setLoadingIdentities((prev) => ({ ...prev, [key]: false }))
      }
    },
    [identityLibraries, loadingIdentities, setIdentityLibraries],
  )

  useEffect(() => {
    friendProfiles
      .filter((profile) => profile.selected)
      .forEach((profile) => {
        profile.identities.forEach((identity) => {
          void loadIdentityLibrary(identity)
        })
      })
  }, [friendProfiles, loadIdentityLibrary])

  return { loadingIdentities, identityErrors, loadIdentityLibrary }
}
