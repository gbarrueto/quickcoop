import type { CorePlatform, Platform } from "./platform"
import type { ConnectedAccounts } from "./user"

export type FriendIdentity = {
  platform: CorePlatform
  accountId: string
  displayName: string
  avatar?: string | null
}

export type StoredFriendProfile = {
  profileId: string
  identities: FriendIdentity[]
  connections: ConnectedAccounts
  selected: boolean
  expanded: boolean
  libraryAppIds: number[]
  libraryTitles?: string[]
}

export type IdentityRef = {
  platform: Platform
  accountId: string
  displayName: string
  avatar?: string | null
  // Public qcoop username, when this provider account is also a registered
  // qcoop user (resolved via /api/identity/resolve). Null/undefined just
  // means "not on qcoop" or "not checked yet" — never a hard dependency.
  qcoopUsername?: string | null
}

export type FriendProfile = {
  profileId: string
  identities: IdentityRef[]
  connections: ConnectedAccounts
  selected: boolean
  expanded: boolean
}

export type FriendFromApi = {
  steamId: string
  name: string
  avatar?: string | null
}

export type FriendLibrarySnapshot = {
  appIds: Set<number>
  nameKeys: Set<string>
}
