import { describe, expect, it } from "vitest"
import {
  buildIdentityLibrariesFromFriends,
  canMergeProfiles,
  identityKey,
  mergeFriendProfiles,
  mergeLibrarySnapshots,
  mergeProfileIdentities,
  snapshotFromStoredFriend,
  toFriendProfile,
  toStoredIdentities,
  toLibrarySnapshot,
} from "../lib/matching/friend-utils"
import type { FriendProfile, IdentityRef, StoredFriendProfile } from "../types"

describe("friend utilities", () => {
  it("creates deterministic identity keys", () => {
    const identity: IdentityRef = {
      platform: "steam",
      accountId: "alice",
      displayName: "Alice",
    }

    expect(identityKey(identity)).toBe("steam:alice")
  })

  it("converts stored profiles into runtime profiles", () => {
    const stored: StoredFriendProfile = {
      profileId: "profile:steam:alice",
      identities: [
        {
          platform: "steam",
          accountId: "alice",
          displayName: "Alice",
        },
      ],
      connections: { steamId: "alice", epicAccountId: null, hasGamePass: false },
      selected: true,
      expanded: false,
      libraryAppIds: [10],
      libraryTitles: ["Shared Game"],
    }

    expect(toFriendProfile(stored)).toEqual({
      profileId: stored.profileId,
      identities: stored.identities,
      connections: stored.connections,
      selected: true,
      expanded: false,
    })
  })

  it("builds and merges library snapshots by app id and normalized names", () => {
    const snapshotA = toLibrarySnapshot([
      { appId: 10, name: "Shared Game" },
      { appId: 11, name: "Another Game" },
    ])

    const snapshotB = snapshotFromStoredFriend({
      profileId: "profile:steam:bob",
      identities: [],
      connections: { steamId: null, epicAccountId: null, hasGamePass: false },
      selected: false,
      expanded: false,
      libraryAppIds: [11, 12],
      libraryTitles: ["another game", "New Game"],
    })

    const merged = mergeLibrarySnapshots(snapshotA, snapshotB)

    expect([...merged.appIds].sort()).toEqual([10, 11, 12])
    expect([...merged.nameKeys].sort()).toEqual(["another game", "new game", "shared game"])
  })

  it("merges friend profiles without duplicating ids and keeps imported identities out of storage", () => {
    const existing: FriendProfile[] = [
      {
        profileId: "profile:steam:alice",
        identities: [{ platform: "steam", accountId: "alice", displayName: "Alice" }],
        connections: { steamId: "alice", epicAccountId: null, hasGamePass: false },
        selected: false,
        expanded: false,
      },
    ]

    const incoming: FriendProfile[] = [
      {
        profileId: "profile:steam:alice",
        identities: [{ platform: "steam", accountId: "alice", displayName: "Alice" }],
        connections: { steamId: "alice", epicAccountId: null, hasGamePass: false },
        selected: true,
        expanded: true,
      },
      {
        profileId: "profile:epic:bob",
        identities: [{ platform: "epic", accountId: "bob", displayName: "Bob" }],
        connections: { steamId: null, epicAccountId: "bob", hasGamePass: false },
        selected: false,
        expanded: false,
      },
    ]

    const merged = mergeFriendProfiles(existing, incoming)

    expect(merged).toHaveLength(2)
    expect(merged.find((profile) => profile.profileId === "profile:steam:alice")).toBeDefined()

    expect(
      toStoredIdentities([
        { platform: "steam", accountId: "alice", displayName: "Alice" },
        { platform: "import", accountId: "manual", displayName: "Manual" },
      ]).map((identity) => identity.accountId),
    ).toEqual(["alice"])
  })

  it("checks whether profiles can be merged and merges identities without duplicates", () => {
    const source: FriendProfile = {
      profileId: "profile:steam:alice",
      identities: [{ platform: "steam", accountId: "alice", displayName: "Alice" }],
      connections: { steamId: "alice", epicAccountId: null, hasGamePass: false },
      selected: false,
      expanded: false,
    }

    const target: FriendProfile = {
      profileId: "profile:epic:bob",
      identities: [
        { platform: "epic", accountId: "bob", displayName: "Bob" },
        { platform: "steam", accountId: "alice", displayName: "Alice" },
      ],
      connections: { steamId: null, epicAccountId: "bob", hasGamePass: false },
      selected: false,
      expanded: false,
    }

    expect(canMergeProfiles(source, target, 1).ok).toBe(false)
    expect(canMergeProfiles(source, target, 2).ok).toBe(false)

    const mergeableTarget: FriendProfile = {
      ...target,
      identities: [{ platform: "epic", accountId: "bob", displayName: "Bob" }],
    }

    expect(canMergeProfiles(source, mergeableTarget, 2).ok).toBe(true)
    expect(mergeProfileIdentities(source, mergeableTarget)).toHaveLength(2)
  })
})