import { describe, expect, it } from "vitest"
import { buildSelectedLibrarySets, filterSharedGames } from "../lib/matching/filter-utils"
import { identityKey, toLibrarySnapshot } from "../lib/matching/friend-utils"
import { dedupeGameCards, normalizeGameName } from "../lib/matching/game-utils"
import type { GameCard, FriendProfile, IdentityRef } from "../types"

describe("matching utilities", () => {
  it("normalizes game names into a stable key", () => {
    expect(normalizeGameName("Don't Starve Together!!")).toBe("don t starve together")
  })

  it("deduplicates games by platform and app id", () => {
    const games: GameCard[] = [
      {
        appId: 1,
        name: "Game A",
        imageUrl: "",
        rating: 0,
        players: "1",
        platform: "steam",
      },
      {
        appId: 1,
        name: "Game A duplicate",
        imageUrl: "",
        rating: 0,
        players: "1",
        platform: "steam",
      },
      {
        appId: 1,
        name: "Game A on Epic",
        imageUrl: "",
        rating: 0,
        players: "1",
        platform: "epic",
      },
    ]

    expect(dedupeGameCards(games)).toHaveLength(2)
  })

  it("builds selected library sets and filters shared games", () => {
    const steamIdentity: IdentityRef = {
      platform: "steam",
      accountId: "alice",
      displayName: "Alice",
    }

    const friendProfiles: FriendProfile[] = [
      {
        profileId: "profile:steam:alice",
        identities: [steamIdentity],
        connections: { steamId: "alice", epicAccountId: null, hasGamePass: false },
        selected: true,
        expanded: false,
      },
    ]

    const identityLibraries = {
      [identityKey(steamIdentity)]: toLibrarySnapshot([
        { appId: 10, name: "Shared Game" },
        { appId: 20, name: "Another Game" },
      ]),
    }

    const gamePassGames: GameCard[] = [
      {
        appId: 30,
        name: "Game Pass Game",
        imageUrl: "",
        rating: 0,
        players: "1",
        platform: "xbox",
      },
    ]

    const selectedSets = buildSelectedLibrarySets(friendProfiles, identityLibraries, gamePassGames, identityKey)

    const filtered = filterSharedGames(
      [
        { appId: 10, name: "Shared Game", imageUrl: "", rating: 0, players: "1", platform: "steam" },
        { appId: 40, name: "Not Shared", imageUrl: "", rating: 0, players: "1", platform: "steam" },
      ],
      selectedSets,
    )

    expect(selectedSets).toHaveLength(1)
    expect(filtered).toHaveLength(1)
    expect(filtered[0]?.appId).toBe(10)
  })
})