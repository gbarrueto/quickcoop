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
  const primaryCategory = categories[0] ?? fallbackCategory
  const secondaryCategory = categories[1] ?? categories[0] ?? fallbackCategory

  return {
    appId: game.appId,
    name: game.name,
    imageUrl: game.imageUrl,
    categories: [primaryCategory, secondaryCategory],
    rating: game.rating,
  }
}

export function buildUserRecommendations(
  userGames: GameCard[],
  categoriesByApp: Record<number, string[]>,
): RecommendedGame[] {
  const sortedUserGames = [...userGames].sort((left, right) => {
    const rightPlaytime = right.playtimeMinutes ?? 0
    const leftPlaytime = left.playtimeMinutes ?? 0

    if (rightPlaytime !== leftPlaytime) {
      return rightPlaytime - leftPlaytime
    }

    return left.name.localeCompare(right.name)
  })

  const mostPlayedGames = sortedUserGames.slice(0, TOP_PLAYED_LIMIT)
  const ownedKeys = new Set(userGames.map(gameMatchKey))
  const topGameKeys = new Set(mostPlayedGames.map(gameMatchKey))

  const topTags = new Set<string>()
  mostPlayedGames.forEach((game) => {
    getGameTags(game, categoriesByApp).forEach((tag) => topTags.add(normalizeGameName(tag)))
  })

  const topPlayedRecommendations = mostPlayedGames.map((game) =>
    toRecommendedGame(game, getGameTags(game, categoriesByApp), "Most played"),
  )

  const scoredCandidates = RECOMMENDED_GAMES.filter(
    (game) => !ownedKeys.has(gameMatchKey(game)) && !topGameKeys.has(gameMatchKey(game)),
  ).map((game) => ({
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
    .map(({ game }) => game)

  return [...topPlayedRecommendations, ...similarRecommendations]
}