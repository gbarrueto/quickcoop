import type { GameCard, RecommendedGame } from "@/types"
import { RECOMMENDED_GAMES } from "./constants"
import { gameMatchKey, normalizeGameName } from "./game-utils"

const TOP_PLAYED_LIMIT = 3
const SIMILAR_RECOMMENDATION_LIMIT = 7

function uniqueTags(tags: string[] | undefined): string[] {
  return [...new Set((tags ?? []).map((tag) => tag.trim()).filter(Boolean))]
}

function getGameTags(game: GameCard, categoriesByApp: Record<number, string[]>): string[] {
  return uniqueTags([...(game.tags ?? []), ...(categoriesByApp[game.appId] ?? [])])
}

function toRecommendedGame(
  game: Pick<GameCard, "appId" | "name" | "imageUrl" | "rating">,
  categories: string[],
  fallbackCategory: string,
): RecommendedGame {
  const uniqueCategories = uniqueTags(categories)
  const primaryCategory = uniqueCategories[0] ?? fallbackCategory
  const secondaryCategory = uniqueCategories[1] ?? (primaryCategory === fallbackCategory ? "Library" : fallbackCategory)

  return {
    appId: game.appId,
    name: game.name,
    imageUrl: game.imageUrl,
    categories: [primaryCategory, secondaryCategory],
    rating: game.rating,
    description: `Most played game in your library. Strong match for ${primaryCategory.toLowerCase()} play.`,
    price: "Owned",
  }
}

function withCatalogDetails(game: RecommendedGame): RecommendedGame {
  const catalogGame = RECOMMENDED_GAMES.find((candidate) => candidate.appId === game.appId)
  if (!catalogGame) {
    return game
  }

  return {
    ...game,
    description: catalogGame.description,
    price: catalogGame.price,
  }
}

function sortByPlaytime(userGames: GameCard[]): GameCard[] {
  return [...userGames].sort((left, right) => {
    const rightPlaytime = right.playtimeMinutes ?? 0
    const leftPlaytime = left.playtimeMinutes ?? 0

    if (rightPlaytime !== leftPlaytime) {
      return rightPlaytime - leftPlaytime
    }

    return left.name.localeCompare(right.name)
  })
}

// Raw (non-normalized) tags from the user's most-played games — used as-is
// to query the real BDD catalog (tags there keep their original casing from
// Steam/Epic). Scoring against them still normalizes on both sides.
export function getTopPlayedTags(userGames: GameCard[], categoriesByApp: Record<number, string[]>): string[] {
  const mostPlayedGames = sortByPlaytime(userGames).slice(0, TOP_PLAYED_LIMIT)
  const rawTags = new Set<string>()
  mostPlayedGames.forEach((game) => {
    getGameTags(game, categoriesByApp).forEach((tag) => rawTags.add(tag))
  })
  return [...rawTags]
}

export function buildUserRecommendations(
  userGames: GameCard[],
  categoriesByApp: Record<number, string[]>,
  catalogCandidates: RecommendedGame[] = [],
): RecommendedGame[] {
  const sortedUserGames = sortByPlaytime(userGames)
  const mostPlayedGames = sortedUserGames.slice(0, TOP_PLAYED_LIMIT)
  const ownedKeys = new Set(userGames.map(gameMatchKey))
  const topGameKeys = new Set(mostPlayedGames.map(gameMatchKey))

  const topTags = new Set(getTopPlayedTags(userGames, categoriesByApp).map(normalizeGameName))

  const topPlayedRecommendations = mostPlayedGames.map((game) =>
    toRecommendedGame(game, getGameTags(game, categoriesByApp), "Most played"),
  )

  // Real catalog data first; the static pool only fills gaps when the BDD
  // doesn't have enough relevant games yet (on-demand population).
  const seenKeys = new Set<string>()
  const candidatePool = [...catalogCandidates, ...RECOMMENDED_GAMES].filter((game) => {
    const key = gameMatchKey(game)
    if (seenKeys.has(key)) {
      return false
    }
    seenKeys.add(key)
    return true
  })

  const scoredCandidates = candidatePool
    .filter((game) => !ownedKeys.has(gameMatchKey(game)) && !topGameKeys.has(gameMatchKey(game)))
    .map((game) => ({
      game,
      categoryScore: game.categories.reduce(
        (score, category) => score + (topTags.has(normalizeGameName(category)) ? 1 : 0),
        0,
      ),
    }))

  const similarRecommendations = scoredCandidates
    .sort((left, right) => {
      if (right.categoryScore !== left.categoryScore) {
        return right.categoryScore - left.categoryScore
      }

      if (right.game.rating !== left.game.rating) {
        return right.game.rating - left.game.rating
      }

      return left.game.name.localeCompare(right.game.name)
    })
    .slice(0, SIMILAR_RECOMMENDATION_LIMIT)
    .map(({ game }) => withCatalogDetails(game))

  return [...topPlayedRecommendations, ...similarRecommendations].map(withCatalogDetails)
}