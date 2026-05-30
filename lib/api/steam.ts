import type {
  FriendsPayload,
  GameCategoriesPayload,
  GameRequirementsPayload,
  OwnedGamesPayload,
  SteamSearchPayload,
} from "@/types"

async function parseJson<T>(response: Response): Promise<T> {
  return response.json() as Promise<T>
}

export async function fetchSteamOwnedGames(steamId: string) {
  const response = await fetch(`/api/steam/owned-games?steamId=${steamId}`)
  const payload = await parseJson<OwnedGamesPayload>(response)

  if (!response.ok) {
    throw new Error(payload.error || "Failed to fetch Steam library")
  }

  return payload
}

export async function fetchSteamFriends(steamId: string) {
  const response = await fetch(`/api/steam/friends?steamId=${steamId}`)
  const payload = await parseJson<FriendsPayload>(response)

  if (!response.ok) {
    throw new Error(payload.error || "Failed to fetch Steam friends")
  }

  return payload
}

export async function searchSteamGame(term: string) {
  const response = await fetch(`/api/steam/search?term=${encodeURIComponent(term)}`)
  if (!response.ok) {
    return null
  }

  return parseJson<SteamSearchPayload>(response)
}

export async function fetchGameCategories(appIds: number[]) {
  const response = await fetch(`/api/steam/game-categories?appIds=${appIds.join(",")}`)
  const payload = await parseJson<GameCategoriesPayload>(response)

  if (!response.ok) {
    throw new Error(payload.error || "Failed to load game categories")
  }

  return payload
}

export async function fetchGameRequirements(appId: number, searchName?: string) {
  const params = new URLSearchParams({ appId: String(appId) })
  if (searchName) {
    params.set("searchName", searchName)
  }

  const response = await fetch(`/api/steam/game-requirements?${params.toString()}`)
  const payload = await parseJson<GameRequirementsPayload>(response)

  if (!response.ok) {
    throw new Error(payload.error || "Failed to load game requirements")
  }

  return payload
}
