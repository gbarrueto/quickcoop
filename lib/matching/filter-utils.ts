import type { CategoryFilterMode, GameCard, IdentityRef } from "@/types"
import { gameMatchKey } from "./game-utils"

type FriendLibrarySet = {
  appIds: Set<number>
  nameKeys: Set<string>
}

export function filterSharedGames(
  allUserGames: GameCard[],
  selectedLibrarySets: FriendLibrarySet[],
): GameCard[] {
  if (selectedLibrarySets.length === 0) {
    return allUserGames
  }

  return allUserGames.filter((game) => {
    const key = gameMatchKey(game)
    return selectedLibrarySets.every(
      (librarySet) => librarySet.appIds.has(game.appId) || librarySet.nameKeys.has(key),
    )
  })
}

export function buildSelectedLibrarySets(
  selectedProfiles: Array<{
    identities: IdentityRef[]
    connections: { hasGamePass: boolean }
  }>,
  identityLibraries: Record<string, FriendLibrarySet>,
  gamePassGames: GameCard[],
  identityKeyFn: (identity: IdentityRef) => string,
): FriendLibrarySet[] {
  return selectedProfiles.map((profile) => {
    const mergedSet = new Set<number>()
    const mergedNameKeys = new Set<string>()

    profile.identities.forEach((identity) => {
      const library = identityLibraries[identityKeyFn(identity)]
      if (!library) {
        return
      }

      library.appIds.forEach((appId) => mergedSet.add(appId))
      library.nameKeys.forEach((nameKey) => mergedNameKeys.add(nameKey))
    })

    if (profile.connections.hasGamePass) {
      gamePassGames.forEach((game) => {
        mergedSet.add(game.appId)
        mergedNameKeys.add(gameMatchKey(game))
      })
    }

    return { appIds: mergedSet, nameKeys: mergedNameKeys }
  })
}

export function getAvailableCategories(
  games: GameCard[],
  categoriesByApp: Record<number, string[]>,
): string[] {
  const unique = new Set<string>()
  games.forEach((game) => {
    ;(categoriesByApp[game.appId] ?? []).forEach((category) => unique.add(category))
  })

  return [...unique].sort((a, b) => a.localeCompare(b))
}

export function filterGamesByCategories(
  games: GameCard[],
  categoriesByApp: Record<number, string[]>,
  selectedCategories: string[],
  mode: CategoryFilterMode,
): GameCard[] {
  if (selectedCategories.length === 0) {
    return games
  }

  return games.filter((game) => {
    const gameCategories = categoriesByApp[game.appId] ?? []
    if (mode === "and") {
      return selectedCategories.every((selectedCategory) => gameCategories.includes(selectedCategory))
    }

    return selectedCategories.some((selectedCategory) => gameCategories.includes(selectedCategory))
  })
}
