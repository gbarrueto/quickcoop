/** Centralized browser storage keys for QCoop. */

export const STORAGE_KEYS = {
  /** Persisted user profile (localStorage) */
  userProfile: "qcoop-user-profile",
  /** Mock auth users registry (localStorage) */
  mockUsers: "qcoop-mock-users",
  /** Mock auth session (localStorage) */
  mockSession: "qcoop-mock-session",
  /** Steam ID synced to sessionStorage for legacy compatibility */
  steamSession: "qcoop-steam-id",
  /** Epic account ID synced to sessionStorage for legacy compatibility */
  epicSession: "qcoop-epic-id",
  /** Xbox Game Pass flag synced to sessionStorage for legacy compatibility */
  xboxSession: "qcoop-xbox-gamepass",
  /** Manually imported game titles synced to sessionStorage for legacy compatibility */
  manualGames: "qcoop-manual-games",
  /** Client-side cache for trending multiplayer games (localStorage) */
  trendingCache: "qcoop-trending-multiplayer-cache",
} as const

/** @deprecated Legacy session keys — prefer STORAGE_KEYS.userProfile connections */
export const LEGACY_STORAGE_KEYS = {
  epicConnected: "qcoop-epic-connected",
  xboxConnected: "qcoop-xbox-connected",
} as const

export const STORAGE_TTL = {
  trendingCacheMs: 1000 * 60 * 60 * 24,
} as const
