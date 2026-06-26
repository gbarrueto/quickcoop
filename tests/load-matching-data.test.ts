import { beforeEach, describe, expect, it, vi } from "vitest"
import type { StoredUserProfile } from "../types"

vi.mock("../lib/api", () => ({
  fetchSteamOwnedGames: vi.fn(),
  fetchSteamFriends: vi.fn(),
  fetchSteamGameDetails: vi.fn(),
  fetchEpicLibrary: vi.fn(),
  fetchEpicFriends: vi.fn(),
  fetchEpicGameDetails: vi.fn(),
  fetchGamePassCatalog: vi.fn(),
  resolveQcoopIdentities: vi.fn(),
  epicGameToCard: (game: { id: string; title: string; keyImages?: Array<{ type: string; url: string }> }) => ({
    appId: Number.parseInt(game.id, 10) || 0,
    name: game.title,
    imageUrl: game.keyImages?.[0]?.url ?? "",
    rating: 0,
    players: "1+",
    platform: "epic",
  }),
  gamePassGameToCard: (game: { id: string; title: string; imageUrl: string }) => ({
    appId: Number.parseInt(game.id, 10) || 0,
    name: game.title,
    imageUrl: game.imageUrl,
    rating: 0,
    players: "1+",
    platform: "xbox",
  }),
}))

import {
  fetchEpicFriends,
  fetchEpicGameDetails,
  fetchEpicLibrary,
  fetchGamePassCatalog,
  fetchSteamFriends,
  fetchSteamGameDetails,
  fetchSteamOwnedGames,
  resolveQcoopIdentities,
} from "../lib/api"
import { loadMatchingData } from "../lib/matching/load-matching-data"

describe("loadMatchingData", () => {
  beforeEach(() => {
    vi.resetAllMocks()
  })

  it("loads user libraries, friends and platform flags from the stored profile", async () => {
    vi.mocked(fetchSteamOwnedGames).mockResolvedValue({
      data: {
        response: {
          games: [{ appid: 730, name: "Counter-Strike 2", playtime_forever: 120 }],
        },
      },
    })
    vi.mocked(fetchSteamFriends).mockResolvedValue({
      friends: [{ steamId: "friend-steam", name: "Steam Friend" }],
    })
    vi.mocked(fetchSteamGameDetails).mockResolvedValue({ games: [] })
    vi.mocked(fetchEpicGameDetails).mockResolvedValue({ games: [] })
    vi.mocked(fetchEpicLibrary).mockResolvedValue({
      games: [{ id: "1091500", title: "Cyberpunk 2077", keyImages: [{ type: "Thumbnail", url: "https://example.com/cp.jpg" }] }],
    })
    vi.mocked(fetchEpicFriends).mockResolvedValue({
      friends: [{ accountId: "friend-epic", displayName: "Epic Friend" }],
    })
    vi.mocked(resolveQcoopIdentities).mockResolvedValue([{ accountId: "friend-epic", username: "epic_friend_qcoop" }])
    vi.mocked(fetchGamePassCatalog).mockResolvedValue({
      games: [{ id: "1172470", title: "Apex Legends", imageUrl: "https://example.com/apex.jpg" }],
    })

    const profile: StoredUserProfile = {
      userId: "user-1",
      displayName: "User",
      connections: {
        steamId: "steam-123",
        epicAccountId: "epic-456",
        hasGamePass: true,
      },
      importedGames: [{ title: "Hades" }],
      friends: [
        {
          profileId: "profile:xbox:friend-pass",
          identities: [
            {
              platform: "xbox",
              accountId: "friend-pass",
              displayName: "Game Pass Friend",
            },
          ],
          connections: { steamId: null, epicAccountId: null, hasGamePass: true },
          selected: false,
          expanded: false,
          libraryAppIds: [252950],
          libraryTitles: ["Rocket League"],
        },
      ],
      updatedAt: Date.now(),
    }

    const result = await loadMatchingData(profile)

    expect(result.availablePlatforms).toEqual(["steam", "epic", "xbox"])
    expect(result.userGames).toHaveLength(2)
    expect(result.epicGames).toHaveLength(1)
    expect(result.gamePassGames).toHaveLength(1)
    expect(result.friendProfiles.some((friend) => friend.profileId === "profile:steam:friend-steam")).toBe(true)
    const epicFriend = result.epicFriends.find((friend) => friend.profileId === "profile:epic:friend-epic")
    expect(epicFriend).toBeDefined()
    expect(epicFriend?.identities[0]?.qcoopUsername).toBe("epic_friend_qcoop")
    expect(result.identityLibraries["xbox:friend-pass"]).toBeDefined()
    expect(result.playerSpecs).toBeNull()
  })

  it("does not load the Game Pass catalog as the user's library when their toggle is off, but still matches friends", async () => {
    vi.mocked(fetchGamePassCatalog).mockResolvedValue({
      games: [{ id: "1172470", title: "Apex Legends", imageUrl: "https://example.com/apex.jpg" }],
    })

    const profile: StoredUserProfile = {
      userId: "user-1",
      displayName: "User",
      connections: {
        steamId: null,
        epicAccountId: null,
        hasGamePass: false,
      },
      importedGames: [],
      friends: [
        {
          profileId: "profile:xbox:friend-pass",
          identities: [
            {
              platform: "xbox",
              accountId: "friend-pass",
              displayName: "Game Pass Friend",
            },
          ],
          connections: { steamId: null, epicAccountId: null, hasGamePass: true },
          selected: false,
          expanded: false,
          libraryAppIds: [],
          libraryTitles: [],
        },
      ],
      updatedAt: Date.now(),
    }

    const result = await loadMatchingData(profile)

    // The user opted out of Game Pass, so the catalog must not appear in their
    // own library (and therefore won't trigger per-game Steam enrichment)...
    expect(result.availablePlatforms).not.toContain("xbox")
    expect(result.gamePassGames).toHaveLength(0)
    // ...but the catalog is still merged into the friend's library for matching.
    expect(result.identityLibraries["xbox:friend-pass"].appIds.has(1172470)).toBe(true)
  })
})