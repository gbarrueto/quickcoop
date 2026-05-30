"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { searchSteamGame } from "@/lib/api"
import { loadMatchingData } from "@/lib/matching/load-matching-data"
import { getCurrentMockUser, type MockUser } from "@/lib/mock-auth"
import { ensureStoredUserProfile } from "@/lib/user-profile"
import type {
  FriendLibrarySnapshot,
  FriendProfile,
  GameCard,
  Platform,
  PlayerSystemSpecs,
} from "@/types"

export function useMatchingInit() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<MockUser | null>(null)
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
      const loggedInUser = getCurrentMockUser()
      if (!loggedInUser) {
        router.push("/")
        return
      }

      setCurrentUser(loggedInUser)
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

        profile.importedGames.forEach(async (name) => {
          try {
            const searchResult = await searchSteamGame(name)
            if (!searchResult?.imageUrl) return

            setUserGames((prev) =>
              prev.map((game) =>
                game.platform === "import" && game.name === name
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
  }, [router])

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
