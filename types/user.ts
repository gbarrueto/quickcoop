import type { StoredFriendProfile } from "./friend"
import { ImportGame } from "./game"

export type ConnectedAccounts = {
  steamId: string | null
  epicAccountId: string | null
  hasGamePass: boolean
}

export type StoredPlayerSpecs = {
  os: string
  cpuTier: number
  gpuTier: number
  ramGb: number
  vramGb: number
  storageGb: number
}

export type StoredUserProfile = {
  userId: string
  displayName: string
  connections: ConnectedAccounts
  importedGames: ImportGame[]
  friends: StoredFriendProfile[]
  playerSpecs?: StoredPlayerSpecs
  updatedAt: number
}
