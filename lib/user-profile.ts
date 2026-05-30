import { STORAGE_KEYS } from "@/lib/storage"
import type {
  ConnectedAccounts,
  FriendIdentity,
  StoredFriendProfile,
  StoredPlayerSpecs,
  StoredUserProfile,
} from "@/types"

export type {
  ConnectedAccounts,
  FriendIdentity,
  StoredFriendProfile,
  StoredPlayerSpecs,
  StoredUserProfile,
} from "@/types"

const USER_PROFILE_KEY = STORAGE_KEYS.userProfile
const STEAM_SESSION_KEY = STORAGE_KEYS.steamSession
const EPIC_SESSION_KEY = STORAGE_KEYS.epicSession
const XBOX_SESSION_KEY = STORAGE_KEYS.xboxSession
const MANUAL_GAMES_KEY = STORAGE_KEYS.manualGames

function createDefaultFriends(): StoredFriendProfile[] {
  return [
    {
      profileId: "profile:steam:default-alex",
      identities: [
        {
          platform: "steam",
          accountId: "default-alex",
          displayName: "Alex (Steam)",
          avatar: null,
        },
      ],
      selected: false,
      expanded: false,
      libraryAppIds: [730, 553850, 252950, 1091500, 413150],
      libraryTitles: ["Counter-Strike 2", "Helldivers 2", "Rocket League", "Cyberpunk 2077", "Stardew Valley"],
      connections: {
        steamId: null,
        epicAccountId: null,
        hasGamePass: false,
      },
    },
    {
      profileId: "profile:epic:default-maya",
      identities: [
        {
          platform: "qcoop",
          accountId: "default-maya",
          displayName: "Maya (Epic)",
          avatar: null,
        },
      ],
      selected: false,
      expanded: false,
      libraryAppIds: [252950, 1091500, 322330, 413150],
      libraryTitles: ["Rocket League", "Cyberpunk 2077", "Don't Starve Together", "Stardew Valley"],
      connections: {
        steamId: null,
        epicAccountId: null,
        hasGamePass: false,
      },
    },
    {
      profileId: "profile:xbox:default-noah",
      identities: [
        {
          platform: "xbox",
          accountId: "default-noah",
          displayName: "Noah (Game Pass)",
          avatar: null,
        },
      ],
      selected: false,
      expanded: false,
      libraryAppIds: [1172470, 381210, 1091500, 252950],
      libraryTitles: ["Apex Legends", "Dead by Daylight", "Cyberpunk 2077"],
      connections: {
        steamId: null,
        epicAccountId: null,
        hasGamePass: true,
      },
    },
  ]
}

export function createDefaultUserProfile(): StoredUserProfile {
  return {
    userId: "default-user",
    displayName: "Usuario demo",
    connections: {
      steamId: null,
      epicAccountId: null,
      hasGamePass: false,
    },
    importedGames: ["Hades", "Deep Rock Galactic", "Baldur's Gate 3", "Cyberpunk 2077", "Rocket League"],
    friends: createDefaultFriends(),
    updatedAt: Date.now(),
  }
}

function readProfile(): StoredUserProfile | null {
  if (typeof window === "undefined") {
    return null
  }

  try {
    const raw = window.localStorage.getItem(USER_PROFILE_KEY)
    if (!raw) {
      return null
    }

    const parsed = JSON.parse(raw) as Partial<StoredUserProfile>
    if (!parsed.userId || !parsed.displayName || !parsed.connections || !parsed.friends) {
      return null
    }

    return {
      userId: parsed.userId,
      displayName: parsed.displayName,
      connections: {
        steamId: parsed.connections.steamId ?? null,
        epicAccountId: parsed.connections.epicAccountId ?? null,
        hasGamePass: Boolean(parsed.connections.hasGamePass),
      },
      importedGames: Array.isArray(parsed.importedGames) ? parsed.importedGames.filter(Boolean) : [],
      friends: Array.isArray(parsed.friends) ? parsed.friends : [],
      playerSpecs: parsed.playerSpecs ?? undefined,
      updatedAt: typeof parsed.updatedAt === "number" ? parsed.updatedAt : Date.now(),
    }
  } catch {
    return null
  }
}

function readLegacySessionSnapshot(): Partial<StoredUserProfile> {
  if (typeof window === "undefined") {
    return {}
  }

  const connections: ConnectedAccounts = {
    steamId: window.sessionStorage.getItem(STEAM_SESSION_KEY),
    epicAccountId: window.sessionStorage.getItem(EPIC_SESSION_KEY),
    hasGamePass: false,
  }

  try {
    const xboxRaw = window.sessionStorage.getItem(XBOX_SESSION_KEY)
    if (xboxRaw) {
      const parsed = JSON.parse(xboxRaw) as { hasGamePass?: boolean }
      connections.hasGamePass = Boolean(parsed.hasGamePass)
    }
  } catch {
    connections.hasGamePass = false
  }

  let importedGames: string[] = []
  try {
    const manualGamesRaw = window.sessionStorage.getItem(MANUAL_GAMES_KEY)
    if (manualGamesRaw) {
      importedGames = JSON.parse(manualGamesRaw) as string[]
    }
  } catch {
    importedGames = []
  }

  return {
    connections,
    importedGames,
  }
}

function persistProfile(profile: StoredUserProfile) {
  if (typeof window === "undefined") {
    return
  }

  try {
    window.localStorage.setItem(USER_PROFILE_KEY, JSON.stringify(profile))
  } catch {
    // Ignore storage quota and privacy errors so the UI keeps working.
  }
}

export function syncLegacySessionStorage(profile: StoredUserProfile) {
  if (typeof window === "undefined") {
    return
  }

  try {
    if (profile.connections.steamId) {
      window.sessionStorage.setItem(STEAM_SESSION_KEY, profile.connections.steamId)
    } else {
      window.sessionStorage.removeItem(STEAM_SESSION_KEY)
    }

    if (profile.connections.epicAccountId) {
      window.sessionStorage.setItem(EPIC_SESSION_KEY, profile.connections.epicAccountId)
    } else {
      window.sessionStorage.removeItem(EPIC_SESSION_KEY)
    }

    if (profile.connections.hasGamePass) {
      window.sessionStorage.setItem(XBOX_SESSION_KEY, JSON.stringify({ hasGamePass: true }))
    } else {
      window.sessionStorage.removeItem(XBOX_SESSION_KEY)
    }

    if (profile.importedGames.length > 0) {
      window.sessionStorage.setItem(MANUAL_GAMES_KEY, JSON.stringify(profile.importedGames))
    } else {
      window.sessionStorage.removeItem(MANUAL_GAMES_KEY)
    }
  } catch {
    // Ignore storage errors.
  }
}

export function ensureStoredUserProfile(): StoredUserProfile {
  const storedProfile = readProfile()
  const legacySnapshot = readLegacySessionSnapshot()

  if (storedProfile) {
    const nextProfile: StoredUserProfile = {
      ...storedProfile,
      connections: {
        steamId: storedProfile.connections.steamId ?? legacySnapshot.connections?.steamId ?? null,
        epicAccountId:
          storedProfile.connections.epicAccountId ?? legacySnapshot.connections?.epicAccountId ?? null,
        hasGamePass:
          storedProfile.connections.hasGamePass || Boolean(legacySnapshot.connections?.hasGamePass),
      },
      importedGames:
        storedProfile.importedGames.length > 0
          ? storedProfile.importedGames
          : legacySnapshot.importedGames ?? [],
    }

    persistProfile(nextProfile)
    syncLegacySessionStorage(nextProfile)
    return nextProfile
  }

  const defaultProfile = createDefaultUserProfile()
  const mergedProfile: StoredUserProfile = {
    ...defaultProfile,
    connections: {
      steamId: legacySnapshot.connections?.steamId ?? defaultProfile.connections.steamId,
      epicAccountId: legacySnapshot.connections?.epicAccountId ?? defaultProfile.connections.epicAccountId,
      hasGamePass: Boolean(legacySnapshot.connections?.hasGamePass || defaultProfile.connections.hasGamePass),
    },
    importedGames: legacySnapshot.importedGames?.length ? legacySnapshot.importedGames : defaultProfile.importedGames,
    updatedAt: Date.now(),
  }

  persistProfile(mergedProfile)
  syncLegacySessionStorage(mergedProfile)
  return mergedProfile
}

export function updateStoredUserProfile(
  updater: (profile: StoredUserProfile) => StoredUserProfile,
): StoredUserProfile {
  const currentProfile = ensureStoredUserProfile()
  const nextProfile = {
    ...updater(currentProfile),
    updatedAt: Date.now(),
  }

  persistProfile(nextProfile)
  syncLegacySessionStorage(nextProfile)
  return nextProfile
}