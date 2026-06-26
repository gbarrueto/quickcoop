import type { EpicGame, EpicGameDetails, GamePassGame, SteamGameDetails, SteamOwnedGame } from "./game"
import type { FriendFromApi } from "./friend"

export type OwnedGamesPayload = {
  data?: {
    response?: {
      games?: SteamOwnedGame[]
    }
  }
  error?: string
}

export type EpicLibraryPayload = {
  games?: EpicGame[]
  error?: string
}

export type EpicGameDetailsPayload = {
  games?: EpicGameDetails[]
  error?: string
}

export type SteamGameDetailsPayload = {
  games?: SteamGameDetails[]
  error?: string
}

export type GamePassPayload = {
  games?: GamePassGame[]
  error?: string
}

export type GameCategoriesPayload = {
  categoriesByApp?: Record<string, string[]>
  error?: string
}

export type FriendsPayload = {
  friends?: FriendFromApi[]
  error?: string
}

export type GameRequirementsPayload = {
  appId: number
  minimumText: string
  parsed: {
    os?: string
    processor?: string
    graphics?: string
    memoryGb?: number
    storageGb?: number
    vramGb?: number
  }
  error?: string
}

export type SteamSearchPayload = {
  appId: number | null
  imageUrl: string | null
  tags?: string[]
}
