import type { EpicGameDetails, EpicGameDetailsPayload, GameCard } from "@/types"
import { hashIdFromString } from "@/lib/matching/game-utils"

export type EpicFriend = {
  accountId: string
  displayName: string | null
}

export type EpicFriendsPayload = {
  friends?: EpicFriend[]
  error?: string
}

async function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>
}

export async function fetchEpicFriends(accountId: string) {
  const response = await fetch(`/api/epic/friends?accountId=${accountId}`)
  if (!response.ok) {
    return null
  }

  return parseJson<EpicFriendsPayload>(response)
}

export function epicGameDetailsToCard(game: EpicGameDetails): GameCard {
  return {
    appId: hashIdFromString(game.catalogItemId ?? game.namespace),
    name: game.title,
    imageUrl: game.imageUrl ?? "",
    rating: 0,
    players: "1+",
    platform: "epic",
    tags: game.tags,
  }
}

export async function fetchEpicGameDetails() {
  const response = await fetch("/api/epic/game-details")
  if (!response.ok) {
    return null
  }

  return parseJson<EpicGameDetailsPayload>(response)
}
