import type { StoredFriendProfile } from "./friend"

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
  importedGames: string[]
  friends: StoredFriendProfile[]
  playerSpecs?: StoredPlayerSpecs
  updatedAt: number
}
