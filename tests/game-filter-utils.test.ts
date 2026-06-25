import { describe, expect, it } from "vitest"
import { buildSelectedLibrarySets, filterGamesByCategories, getAvailableCategories } from "../lib/matching/filter-utils"
import { identityKey } from "../lib/matching/friend-utils"
import { toGameCards, toImportedGameCard } from "../lib/matching/game-utils"
import type { FriendProfile, IdentityRef, GameCard, SteamOwnedGame } from "../types"

describe("game and filter utilities", () => {
  it("converts Steam owned games into game cards with generated metadata", () => {
    const ownedGames: SteamOwnedGame[] = [
      { appid: 730, name: "Counter-Strike 2", playtime_forever: 120 },
      { appid: 999999 },
    ]

    const cards = toGameCards(ownedGames, "steam")

    expect(cards).toHaveLength(2)
    expect(cards[0]).toMatchObject({
      appId: 730,
      name: "Counter-Strike 2",
      platform: "steam",
    })
    expect(cards[0].imageUrl).toContain("/steam/apps/730/header.jpg")
    expect(cards[1]).toMatchObject({
      appId: 999999,
      name: "Steam App 999999",
      platform: "steam",
    })
  })

  it("creates imported game cards with stable ids and defaults", () => {
    const imported = toImportedGameCard("  Hades  ")

    expect(imported.name).toBe("  Hades  ")
    expect(imported.platform).toBe("import")
    expect(imported.players).toBe("??")
    expect(imported.rating).toBe(0)
    expect(imported.appId).toBe(toImportedGameCard("Hades").appId)
  })

  it("merges selected libraries and keeps game pass games in scope", () => {
    const steamIdentity: IdentityRef = {
      platform: "steam",
      accountId: "alice",
      displayName: "Alice",
    }

    const gamePassProfile: FriendProfile = {
      profileId: "profile:xbox:pass",
      identities: [],
      connections: { steamId: null, epicAccountId: null, hasGamePass: true },
      selected: true,
      expanded: false,
    }

    const selectedProfiles: Array<Pick<FriendProfile, "identities" | "connections">> = [
      {
        identities: [steamIdentity],
        connections: { steamId: "alice", epicAccountId: null, hasGamePass: false },
      },
      {
        identities: gamePassProfile.identities,
        connections: gamePassProfile.connections,
      },
    ]

    const identityLibraries = {
      [identityKey(steamIdentity)]: {
        appIds: new Set([10, 11]),
        nameKeys: new Set(["shared game", "another game"]),
      },
    }

    const gamePassGames: GameCard[] = [
      {
        appId: 12,
        name: "Game Pass Game",
        imageUrl: "",
        rating: 0,
        players: "1",
        platform: "xbox",
      },
    ]

    const sets = buildSelectedLibrarySets(selectedProfiles, identityLibraries, gamePassGames, identityKey)

    expect(sets).toHaveLength(2)
    expect([...sets[0].appIds].sort()).toEqual([10, 11])
    expect([...sets[1].appIds].sort()).toEqual([12])
    expect([...sets[1].nameKeys]).toEqual(["game pass game"])
  })

  it("derives available categories and filters games in and/or mode", () => {
    const games: GameCard[] = [
      { appId: 1, name: "Game A", imageUrl: "", rating: 0, players: "1", platform: "steam" },
      { appId: 2, name: "Game B", imageUrl: "", rating: 0, players: "1", platform: "steam" },
      { appId: 3, name: "Game C", imageUrl: "", rating: 0, players: "1", platform: "steam" },
    ]

    const categoriesByApp = {
      1: ["Co-op", "Survival"],
      2: ["Co-op", "RPG"],
      3: ["Puzzle"],
    }

    expect(getAvailableCategories(games, categoriesByApp)).toEqual(["Co-op", "Puzzle", "RPG", "Survival"])

    expect(filterGamesByCategories(games, categoriesByApp, ["Co-op"], "or")).toHaveLength(2)
    expect(filterGamesByCategories(games, categoriesByApp, ["Co-op", "RPG"], "and")).toHaveLength(1)
    expect(filterGamesByCategories(games, categoriesByApp, [], "or")).toHaveLength(3)
  })
})