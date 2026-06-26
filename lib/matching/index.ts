export { DEFAULT_PLAYER_SPECS, RECOMMENDED_GAMES, TIER_OPTIONS } from "./constants"
export {
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
} from "./friend-utils"
export {
  buildSelectedLibrarySets,
  filterGamesByCategories,
  filterSharedGames,
  getAvailableCategories,
} from "./filter-utils"
export {
  dedupeGameCards,
  derivePlayers,
  deriveRating,
  gameMatchKey,
  hashIdFromString,
  normalizeGameName,
  toGameCards,
  toImportedGameCard,
} from "./game-utils"
export { buildUserRecommendations } from "./recommendation-utils"
export { loadMatchingData, type MatchingInitData } from "./load-matching-data"
export {
  evaluateParticipantCompatibility,
  inferCpuTier,
  inferGpuTier,
  osMatchesPlayer,
  type CompatibilityCheck,
  type CompatibilitySummary,
} from "./specs-engine"
