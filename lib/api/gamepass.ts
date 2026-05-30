import type { GameCard, GamePassGame, GamePassPayload } from "@/types"
import { hashIdFromString } from "@/lib/matching/game-utils"

async function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>
}

export function gamePassGameToCard(game: GamePassGame): GameCard {
  return {
    appId: hashIdFromString(game.id),
    name: game.title,
    imageUrl: game.imageUrl ?? "",
    rating: 0,
    players: "1+",
    platform: "xbox",
  }
}

export async function fetchGamePassCatalog() {
  const response = await fetch("/api/gamepass")
  if (!response.ok) {
    return null
  }

  return parseJson<GamePassPayload>(response)
}
