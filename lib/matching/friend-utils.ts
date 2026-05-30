import type {
  FriendIdentity,
  FriendLibrarySnapshot,
  FriendProfile,
  IdentityRef,
  StoredFriendProfile,
} from "@/types"
import { normalizeGameName } from "./game-utils"

export function identityKey(identity: IdentityRef): string {
  return `${identity.platform}:${identity.accountId}`
}

export function toFriendProfile(profile: StoredFriendProfile): FriendProfile {
  return {
    profileId: profile.profileId,
    identities: profile.identities,
    connections: profile.connections,
    selected: profile.selected,
    expanded: profile.expanded,
  }
}

export function mergeFriendProfiles(existing: FriendProfile[], incoming: FriendProfile[]): FriendProfile[] {
  const next = [...existing]

  incoming.forEach((profile) => {
    const duplicate = next.some((current) => current.profileId === profile.profileId)
    if (!duplicate) {
      next.push(profile)
    }
  })

  return next
}

export function snapshotFromStoredFriend(profile: StoredFriendProfile): FriendLibrarySnapshot {
  return {
    appIds: new Set(profile.libraryAppIds),
    nameKeys: new Set((profile.libraryTitles ?? []).map(normalizeGameName).filter(Boolean)),
  }
}

export function toLibrarySnapshot(games: { appId: number; name: string }[]): FriendLibrarySnapshot {
  return {
    appIds: new Set(games.map((game) => game.appId)),
    nameKeys: new Set(games.map((game) => normalizeGameName(game.name))),
  }
}

export function mergeLibrarySnapshots(
  ...snapshots: Array<FriendLibrarySnapshot | undefined>
): FriendLibrarySnapshot {
  const appIds = new Set<number>()
  const nameKeys = new Set<string>()

  snapshots.forEach((snapshot) => {
    if (!snapshot) {
      return
    }

    snapshot.appIds.forEach((appId) => appIds.add(appId))
    snapshot.nameKeys.forEach((nameKey) => nameKeys.add(nameKey))
  })

  return { appIds, nameKeys }
}

export function buildIdentityLibrariesFromFriends(
  friends: StoredFriendProfile[],
): Record<string, FriendLibrarySnapshot> {
  return friends.reduce<Record<string, FriendLibrarySnapshot>>((acc, friend) => {
    const nameKeys = new Set((friend.libraryTitles ?? []).map(normalizeGameName).filter(Boolean))
    friend.identities.forEach((identity) => {
      acc[identityKey(identity)] = {
        appIds: new Set(friend.libraryAppIds),
        nameKeys,
      }
    })
    return acc
  }, {})
}

export function canMergeProfiles(
  source: FriendProfile,
  target: FriendProfile,
  connectedPlatformCount: number,
): { ok: true } | { ok: false; reason: string } {
  if (connectedPlatformCount < 2) {
    return { ok: false, reason: "Merging is enabled only when 2 or more platforms are connected." }
  }

  const sourcePlatforms = new Set(source.identities.map((identity) => identity.platform))
  const targetPlatforms = new Set(target.identities.map((identity) => identity.platform))
  const hasPlatformOverlap = [...sourcePlatforms].some((platform) => targetPlatforms.has(platform))

  if (hasPlatformOverlap) {
    return { ok: false, reason: "Merging between users from the same platform is not allowed." }
  }

  return { ok: true }
}

export function mergeProfileIdentities(source: FriendProfile, target: FriendProfile): IdentityRef[] {
  const mergedIdentities = [...target.identities]

  source.identities.forEach((identity) => {
    const exists = mergedIdentities.some(
      (current) => current.platform === identity.platform && current.accountId === identity.accountId,
    )

    if (!exists) {
      mergedIdentities.push(identity)
    }
  })

  return mergedIdentities
}

export function toStoredIdentities(identities: IdentityRef[]): FriendIdentity[] {
  return identities.filter((identity): identity is FriendIdentity => identity.platform !== "import")
}
