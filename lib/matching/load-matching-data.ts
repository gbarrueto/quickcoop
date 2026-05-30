import {
  epicGameToCard,
  fetchEpicFriends,
  fetchEpicLibrary,
  fetchGamePassCatalog,
  fetchSteamFriends,
  fetchSteamOwnedGames,
  gamePassGameToCard,
} from "@/lib/api"
import {
  buildIdentityLibrariesFromFriends,
  identityKey,
  mergeFriendProfiles,
  mergeLibrarySnapshots,
  snapshotFromStoredFriend,
  toFriendProfile,
  toLibrarySnapshot,
} from "@/lib/matching/friend-utils"
import { toGameCards, toImportedGameCard } from "@/lib/matching/game-utils"
import type {
  FriendLibrarySnapshot,
  FriendProfile,
  GameCard,
  Platform,
  PlayerSystemSpecs,
  StoredUserProfile,
} from "@/types"

export type MatchingInitData = {
  availablePlatforms: Platform[]
  steamId: string | null
  epicAccountId: string | null
  hasGamePass: boolean
  userGames: GameCard[]
  epicGames: GameCard[]
  gamePassGames: GameCard[]
  friendProfiles: FriendProfile[]
  epicFriends: FriendProfile[]
  identityLibraries: Record<string, FriendLibrarySnapshot>
  playerSpecs: PlayerSystemSpecs | null
}

export async function loadMatchingData(profile: StoredUserProfile): Promise<MatchingInitData> {
  const platforms: Platform[] = []
  if (profile.connections.steamId) platforms.push("steam")
  if (profile.connections.epicAccountId) platforms.push("epic")
  if (profile.connections.hasGamePass) platforms.push("xbox")

  let userGames = profile.importedGames.map(toImportedGameCard)
  let epicGames: GameCard[] = []
  let gamePassGames: GameCard[] = []
  let friendProfiles = profile.friends.map(toFriendProfile)
  let epicFriends: FriendProfile[] = []
  let identityLibraries = buildIdentityLibrariesFromFriends(profile.friends)

  if (profile.connections.steamId) {
    const [gamesPayload, friendsPayload] = await Promise.all([
      fetchSteamOwnedGames(profile.connections.steamId),
      fetchSteamFriends(profile.connections.steamId),
    ])

    const ownedGames = gamesPayload.data?.response?.games ?? []
    userGames = [...userGames, ...toGameCards(ownedGames, "steam")]

    const steamProfiles: FriendProfile[] = (friendsPayload.friends ?? []).map((friend) => ({
      profileId: `profile:steam:${friend.steamId}`,
      identities: [
        {
          platform: "steam" as const,
          accountId: friend.steamId,
          displayName: friend.name,
          avatar: friend.avatar ?? null,
        },
      ],
      connections: {
        steamId: friend.steamId,
        epicAccountId: null,
        hasGamePass: false,
      },
      selected: false,
      expanded: false,
    }))

    friendProfiles = mergeFriendProfiles(friendProfiles, steamProfiles)
  }

  if (profile.connections.epicAccountId) {
    const [epicLibPayload, epicFriendsPayload] = await Promise.all([
      fetchEpicLibrary(profile.connections.epicAccountId),
      fetchEpicFriends(profile.connections.epicAccountId),
    ])

    if (epicLibPayload?.games) {
      epicGames = epicLibPayload.games.map(epicGameToCard)
    }

    if (epicFriendsPayload?.friends) {
      const epicProfiles: FriendProfile[] = epicFriendsPayload.friends.map((friend) => ({
        profileId: `profile:epic:${friend.accountId}`,
        identities: [
          {
            platform: "epic" as const,
            accountId: friend.accountId,
            displayName: friend.displayName,
            avatar: null,
          },
        ],
        connections: {
          steamId: null,
          epicAccountId: friend.accountId,
          hasGamePass: false,
        },
        selected: false,
        expanded: false,
      }))

      epicFriends = mergeFriendProfiles(epicFriends, epicProfiles)
    }
  }

  const hasGamePassFriend = profile.friends.some((friend) => friend.connections.hasGamePass)

  if (profile.connections.hasGamePass || hasGamePassFriend) {
    const gamePassPayload = await fetchGamePassCatalog()

    if (gamePassPayload?.games) {
      gamePassGames = gamePassPayload.games.map(gamePassGameToCard)

      if (hasGamePassFriend) {
        const gamePassSnapshot = toLibrarySnapshot(gamePassGames)

        identityLibraries = { ...identityLibraries }

        profile.friends.forEach((friend) => {
          if (!friend.connections.hasGamePass) {
            return
          }

          friend.identities.forEach((identity) => {
            identityLibraries[identityKey(identity)] = mergeLibrarySnapshots(
              identityLibraries[identityKey(identity)],
              snapshotFromStoredFriend(friend),
              gamePassSnapshot,
            )
          })
        })
      }
    }
  }

  return {
    availablePlatforms: platforms,
    steamId: profile.connections.steamId,
    epicAccountId: profile.connections.epicAccountId,
    hasGamePass: profile.connections.hasGamePass,
    userGames,
    epicGames,
    gamePassGames,
    friendProfiles,
    epicFriends,
    identityLibraries,
    playerSpecs: profile.playerSpecs ?? null,
  }
}
