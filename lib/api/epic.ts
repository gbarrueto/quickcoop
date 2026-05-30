import type { EpicGame, EpicLibraryPayload, GameCard } from "@/types"
import { hashIdFromString } from "@/lib/matching/game-utils"

export type EpicFriend = {
  accountId: string
  displayName: string
}

export type EpicFriendsPayload = {
  friends?: EpicFriend[]
  error?: string
}

async function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>
}

export function epicGameToCard(game: EpicGame): GameCard {
  return {
    appId: hashIdFromString(game.id),
    name: game.title,
    imageUrl:
      game.keyImages?.find((img) => img.type === "DieselGameBoxTall")?.url ??
      game.keyImages?.[0]?.url ??
      "",
    rating: 0,
    players: "1+",
    platform: "epic",
  }
}

export async function fetchEpicLibrary(accountId: string) {
  const response = await fetch(`/api/epic/library?accountId=${accountId}`)
  if (!response.ok) {
    return null
  }

  return parseJson<EpicLibraryPayload>(response)
}

export async function fetchEpicFriends(accountId: string) {
  const response = await fetch(`/api/epic/friends?accountId=${accountId}`)
  if (!response.ok) {
    return null
  }

  return parseJson<EpicFriendsPayload>(response)
}
