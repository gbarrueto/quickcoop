"use client"

import { useEffect, useState } from "react"
import { searchSteamGame } from "@/lib/api"
import { loadMatchingData } from "@/lib/matching/load-matching-data"
import { ensureStoredUserProfile } from "@/lib/user-profile"
import { createClient } from "@/utils/supabase/client"
import { useUserProfile } from "@/hooks/use-user-profile"
import type { User } from "@supabase/supabase-js"
import type {
  AuthUser,
  FriendLibrarySnapshot,
  FriendProfile,
  GameCard,
  Platform,
  PlayerSystemSpecs,
} from "@/types"

export function useMatchingInit() {
  const [authUser, setAuthUser] = useState<User | null>(null)
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  const [steamId, setSteamId] = useState<string | null>(null)
  const [availablePlatforms, setAvailablePlatforms] = useState<Platform[]>([])
  const [epicAccountId, setEpicAccountId] = useState<string | null>(null)
  const [hasGamePass, setHasGamePass] = useState(false)

  const [userGames, setUserGames] = useState<GameCard[]>([])
  const [epicGames, setEpicGames] = useState<GameCard[]>([])
  const [gamePassGames, setGamePassGames] = useState<GameCard[]>([])
  const [friendProfiles, setFriendProfiles] = useState<FriendProfile[]>([])
  const [epicFriends, setEpicFriends] = useState<FriendProfile[]>([])
  const [identityLibraries, setIdentityLibraries] = useState<Record<string, FriendLibrarySnapshot>>({})
  const [playerSpecsById, setPlayerSpecsById] = useState<Record<string, PlayerSystemSpecs>>({})

  useEffect(() => {
    const initialize = async () => {
      // Matching never requires a qcoop account (see
      // docs/anonymous-first-flow-plan.md) — anonymous visitors load it from
      // their locally stored connections/imports same as registered users.
      const supabase = createClient()
      const { data } = await supabase.auth.getUser()
      setAuthUser(data.user)

      const profile = ensureStoredUserProfile()

      setLoading(true)
      setPageError(null)

      try {
        const data = await loadMatchingData(profile)

        setAvailablePlatforms(data.availablePlatforms)
        setSteamId(data.steamId)
        setEpicAccountId(data.epicAccountId)
        setHasGamePass(data.hasGamePass)
        setUserGames(data.userGames)
        setEpicGames(data.epicGames)
        setGamePassGames(data.gamePassGames)
        setFriendProfiles(data.friendProfiles)
        setEpicFriends(data.epicFriends)
        setIdentityLibraries(data.identityLibraries)

        if (data.playerSpecs) {
          setPlayerSpecsById((prev) => ({ ...prev, self: data.playerSpecs! }))
        }

        profile.importedGames.forEach(async ({ title }) => {
          try {
            const searchResult = await searchSteamGame(title)
            if (!searchResult?.imageUrl) return

            setUserGames((prev) =>
              prev.map((game) =>
                game.platform === "import" && game.name === title
                  ? { ...game, imageUrl: searchResult.imageUrl!, tags: searchResult.tags ?? [] }
                  : game,
              ),
            )
          } catch {
            // Silent background enrichment
          }
        })

        data.gamePassGames.forEach(async (card) => {
          try {
            const searchResult = await searchSteamGame(card.name)
            if (!searchResult?.tags?.length) return

            setGamePassGames((prev) =>
              prev.map((game) =>
                game.platform === "xbox" && game.name === card.name
                  ? { ...game, tags: searchResult.tags! }
                  : game,
              ),
            )
          } catch {
            // Silent background enrichment
          }
        })
      } catch (error) {
        setPageError(error instanceof Error ? error.message : "Failed to initialize matching view")
      } finally {
        setLoading(false)
      }
    }

    void initialize()
  }, [])

  const { data: profile } = useUserProfile(authUser?.id)

  const currentUser: AuthUser | null = authUser
    ? {
        id: authUser.id,
        name: profile?.username ?? authUser.email?.split("@")[0] ?? "Player",
        email: authUser.email ?? "",
      }
    : null

  return {
    currentUser,
    loading,
    pageError,
    steamId,
    availablePlatforms,
    epicAccountId,
    hasGamePass,
    userGames,
    epicGames,
    gamePassGames,
    friendProfiles,
    epicFriends,
    identityLibraries,
    playerSpecsById,
    setUserGames,
    setEpicGames,
    setGamePassGames,
    setFriendProfiles,
    setEpicFriends,
    setIdentityLibraries,
    setPlayerSpecsById,
  }
}
