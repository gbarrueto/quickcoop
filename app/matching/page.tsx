"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  CheckCircle2,
  UserRoundPlus,
  ArrowLeft,
  ArrowRight,
  XCircle,
  User,
  Cpu,
} from "lucide-react"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import { Checkbox } from "@/components/ui/checkbox"
import {
  ensureStoredUserProfile,
  type FriendIdentity,
  type StoredFriendProfile,
  updateStoredUserProfile,
} from "@/lib/user-profile"
import {
  getCurrentMockUser,
  type MockUser,
} from "@/lib/mock-auth"

type Platform = "steam" | "epic" | "xbox" | "import" | "qcoop"
type CategoryFilterMode = "or" | "and"

type SteamOwnedGame = {
  appid: number
  name?: string
}

type OwnedGamesPayload = {
  data?: {
    response?: {
      games?: SteamOwnedGame[]
    }
  }
}

type EpicGame = {
  id: string
  title: string
  keyImages?: { type: string; url: string }[]
}

type EpicLibraryPayload = {
  games?: EpicGame[]
  error?: string
}

type GamePassGame = {
  id: string
  title: string
  imageUrl: string
}

type GamePassPayload = {
  games?: GamePassGame[]
  error?: string
}

type GameCard = {
  appId: number
  name: string
  imageUrl: string
  rating: number
  players: string
  platform: Platform
  tags?: string[]
}

type RecommendedGame = {
  appId: number
  name: string
  imageUrl: string
  categories: [string, string]
  rating: number
}

type GameCategoriesPayload = {
  categoriesByApp?: Record<string, string[]>
  error?: string
}

type FriendFromApi = {
  steamId: string
  name: string
  avatar?: string | null
}

type FriendsPayload = {
  friends?: FriendFromApi[]
}

type IdentityRef = {
  platform: Platform
  accountId: string
  displayName: string
  avatar?: string | null
}

type FriendProfile = {
  profileId: string
  identities: IdentityRef[]
  connections: {
    steamId: string | null
    epicAccountId: string | null
    hasGamePass: boolean
  }
  selected: boolean
  expanded: boolean
}

type FriendLibrarySnapshot = {
  appIds: Set<number>
  nameKeys: Set<string>
}

type GameRequirementsPayload = {
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

type PlayerSystemSpecs = {
  os: string
  cpuTier: number
  gpuTier: number
  ramGb: number
  vramGb: number
  storageGb: number
}

type RequirementsParticipant = {
  id: string
  name: string
}

const DEFAULT_PLAYER_SPECS: PlayerSystemSpecs = {
  os: "Windows 10",
  cpuTier: 3,
  gpuTier: 3,
  ramGb: 8,
  vramGb: 4,
  storageGb: 40,
}

const TIER_OPTIONS = [
  { value: 1, label: "Tier 1" },
  { value: 2, label: "Tier 2" },
  { value: 3, label: "Tier 3" },
  { value: 4, label: "Tier 4" },
  { value: 5, label: "Tier 5" },
]

function identityKey(identity: IdentityRef): string {
  return `${identity.platform}:${identity.accountId}`
}

function normalizeGameName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ")
}

function gameMatchKey(game: Pick<GameCard, "name">): string {
  return normalizeGameName(game.name)
}

function toLibrarySnapshot(games: { appId: number; name: string }[]): FriendLibrarySnapshot {
  return {
    appIds: new Set(games.map((game) => game.appId)),
    nameKeys: new Set(games.map((game) => gameMatchKey(game))),
  }
}

function mergeLibrarySnapshots(...snapshots: Array<FriendLibrarySnapshot | undefined>): FriendLibrarySnapshot {
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

function stableNumberFromId(id: number): number {
  const seed = String(id)
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000
  }
  return hash
}

function deriveRating(appId: number): number {
  const base = 32 + (stableNumberFromId(appId) % 18)
  return Number((base / 10).toFixed(1))
}

function derivePlayers(appId: number): string {
  const ranges = ["1-2", "1-4", "2-6", "2-8", "1-10", "1-16"]
  return ranges[stableNumberFromId(appId) % ranges.length]
}

function toGameCards(games: SteamOwnedGame[], platform: Platform = "steam"): GameCard[] {
  return games.map((game) => ({
    appId: game.appid,
    name: game.name ?? `Steam App ${game.appid}`,
    imageUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
    rating: deriveRating(game.appid),
    players: derivePlayers(game.appid),
    platform,
  }))
}

function inferCpuTier(text?: string): number | null {
  if (!text) {
    return null
  }

  const normalized = text.toLowerCase()

  if (/i9|ryzen\s*9/.test(normalized)) {
    return 5
  }

  if (/i7|ryzen\s*7|8\s*core|octa/.test(normalized)) {
    return 4
  }

  if (/i5|ryzen\s*5|6\s*core|quad|fx-6/.test(normalized)) {
    return 3
  }

  if (/i3|ryzen\s*3|dual|2\s*core|fx-4/.test(normalized)) {
    return 2
  }

  return 1
}

function inferGpuTier(text?: string): number | null {
  if (!text) {
    return null
  }

  const normalized = text.toLowerCase()

  if (/rtx\s*40|rx\s*7|arc\s*a7/.test(normalized)) {
    return 5
  }

  if (/rtx\s*30|rtx\s*20|gtx\s*10|rx\s*6|vulkan/.test(normalized)) {
    return 4
  }

  if (/gtx\s*9|r9|rx\s*5|dx11|directx\s*11/.test(normalized)) {
    return 3
  }

  if (/gtx\s*7|gt\s*7|hd\s*5|dx10/.test(normalized)) {
    return 2
  }

  return 1
}

function osMatchesPlayer(requiredOs: string | undefined, playerOs: string): boolean {
  if (!requiredOs) {
    return true
  }

  const normalizedRequired = requiredOs.toLowerCase()
  const normalizedPlayer = playerOs.toLowerCase()

  if (normalizedRequired.includes("windows")) {
    return normalizedPlayer.includes("windows")
  }

  if (normalizedRequired.includes("linux") || normalizedRequired.includes("steamos")) {
    return normalizedPlayer.includes("linux") || normalizedPlayer.includes("steamos")
  }

  if (normalizedRequired.includes("mac") || normalizedRequired.includes("os x")) {
    return normalizedPlayer.includes("mac") || normalizedPlayer.includes("os x")
  }

  return normalizedPlayer.includes(normalizedRequired.slice(0, 8))
}

function toFriendProfile(profile: StoredFriendProfile): FriendProfile {
  return {
    profileId: profile.profileId,
    identities: profile.identities,
    connections: profile.connections,
    selected: profile.selected,
    expanded: profile.expanded,
  }
}

function toImportedGameCard(name: string): GameCard {
  return {
    appId: Math.abs(
      name.toLowerCase().trim().split("").reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0),
    ) % 9999999,
    name,
    imageUrl: "",
    rating: 0,
    players: "??",
    platform: "import",
  }
}

function mergeFriendProfiles(existing: FriendProfile[], incoming: FriendProfile[]): FriendProfile[] {
  const next = [...existing]

  incoming.forEach((profile) => {
    const duplicate = next.some((current) => current.profileId === profile.profileId)
    if (!duplicate) {
      next.push(profile)
    }
  })

  return next
}

function snapshotFromStoredFriend(profile: StoredFriendProfile): FriendLibrarySnapshot {
  return {
    appIds: new Set(profile.libraryAppIds),
    nameKeys: new Set((profile.libraryTitles ?? []).map(normalizeGameName).filter(Boolean)),
  }
}

const recommendedGames: RecommendedGame[] = [
  {
    appId: 730,
    name: "Counter-Strike 2",
    imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/730/header.jpg",
    categories: ["FPS", "Competitive"],
    rating: 4.8,
  },
  {
    appId: 553850,
    name: "Helldivers 2",
    imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/553850/header.jpg",
    categories: ["Co-op", "Shooter"],
    rating: 4.7,
  },
  {
    appId: 1172470,
    name: "Apex Legends",
    imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1172470/header.jpg",
    categories: ["Battle Royale", "Hero Shooter"],
    rating: 4.5,
  },
  {
    appId: 252950,
    name: "Rocket League",
    imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/252950/header.jpg",
    categories: ["Sports", "Arcade"],
    rating: 4.8,
  },
  {
    appId: 1091500,
    name: "Cyberpunk 2077",
    imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1091500/header.jpg",
    categories: ["RPG", "Open World"],
    rating: 4.6,
  },
  {
    appId: 271590,
    name: "Grand Theft Auto V",
    imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/271590/header.jpg",
    categories: ["Action", "Open World"],
    rating: 4.9,
  },
  {
    appId: 413150,
    name: "Stardew Valley",
    imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/413150/header.jpg",
    categories: ["Farming", "Co-op"],
    rating: 4.9,
  },
  {
    appId: 322330,
    name: "Don't Starve Together",
    imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/322330/header.jpg",
    categories: ["Survival", "Co-op"],
    rating: 4.6,
  },
  {
    appId: 381210,
    name: "Dead by Daylight",
    imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/381210/header.jpg",
    categories: ["Horror", "Multiplayer"],
    rating: 4.4,
  },
  {
    appId: 1174180,
    name: "Red Dead Redemption 2",
    imageUrl: "https://cdn.akamai.steamstatic.com/steam/apps/1174180/header.jpg",
    categories: ["Adventure", "Open World"],
    rating: 4.9,
  },
]

export default function MatchingPage() {
  const router = useRouter()
  const recommendationsRef = useRef<HTMLDivElement | null>(null)
  const [currentUser, setCurrentUser] = useState<MockUser | null>(null)

  const [steamId, setSteamId] = useState<string | null>(null)
  const [availablePlatforms, setAvailablePlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  const [userGames, setUserGames] = useState<GameCard[]>([])
  const [epicGames, setEpicGames] = useState<GameCard[]>([])
  const [gamePassGames, setGamePassGames] = useState<GameCard[]>([])
  const [epicFriends, setEpicFriends] = useState<FriendProfile[]>([])
  const [epicAccountId, setEpicAccountId] = useState<string | null>(null)
  const [hasGamePass, setHasGamePass] = useState(false)
  const [friendProfiles, setFriendProfiles] = useState<FriendProfile[]>([])

  const [draggingProfileId, setDraggingProfileId] = useState<string | null>(null)
  const [mergeNotice, setMergeNotice] = useState<string | null>(null)

  const [identityLibraries, setIdentityLibraries] = useState<Record<string, FriendLibrarySnapshot>>({})
  const [loadingIdentities, setLoadingIdentities] = useState<Record<string, boolean>>({})
  const [identityErrors, setIdentityErrors] = useState<Record<string, string | null>>({})
  const [categoriesByApp, setCategoriesByApp] = useState<Record<number, string[]>>({})
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [categoryFilterError, setCategoryFilterError] = useState<string | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [categoryFilterMode, setCategoryFilterMode] = useState<CategoryFilterMode>("or")
  const [requirementsByApp, setRequirementsByApp] = useState<Record<number, GameRequirementsPayload>>({})
  const [requirementsLoadingByApp, setRequirementsLoadingByApp] = useState<Record<number, boolean>>({})
  const [requirementsErrorByApp, setRequirementsErrorByApp] = useState<Record<number, string | null>>({})
  const [selectedGameForRequirements, setSelectedGameForRequirements] = useState<GameCard | null>(null)
  const [isRequirementsModalOpen, setIsRequirementsModalOpen] = useState(false)
  const [playerSpecsById, setPlayerSpecsById] = useState<Record<string, PlayerSystemSpecs>>({})

  const [isSpecsModalOpen, setIsSpecsModalOpen] = useState(false)
  const pendingCategoryAppIdsRef = useRef<Set<number>>(new Set())

  const allFriendProfiles = useMemo(
    () => [...friendProfiles, ...epicFriends],
    [friendProfiles, epicFriends]
  )

  const scrollRecommendations = (direction: -1 | 1) => {
    const container = recommendationsRef.current
    if (!container) {
      return
    }

    container.scrollBy({
      left: direction * container.clientWidth,
      behavior: "smooth",
    })
  }

  useEffect(() => {
    const initialize = async () => {
      const loggedInUser = getCurrentMockUser()
      if (!loggedInUser) {
        router.push("/")
        return
      }

      setCurrentUser(loggedInUser)
      const profile = ensureStoredUserProfile()
      // Precarga specs guardadas del usuario
      if (profile.playerSpecs) {
        setPlayerSpecsById((prev) => ({
          ...prev,
          self: profile.playerSpecs!,
        }))
      }

      const platforms: Platform[] = []
      if (profile.connections.steamId) platforms.push("steam")
      if (profile.connections.epicAccountId) platforms.push("epic")
      if (profile.connections.hasGamePass) platforms.push("xbox")

      setAvailablePlatforms(platforms)
      if (profile.connections.steamId) setSteamId(profile.connections.steamId)
      if (profile.connections.epicAccountId) setEpicAccountId(profile.connections.epicAccountId)
      setHasGamePass(profile.connections.hasGamePass)
      const initialManualCards = profile.importedGames.map(toImportedGameCard)
      setUserGames(initialManualCards)

      // Enriquece imágenes de juegos importados en segundo plano
      profile.importedGames.forEach(async (name) => {
        try {
          const res = await fetch(`/api/steam/search?term=${encodeURIComponent(name)}`)
          if (!res.ok) return
          const data = await res.json() as {
            appId: number | null
            imageUrl: string | null
            tags?: string[]
          }
          if (!data.imageUrl) return

          setUserGames((prev) =>
            prev.map((game) =>
              game.platform === "import" && game.name === name
                ? { ...game, imageUrl: data.imageUrl!, tags: data.tags ?? [] }
                : game
            )
          )
        } catch {
          // Silencioso
        }
      })
      setFriendProfiles(profile.friends.map(toFriendProfile))
      setIdentityLibraries(
        profile.friends.reduce<Record<string, FriendLibrarySnapshot>>((acc, friend) => {
          const nameKeys = new Set((friend.libraryTitles ?? []).map(normalizeGameName).filter(Boolean))
          friend.identities.forEach((identity) => {
            acc[identityKey(identity)] = {
              appIds: new Set(friend.libraryAppIds),
              nameKeys,
            }
          })
          return acc
        }, {}),
      )

      setLoading(true)
      setPageError(null)

      try {
        // Steam: juegos + amigos (optional enrichment)
        if (profile.connections.steamId) {
          const [gamesRes, friendsRes] = await Promise.all([
            fetch(`/api/steam/owned-games?steamId=${profile.connections.steamId}`),
            fetch(`/api/steam/friends?steamId=${profile.connections.steamId}`),
          ])
  
          const gamesJson = (await gamesRes.json()) as OwnedGamesPayload & { error?: string }
          const friendsJson = (await friendsRes.json()) as FriendsPayload & { error?: string }
  
          if (!gamesRes.ok) throw new Error(gamesJson.error || "Failed to fetch your Steam library")
          if (!friendsRes.ok) throw new Error(friendsJson.error || "Failed to fetch your Steam friends")
  
          const ownedGames = gamesJson.data?.response?.games ?? []
            setUserGames((prev) => [...prev, ...toGameCards(ownedGames, "steam")])
  
          const steamProfiles = (friendsJson.friends ?? []).map((friend) => ({
            profileId: `profile:steam:${friend.steamId}`,
            identities: [{
              platform: "steam" as const,
              accountId: friend.steamId,
              displayName: friend.name,
              avatar: friend.avatar ?? null,
            }],
              connections: {
                steamId: friend.steamId,
                epicAccountId: null,
                hasGamePass: false,
              },
            selected: false,
            expanded: false,
          }))
          setFriendProfiles((prev) => mergeFriendProfiles(prev, steamProfiles))
        }

        // Epic: juegos + amigos
        if (profile.connections.epicAccountId) {
          const [epicLibRes, epicFriendsRes] = await Promise.all([
            fetch(`/api/epic/library?accountId=${profile.connections.epicAccountId}`),
            fetch(`/api/epic/friends?accountId=${profile.connections.epicAccountId}`),
          ])

          if (epicLibRes.ok) {
            const epicLibJson = (await epicLibRes.json()) as EpicLibraryPayload
            const mapped: GameCard[] = (epicLibJson.games ?? []).map((game) => ({
              appId: Math.abs(game.id.split("").reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0)) % 9999999,
              name: game.title,
              imageUrl: game.keyImages?.find((img) => img.type === "DieselGameBoxTall")?.url
                ?? game.keyImages?.[0]?.url
                ?? "",
              rating: 0,
              players: "1+",
              platform: "epic" as const,
            }))
            setEpicGames((prev) => [...prev, ...mapped])
          }

          if (epicFriendsRes.ok) {
            const epicFriendsJson = (await epicFriendsRes.json()) as { friends?: { accountId: string; displayName: string }[] }
            const epicProfiles: FriendProfile[] = (epicFriendsJson.friends ?? []).map((friend) => ({
              profileId: `profile:epic:${friend.accountId}`,
              identities: [{
                platform: "epic" as const,
                accountId: friend.accountId,
                displayName: friend.displayName,
                avatar: null,
              }],
              connections: {
                steamId: null,
                epicAccountId: friend.accountId,
                hasGamePass: false,
              },
              selected: false,
              expanded: false,
            }))
            setEpicFriends((prev) => mergeFriendProfiles(prev, epicProfiles))
          }
        }

        // GamePass: catálogo público
        const hasGamePassFriend = profile.friends.some((friend) => friend.connections.hasGamePass)
        if (profile.connections.hasGamePass || hasGamePassFriend) {
          const gpRes = await fetch("/api/gamepass")
          if (gpRes.ok) {
            const gpJson = (await gpRes.json()) as GamePassPayload
            const mapped: GameCard[] = (gpJson.games ?? []).map((game) => ({
              appId: Math.abs(game.id.split("").reduce((acc, c) => acc * 31 + c.charCodeAt(0), 0)) % 9999999,
              name: game.title,
              imageUrl: game.imageUrl ?? "",
              rating: 0,
              players: "1+",
              platform: "xbox" as const,
            }))
            setGamePassGames((prev) => [...prev, ...mapped])

            // Enriquece tags de Game Pass en segundo plano
            mapped.forEach(async (card) => {
              try {
                const res = await fetch(`/api/steam/search?term=${encodeURIComponent(card.name)}`)
                if (!res.ok) return
                const data = await res.json() as {
                  appId: number | null
                  imageUrl: string | null
                  tags?: string[]
                }
                if (!data.tags?.length) return

                setGamePassGames((prev) =>
                  prev.map((game) =>
                    game.platform === "xbox" && game.name === card.name
                      ? { ...game, tags: data.tags! }
                      : game
                  )
                )
              } catch {
                // Silencioso
              }
            })

            const gamePassSnapshot = toLibrarySnapshot(mapped)
            if (hasGamePassFriend) {
              setIdentityLibraries((prev) => {
                const next = { ...prev }

                profile.friends.forEach((friend) => {
                  if (!friend.connections.hasGamePass) {
                    return
                  }

                  friend.identities.forEach((identity) => {
                    next[identityKey(identity)] = mergeLibrarySnapshots(
                      next[identityKey(identity)],
                      snapshotFromStoredFriend(friend),
                      gamePassSnapshot,
                    )
                  })
                })

                return next
              })
            }
          }
        }



      } catch (error) {
        setPageError(error instanceof Error ? error.message : "Failed to initialize matching view")
      } finally {
        setLoading(false)
      }
    }

    initialize()
  }, [router])

  const loadIdentityLibrary = async (identity: IdentityRef) => {
    const key = identityKey(identity)

    if (identityLibraries[key] || loadingIdentities[key]) {
      return
    }

    if (identity.platform !== "steam") {
      return
    }

    setLoadingIdentities((prev) => ({ ...prev, [key]: true }))
    setIdentityErrors((prev) => ({ ...prev, [key]: null }))

    try {
      const response = await fetch(`/api/steam/owned-games?steamId=${identity.accountId}`)
      const payload = (await response.json()) as OwnedGamesPayload & { error?: string }

      if (!response.ok) {
        throw new Error(payload.error || `Failed to load ${identity.displayName} library`)
      }

      const appIds = (payload.data?.response?.games ?? []).map((game) => game.appid)
      const nameKeys = new Set(
        (payload.data?.response?.games ?? [])
          .map((game) => normalizeGameName(game.name ?? `Steam App ${game.appid}`))
          .filter(Boolean),
      )

      setIdentityLibraries((prev) => ({ ...prev, [key]: { appIds: new Set(appIds), nameKeys } }))
      updateStoredUserProfile((profile) => ({
        ...profile,
        friends: profile.friends.map((friend) =>
          friend.identities.some((current) => identityKey(current) === key)
            ? {
                ...friend,
                libraryAppIds: appIds,
                libraryTitles: (payload.data?.response?.games ?? []).map(
                  (game) => game.name ?? `Steam App ${game.appid}`,
                ),
              }
            : friend,
        ),
      }))
    } catch (error) {
      setIdentityErrors((prev) => ({
        ...prev,
        [key]: error instanceof Error ? error.message : "Failed to load friend library",
      }))
    } finally {
      setLoadingIdentities((prev) => ({ ...prev, [key]: false }))
    }
  }

  useEffect(() => {
    friendProfiles
      .filter((profile) => profile.selected)
      .forEach((profile) => {
        profile.identities.forEach((identity) => {
          void loadIdentityLibrary(identity)
        })
      })
  }, [friendProfiles])

  const toggleFriendSelection = (profileId: string) => {
    setFriendProfiles((prev) =>
      prev.map((p) => p.profileId === profileId ? { ...p, selected: !p.selected } : p)
    )
    setEpicFriends((prev) =>
      prev.map((p) => p.profileId === profileId ? { ...p, selected: !p.selected } : p)
    )
  }

  const toggleProfileExpanded = (profileId: string) => {
    setFriendProfiles((prev) =>
      prev.map((p) => p.profileId === profileId ? { ...p, expanded: !p.expanded } : p)
    )
    setEpicFriends((prev) =>
      prev.map((p) => p.profileId === profileId ? { ...p, expanded: !p.expanded } : p)
    )
  }

  const mergeProfiles = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) {
      return
    }

    if (availablePlatforms.length < 2) {
      setMergeNotice("Merging is enabled only when 2 or more platforms are connected.")
      return
    }

    const source = friendProfiles.find((profile) => profile.profileId === sourceId)
    const target = friendProfiles.find((profile) => profile.profileId === targetId)

    if (!source || !target) {
      return
    }

    const sourcePlatforms = new Set(source.identities.map((identity) => identity.platform))
    const targetPlatforms = new Set(target.identities.map((identity) => identity.platform))
    const hasPlatformOverlap = [...sourcePlatforms].some((platform) => targetPlatforms.has(platform))

    if (hasPlatformOverlap) {
      setMergeNotice("Merging between users from the same platform is not allowed.")
      return
    }

    setMergeNotice(null)

    setFriendProfiles((prev) => {
      const sourceProfile = prev.find((profile) => profile.profileId === sourceId)
      const targetProfile = prev.find((profile) => profile.profileId === targetId)

      if (!sourceProfile || !targetProfile) {
        return prev
      }

      const mergedIdentities = [...targetProfile.identities]
      sourceProfile.identities.forEach((identity) => {
        const exists = mergedIdentities.some(
          (current) =>
            current.platform === identity.platform && current.accountId === identity.accountId,
        )

        if (!exists) {
          mergedIdentities.push(identity)
        }
      })

      const nextProfiles = prev
        .filter((profile) => profile.profileId !== sourceProfile.profileId)
        .map((profile) =>
          profile.profileId === targetProfile.profileId
            ? {
                ...profile,
                identities: mergedIdentities,
                selected: profile.selected || sourceProfile.selected,
              }
            : profile,
        )

      updateStoredUserProfile((profile) => {
        const sourceStored = profile.friends.find((friend) => friend.profileId === sourceProfile.profileId)
        const targetStored = profile.friends.find((friend) => friend.profileId === targetProfile.profileId)
        const mergedLibraryAppIds = Array.from(
          new Set([...(targetStored?.libraryAppIds ?? []), ...(sourceStored?.libraryAppIds ?? [])]),
        )
        const storedIdentities = mergedIdentities.filter(
          (identity): identity is FriendIdentity => identity.platform !== "import",
        )

        return {
          ...profile,
          friends: profile.friends
            .filter((friend) => friend.profileId !== sourceProfile.profileId)
            .map((friend) =>
              friend.profileId === targetProfile.profileId
                ? {
                    ...friend,
                    identities: storedIdentities,
                    selected: friend.selected || sourceStored?.selected || false,
                    expanded: friend.expanded || sourceStored?.expanded || false,
                    libraryAppIds: mergedLibraryAppIds,
                  }
                : friend,
            ),
        }
      })

      return nextProfiles
    })
  }

  const canDragMerge = availablePlatforms.length >= 2

  const allUserGames = useMemo(() => {
    const seen = new Set<string>()
    return [...userGames, ...epicGames, ...gamePassGames].filter((game) => {
      const key = `${game.platform}-${game.appId}`
      if (seen.has(key)) return false
      seen.add(key)
      return true
    })
  }, [userGames, epicGames, gamePassGames])

  const filteredGames = useMemo(() => {
    const selectedProfiles = allFriendProfiles.filter((p) => p.selected)
    if (selectedProfiles.length === 0) return allUserGames

    const selectedSets = selectedProfiles.map((profile) => {
      const mergedSet = new Set<number>()
      const mergedNameKeys = new Set<string>()
      profile.identities.forEach((identity) => {
        const library = identityLibraries[identityKey(identity)]
        if (!library) {
          return
        }

        library.appIds.forEach((appId) => mergedSet.add(appId))
        library.nameKeys.forEach((nameKey) => mergedNameKeys.add(nameKey))
      })

      if (profile.connections.hasGamePass) {
        gamePassGames.forEach((game) => {
          mergedSet.add(game.appId)
          mergedNameKeys.add(gameMatchKey(game))
        })
      }

      return { appIds: mergedSet, nameKeys: mergedNameKeys }
    })

    return allUserGames.filter((game) => {
      const key = gameMatchKey(game)
      return selectedSets.every((set) => set.appIds.has(game.appId) || set.nameKeys.has(key))
    })
  }, [allFriendProfiles, identityLibraries, allUserGames])

  useEffect(() => {
    if (filteredGames.length === 0) {
      return
    }

    const missingAppIds = Array.from(
      new Set(
        filteredGames
          .map((game) => game.appId)
          .filter((appId) => !(appId in categoriesByApp) && !pendingCategoryAppIdsRef.current.has(appId)),
      ),
    ).slice(0, 80)

    if (missingAppIds.length === 0) {
      return
    }

    let isCancelled = false

    missingAppIds.forEach((appId) => {
      pendingCategoryAppIdsRef.current.add(appId)
    })

    const loadCategories = async () => {
      setIsLoadingCategories(true)
      setCategoryFilterError(null)

      try {
        const response = await fetch(`/api/steam/game-categories?appIds=${missingAppIds.join(",")}`)
        const payload = (await response.json()) as GameCategoriesPayload

        if (!response.ok) {
          throw new Error(payload.error || "Failed to load game categories")
        }

        const incoming = payload.categoriesByApp ?? {}
        if (!isCancelled) {
          setCategoriesByApp((prev) => {
            const next = { ...prev }
            Object.entries(incoming).forEach(([appId, categories]) => {
              next[Number(appId)] = categories
            })
            return next
          })
        }
      } catch (error) {
        if (!isCancelled) {
          setCategoryFilterError(error instanceof Error ? error.message : "Failed to load categories")
        }
      } finally {
        missingAppIds.forEach((appId) => {
          pendingCategoryAppIdsRef.current.delete(appId)
        })

        if (!isCancelled) {
          setIsLoadingCategories(false)
        }
      }
    }

    void loadCategories()

    return () => {
      isCancelled = true
    }
  }, [filteredGames, categoriesByApp])

  const availableCategories = useMemo(() => {
    const unique = new Set<string>()
    filteredGames.forEach((game) => {
      ;(categoriesByApp[game.appId] ?? []).forEach((category) => unique.add(category))
    })

    return [...unique].sort((a, b) => a.localeCompare(b))
  }, [filteredGames, categoriesByApp])

  const categoryFilteredGames = useMemo(() => {
    if (selectedCategories.length === 0) {
      return filteredGames
    }

    return filteredGames.filter((game) => {
      const gameCategories = categoriesByApp[game.appId] ?? []
      if (categoryFilterMode === "and") {
        return selectedCategories.every((selectedCategory) => gameCategories.includes(selectedCategory))
      }

      return selectedCategories.some((selectedCategory) => gameCategories.includes(selectedCategory))
    })
  }, [filteredGames, categoriesByApp, selectedCategories, categoryFilterMode])

  const toggleCategoryFilter = (category: string) => {
    setSelectedCategories((prev) =>
      prev.includes(category) ? prev.filter((current) => current !== category) : [...prev, category],
    )
  }

  const requirementsParticipants = useMemo<RequirementsParticipant[]>(
    () => [
      { id: "self", name: "You" },
      ...allFriendProfiles
        .filter((profile) => profile.selected)
        .map((profile) => ({
          id: profile.profileId,
          name: profile.identities[0]?.displayName ?? "Player",
        })),
    ],
    [allFriendProfiles],
  )

  useEffect(() => {
    setPlayerSpecsById((prev) => {
      const next = { ...prev }
      requirementsParticipants.forEach((participant) => {
        if (!next[participant.id]) {
          next[participant.id] = { ...DEFAULT_PLAYER_SPECS }
        }
      })
      return next
    })
  }, [requirementsParticipants])

  const updatePlayerSpecs = (
    participantId: string,
    field: keyof PlayerSystemSpecs,
    value: string | number,
  ) => {
    setPlayerSpecsById((prev) => {
      const current = prev[participantId] ?? { ...DEFAULT_PLAYER_SPECS }
      const updated = { ...current, [field]: value }

      // Solo persiste las specs del usuario propio
      if (participantId === "self") {
        updateStoredUserProfile((profile) => ({
          ...profile,
          playerSpecs: updated,
        }))
      }

      return { ...prev, [participantId]: updated }
    })
  }

  const openRequirementsModal = async (game: GameCard) => {
    setSelectedGameForRequirements(game)
    setIsRequirementsModalOpen(true)

    if (requirementsByApp[game.appId] || requirementsLoadingByApp[game.appId]) return

    setRequirementsLoadingByApp((prev) => ({ ...prev, [game.appId]: true }))
    setRequirementsErrorByApp((prev) => ({ ...prev, [game.appId]: null }))

    try {
      let url = `/api/steam/game-requirements?appId=${game.appId}`

      // Para juegos de Game Pass e Import, busca por nombre en Steam
      if (game.platform === "xbox" || game.platform === "import") {
        url = `/api/steam/game-requirements?appId=${game.appId}&searchName=${encodeURIComponent(game.name)}`
      }

      const response = await fetch(url)
      const payload = (await response.json()) as GameRequirementsPayload

      if (!response.ok) throw new Error(payload.error || "Failed to load game requirements")

      setRequirementsByApp((prev) => ({ ...prev, [game.appId]: payload }))
    } catch (error) {
      setRequirementsErrorByApp((prev) => ({
        ...prev,
        [game.appId]: error instanceof Error ? error.message : "Failed to load requirements",
      }))
    } finally {
      setRequirementsLoadingByApp((prev) => ({ ...prev, [game.appId]: false }))
    }
  }

  const evaluateParticipantCompatibility = (
    participantId: string,
    requirements: GameRequirementsPayload,
  ) => {
    const specs = playerSpecsById[participantId] ?? DEFAULT_PLAYER_SPECS
    const requiredCpuTier = inferCpuTier(requirements.parsed.processor)
    const requiredGpuTier = inferGpuTier(requirements.parsed.graphics)

    const checks = [
      {
        key: "os",
        label: "Operating system",
        pass: osMatchesPlayer(requirements.parsed.os, specs.os),
      },
      {
        key: "cpu",
        label: "Processor",
        pass: requiredCpuTier === null ? true : specs.cpuTier >= requiredCpuTier,
      },
      {
        key: "gpu",
        label: "Graphics card",
        pass: requiredGpuTier === null ? true : specs.gpuTier >= requiredGpuTier,
      },
      {
        key: "ram",
        label: "Memory (RAM)",
        pass:
          requirements.parsed.memoryGb === undefined
            ? true
            : specs.ramGb >= requirements.parsed.memoryGb,
      },
      {
        key: "vram",
        label: "Video memory (VRAM)",
        pass:
          requirements.parsed.vramGb === undefined
            ? true
            : specs.vramGb >= requirements.parsed.vramGb,
      },
      {
        key: "storage",
        label: "Available storage",
        pass:
          requirements.parsed.storageGb === undefined
            ? true
            : specs.storageGb >= requirements.parsed.storageGb,
      },
    ]

    return {
      allChecksPass: checks.every((check) => check.pass),
      failedLabels: checks.filter((check) => !check.pass).map((check) => check.label),
    }
  }

  const selectedCount = allFriendProfiles.filter((p) => p.selected).length
  const selectedProfiles = allFriendProfiles.filter((p) => p.selected)

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-6 py-16 lg:px-12">
        <div className="mx-auto max-w-7xl">
          <p className="text-muted-foreground">Loading matching preparation...</p>
        </div>
      </main>
    )
  }

  if (pageError) {
    return (
      <main className="min-h-screen bg-background px-6 py-16 lg:px-12">
        <div className="mx-auto max-w-4xl rounded-2xl border border-destructive/40 bg-destructive/10 p-6">
          <h1 className="text-2xl font-bold mb-2">Failed to prepare matching</h1>
          <p className="text-sm text-destructive">{pageError}</p>
          <div className="mt-6">
            <Link href="/">
              <Button variant="outline">Back to landing</Button>
            </Link>
          </div>
        </div>
      </main>
    )
  }

  return (
    <main className="min-h-screen bg-background px-6 py-10 lg:px-12">
      <div className="mx-auto max-w-7xl space-y-8">
        <header className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
          <div>
            <h1 className="text-3xl font-bold">Prepare matching</h1>
            <p className="text-muted-foreground mt-1">
              Select friends to filter games everyone owns. Drag one friend onto another to merge identities across platforms.
            </p>
            {steamId && (
              <p className="text-xs text-muted-foreground mt-2">Signed in with Steam ID: {steamId}</p>
            )}
          </div>
          <div className="flex gap-3">
            {currentUser && (
              <div className="inline-flex items-center gap-2 rounded-full border border-primary/30 bg-primary/10 px-3 py-1.5 text-xs text-primary">
                <span className="inline-flex h-6 w-6 items-center justify-center rounded-full border border-primary/40 bg-primary/20">
                  <User className="h-3.5 w-3.5" />
                </span>
                <span className="font-medium">{currentUser.name}</span>
                <button
                  type="button"
                  onClick={() => setIsSpecsModalOpen(true)}
                  className="ml-1 inline-flex items-center gap-1 rounded-full border border-primary/30 bg-primary/10 px-2 py-0.5 text-[10px] hover:bg-primary/20 transition-colors"
                >
                  <Cpu className="h-3 w-3" />
                  My specs
                </button>
              </div>
            )}
            <Link href="/">
              <Button variant="outline">
                <ArrowLeft className="h-4 w-4 mr-2" />
                Back
              </Button>
            </Link>
          </div>
        </header>

        <section className="grid gap-6 lg:grid-cols-[2.2fr_1fr]">
          <article className="rounded-2xl border border-border bg-card/50 p-5 flex flex-col">
            <div className="mb-4 flex items-center justify-between">
              <h2 className="text-xl font-semibold">Your library</h2>
              <p className="text-sm text-muted-foreground">
                {selectedCount > 0
                  ? `${categoryFilteredGames.length} shared games with selected friends`
                  : `${allUserGames.length} games in your library`}
              </p>
            </div>

            <div className="mb-4 rounded-xl border border-border/70 bg-background/40 p-3">
              <div className="flex items-center justify-between gap-2">
                <p className="text-xs font-medium">Category filters</p>
                <div className="flex items-center gap-2">
                  {isLoadingCategories && <p className="text-[11px] text-primary">Loading categories...</p>}
                  <div className="inline-flex overflow-hidden rounded-md border border-border/80 bg-background/70 text-[10px] uppercase tracking-wide">
                    <button
                      type="button"
                      className={`px-2 py-1 transition-colors ${
                        categoryFilterMode === "or" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setCategoryFilterMode("or")}
                    >
                      ANY
                    </button>
                    <button
                      type="button"
                      className={`border-l border-border/80 px-2 py-1 transition-colors ${
                        categoryFilterMode === "and" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"
                      }`}
                      onClick={() => setCategoryFilterMode("and")}
                    >
                      ALL
                    </button>
                  </div>
                  {selectedCategories.length > 0 && (
                    <Button
                      type="button"
                      size="sm"
                      variant="outline"
                      className="h-6 px-2 text-[10px]"
                      onClick={() => setSelectedCategories([])}
                    >
                      Clear filters
                    </Button>
                  )}
                </div>
              </div>

              {categoryFilterError && (
                <p className="mt-2 text-[11px] text-destructive">{categoryFilterError}</p>
              )}

              <div className="mt-2 flex flex-wrap gap-2">
                {availableCategories.length > 0 ? (
                  availableCategories.map((category) => {
                    const selected = selectedCategories.includes(category)
                    return (
                      <button
                        key={category}
                        type="button"
                        onClick={() => toggleCategoryFilter(category)}
                        className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide transition-colors ${
                          selected
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-background/70 text-muted-foreground hover:text-foreground"
                        }`}
                      >
                        {category}
                      </button>
                    )
                  })
                ) : (
                  <p className="text-[11px] text-muted-foreground">
                    No category data available yet for the visible games.
                  </p>
                )}
              </div>
              {selectedCategories.length > 1 && (
                <p className="mt-2 text-[11px] text-muted-foreground">
                  Current mode: {categoryFilterMode.toUpperCase()} ({categoryFilterMode === "or" ? "matches any selected category" : "must match all selected categories"})
                </p>
              )}
            </div>

            <div className="max-h-screen overflow-y-auto pr-1">
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {categoryFilteredGames.map((game, index) => (
                <button
                  type="button"
                  key={`${game.platform}-${game.appId}-${index}`}
                  onClick={() => openRequirementsModal(game)}
                  className="overflow-hidden rounded-xl border border-border bg-secondary/20 text-left transition-colors hover:border-primary/40 hover:bg-secondary/30"
                >
                  <div className="h-20 w-full bg-secondary/40">
                    {game.imageUrl ? (
                      <img
                        src={game.imageUrl}
                        alt={game.name}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center bg-secondary/60">
                        <span className={`text-[10px] uppercase tracking-wide font-medium text-white/50`}>
                          No Image
                        </span>
                      </div>
                    )}
                  </div>
                  <div className="space-y-1 p-2.5">
                    <h3 className="font-medium leading-tight text-sm line-clamp-2">{game.name}</h3>

                    <span className={`inline-block rounded-full px-1.5 py-0.5 text-[9px] uppercase tracking-wide font-medium mt-0.5 ${
                      game.platform === "steam"
                        ? "bg-[#1b2838] text-[#66c0f4] border border-[#66c0f4]/30"
                        : game.platform === "epic"
                        ? "bg-[#313131] text-white border border-white/20"
                        : game.platform === "xbox"
                        ? "bg-[#107c10] text-white border border-white/20"
                        : "bg-[#7c5c10] text-white border border-white/20"
                    }`}>
                      {game.platform === "steam" ? "Steam" 
                      : game.platform === "epic" ? "Epic" 
                      : game.platform === "xbox" ? "Game Pass"
                      : "Import"}
                    </span>

                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{game.players} players</span>
                      <span>{game.rating > 0 ? `Rating ${game.rating}` : ""}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                    {(
                      game.platform === "steam"
                        ? categoriesByApp[game.appId] ?? []
                        : game.tags ?? []
                    ).slice(0, 2).map((category) => (
                      <span
                        key={`${game.appId}-${category}`}
                        className="rounded-full border border-border/80 bg-background/70 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground"
                      >
                        {category}
                      </span>
                    ))}
                  </div>
                  </div>
                </button>
              ))}
            </div>
            {categoryFilteredGames.length === 0 && (
              <p className="text-sm text-muted-foreground mt-4">
                No shared games found for the current friend selection.
              </p>
            )}
            </div>
          </article>

          <aside className="space-y-4 flex flex-col">
            <section className="rounded-2xl border border-border bg-card/50 p-3" aria-labelledby="recommendations-title">
              <div className="mb-3 flex items-center justify-between gap-3">
                <div>
                  <h2 id="recommendations-title" className="text-base font-semibold">
                    Game recommendations
                  </h2>
                  <p className="text-[11px] text-muted-foreground">
                    You might be interested in these games.
                  </p>
                </div>
                <div className="flex items-center gap-2">
                  <div className="flex items-center gap-1">
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => scrollRecommendations(-1)}
                      aria-label="Scroll recommendations left"
                    >
                      <ArrowLeft className="h-4 w-4" />
                    </Button>
                    <Button
                      type="button"
                      variant="outline"
                      size="icon"
                      className="h-7 w-7"
                      onClick={() => scrollRecommendations(1)}
                      aria-label="Scroll recommendations right"
                    >
                      <ArrowRight className="h-4 w-4" />
                    </Button>
                  </div>
                </div>
              </div>

              <div
                ref={recommendationsRef}
                className="overflow-x-auto pb-2"
                style={{ scrollbarWidth: "none" }}
              >
                <div className="grid grid-flow-col auto-cols-[calc((100%-0.75rem)/2)] gap-3 px-1">
                  {recommendedGames.map((game) => (
                    <article
                      key={game.appId}
                      className="overflow-hidden rounded-xl border border-border bg-secondary/20"
                    >
                      <div className="h-20 w-full bg-secondary/40">
                        {game.imageUrl ? (
                          <img
                            src={game.imageUrl}
                            alt={game.name}
                            className="h-full w-full object-cover"
                            loading="lazy"
                          />
                        ) : (
                          <div className="flex h-full w-full items-center justify-center bg-secondary/60">
                            <span className={`text-[10px] uppercase tracking-wide font-medium ${
                              "text-white/50"
                            }`}>
                              NoImage
                            </span>
                          </div>
                        )}
                      </div>
                      <div className="space-y-1.5 p-2.5">
                        <div>
                          <h3 className="line-clamp-1 text-xs font-semibold">{game.name}</h3>
                          <div className="mt-1 flex flex-wrap gap-1">
                            {game.categories.map((category) => (
                              <span
                                key={`${game.appId}-${category}`}
                                className="rounded-full border border-border/80 bg-background/70 px-1.5 py-0.5 text-[8px] uppercase tracking-wide text-muted-foreground"
                              >
                                {category}
                              </span>
                            ))}
                          </div>
                        </div>
                        <div className="flex items-center justify-between text-[11px] text-muted-foreground">
                          <span>Recommended</span>
                          <span className="inline-flex items-center gap-1 text-amber-500">
                            <CheckCircle2 className="h-3 w-3" />
                            {game.rating}
                          </span>
                        </div>
                      </div>
                    </article>
                  ))}
                </div>
              </div>
            </section>

            <section className="rounded-2xl border border-border bg-card/50 p-4" aria-labelledby="friend-group-title">
              <h2 id="friend-group-title" className="text-lg font-semibold mb-2">
                Your friend group
              </h2>
              {selectedProfiles.length === 0 ? (
                <p className="text-xs text-muted-foreground">
                  Select friends from the list to build your group.
                </p>
              ) : (
                <ul className="space-y-2">
                  {selectedProfiles.map((profile) => (
                    <li
                      key={`group-${profile.profileId}`}
                      className="flex items-center justify-between gap-2 rounded-md border border-border/70 bg-background/40 px-2 py-1.5"
                    >
                      <span className="text-xs font-medium truncate">
                        {profile.identities[0]?.displayName}
                      </span>
                      <div className="flex items-center gap-1">
                        {profile.identities.map((identity) => (
                          <span
                            key={identityKey(identity)}
                            className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide font-medium ${
                              identity.platform === "steam"
                                ? "bg-[#1b2838] text-[#66c0f4] border border-[#66c0f4]/30"
                                : identity.platform === "epic"
                                ? "bg-[#313131] text-white border border-white/20"
                                : identity.platform === "xbox"
                                ? "bg-[#107c10] text-white border border-white/20"
                                : "bg-[#7c5c10] text-white border border-white/20"
                            }`}
                          >
                            { identity.platform === "steam" ? "Steam" 
                            : identity.platform === "epic" ? "Epic" 
                            : identity.platform === "xbox" ? "Game Pass" 
                            : "QCoop"}
                          </span>
                        ))}
                        <Button
                          type="button"
                          size="sm"
                          variant="outline"
                          className="h-6 px-2 text-[10px]"
                          onClick={() => toggleFriendSelection(profile.profileId)}
                        >
                          Remove
                        </Button>
                      </div>
                    </li>
                  ))}
                </ul>
              )}
            </section>

            <section className="rounded-2xl border border-border bg-card/50 p-5 flex flex-col">
              <div className="mb-4">
                <h2 className="text-xl font-semibold">Friends</h2>
                <p className="text-sm text-muted-foreground mt-1">
                  Select friends to filter games. Drag-and-drop to merge identities.
                </p>
              </div>

              <div className="mt-4 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
                <p className="font-medium">Merge tip</p>
                <p className="mt-1">
                  Drag one friend row onto another to merge identities. This feature activates only when 2+ platforms are connected.
                </p>
                <p className="mt-2 inline-flex items-center gap-1">
                  <UserRoundPlus className="h-3.5 w-3.5" />
                  Merging between users of the same platform is blocked.
                </p>
              </div>

              {mergeNotice && (
                <p className="mt-3 text-xs text-amber-500">{mergeNotice}</p>
              )}

              {selectedCount > 0 && (
                <div className="mt-3 inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs text-emerald-600">
                  <CheckCircle2 className="h-4 w-4" />
                  Filtering with {selectedCount} selected {selectedCount === 1 ? "friend" : "friends"}
                </div>
              )}

              <div className="max-h-[calc(100vh-20rem)] overflow-y-auto pr-1">
              <div className="space-y-3">
              {allFriendProfiles.map((profile) => {
                const primaryIdentity = profile.identities[0]
                const hasMultipleIdentities = profile.identities.length > 1
                const hasLoadingIdentity = profile.identities.some(
                  (identity) => loadingIdentities[identityKey(identity)],
                )
                const firstIdentityError = profile.identities
                  .map((identity) => identityErrors[identityKey(identity)])
                  .find((message) => Boolean(message))

                return (
                  <article
                    key={profile.profileId}
                    draggable={canDragMerge}
                    onDragStart={() => {
                      if (!canDragMerge) {
                        return
                      }
                      setDraggingProfileId(profile.profileId)
                    }}
                    onDragOver={(event) => {
                      if (!canDragMerge) {
                        return
                      }
                      event.preventDefault()
                    }}
                    onDrop={() => {
                      if (!canDragMerge) {
                        return
                      }
                      if (draggingProfileId) {
                        mergeProfiles(draggingProfileId, profile.profileId)
                      }
                      setDraggingProfileId(null)
                    }}
                    onDragEnd={() => setDraggingProfileId(null)}
                    className={`rounded-xl border border-border bg-secondary/20 p-3 ${
                      canDragMerge ? "cursor-grab" : "cursor-default"
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Checkbox
                        checked={profile.selected}
                        onCheckedChange={() => toggleFriendSelection(profile.profileId)}
                      />

                      <div className="min-w-0 flex-1">
                        <p className="truncate text-sm font-medium">{primaryIdentity.displayName}</p>
                        {hasLoadingIdentity && (
                          <p className="text-xs text-primary">Loading library...</p>
                        )}
                        {firstIdentityError && (
                          <p className="text-xs text-destructive">{firstIdentityError}</p>
                        )}
                      </div>

                      <div className="flex items-center gap-1">
                        {profile.identities.map((identity) => (
                          <span
                            key={identityKey(identity)}
                            className={`rounded-full px-2 py-0.5 text-[10px] uppercase tracking-wide font-medium ${
                              identity.platform === "steam"
                                ? "bg-[#1b2838] text-[#66c0f4] border border-[#66c0f4]/30"
                                : identity.platform === "epic"
                                ? "bg-[#313131] text-white border border-white/20"
                                : identity.platform === "xbox"
                                ? "bg-[#107c10] text-white border border-white/20"
                                : "bg-[#7c5c10] text-white border border-white/20"
                            }`}
                          >
                            { identity.platform === "steam" ? "Steam" 
                            : identity.platform === "epic" ? "Epic" 
                            : identity.platform === "xbox" ? "Game Pass"
                            : "Qcoop"}
                          </span>
                        ))}
                      </div>
                    </div>

                    {hasMultipleIdentities && (
                      <div className="mt-2 border-t border-border/70 pt-2">
                        <button
                          type="button"
                          onClick={() => toggleProfileExpanded(profile.profileId)}
                          className="text-xs text-muted-foreground hover:text-foreground"
                        >
                          {profile.expanded ? "Hide merged identities" : "Show merged identities"}
                        </button>

                        {profile.expanded && (
                          <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                            {profile.identities.map((identity) => (
                              <li key={`expanded-${identityKey(identity)}`}>
                                {identity.displayName} ({identity.platform})
                              </li>
                            ))}
                          </ul>
                        )}
                      </div>
                    )}
                  </article>
                )
              })}

              {allFriendProfiles.length === 0 && (
                <p className="text-sm text-muted-foreground">No friends available to import.</p>
              )}
              </div>

              </div>
            </section>
          </aside>
        </section>

        <Dialog open={isRequirementsModalOpen} onOpenChange={setIsRequirementsModalOpen}>
          <DialogContent className="max-w-5xl max-h-[90vh] overflow-y-auto p-0">
            <div className="border-b border-border/70 p-4 sm:p-6">
              <DialogHeader className="gap-3">
                <div className="overflow-hidden rounded-xl border border-border/70 bg-secondary/30">
                  {selectedGameForRequirements ? (
                    <img
                      src={selectedGameForRequirements.imageUrl}
                      alt={selectedGameForRequirements.name}
                      className="h-40 w-full object-cover"
                    />
                  ) : null}
                </div>
                <DialogTitle>
                  {selectedGameForRequirements?.name ?? "Game requirements"}
                </DialogTitle>
                <DialogDescription>
                  Review quickly if every selected player can run this game.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-4 p-4 sm:p-6">
              {selectedGameForRequirements && requirementsLoadingByApp[selectedGameForRequirements.appId] && (
                <p className="text-sm text-muted-foreground">Loading minimum requirements...</p>
              )}

              {selectedGameForRequirements && requirementsErrorByApp[selectedGameForRequirements.appId] && (
                <p className="rounded-lg border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
                  {requirementsErrorByApp[selectedGameForRequirements.appId]}
                </p>
              )}

              {selectedGameForRequirements && requirementsByApp[selectedGameForRequirements.appId] && (
                <div className="space-y-4">
                  {(() => {
                    const requirements = requirementsByApp[selectedGameForRequirements.appId]
                    const failedParticipants = requirementsParticipants.filter((participant) => {
                      const summary = evaluateParticipantCompatibility(participant.id, requirements)
                      return !summary.allChecksPass
                    })

                    const everyonePasses = failedParticipants.length === 0

                    return (
                      <div
                        className={`rounded-xl border px-3 py-2 text-sm ${
                          everyonePasses
                            ? "border-emerald-500/40 bg-emerald-500/10 text-emerald-700"
                            : "border-destructive/40 bg-destructive/10 text-destructive"
                        }`}
                      >
                        {everyonePasses ? (
                          <p className="inline-flex items-center gap-1.5 font-medium">
                            <CheckCircle2 className="h-4 w-4" />
                            All selected players meet the minimum requirements.
                          </p>
                        ) : (
                          <p className="font-medium">
                            The minimum requirements are not met by: {failedParticipants.map((participant) => participant.name).join(", ")}.
                          </p>
                        )}
                      </div>
                    )
                  })()}

                  {requirementsParticipants.map((participant) => {
                    const specs = playerSpecsById[participant.id] ?? DEFAULT_PLAYER_SPECS
                    const requirements = requirementsByApp[selectedGameForRequirements.appId]
                    const requiredCpuTier = inferCpuTier(requirements.parsed.processor)
                    const requiredGpuTier = inferGpuTier(requirements.parsed.graphics)

                    const checks = [
                      {
                        key: "os",
                        label: "Operating system",
                        pass: osMatchesPlayer(requirements.parsed.os, specs.os),
                        mine: (
                          <input
                            type="text"
                            value={specs.os}
                            onChange={(event) => updatePlayerSpecs(participant.id, "os", event.target.value)}
                            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                          />
                        ),
                        required: requirements.parsed.os ?? "Not specified",
                      },
                      {
                        key: "cpu",
                        label: "Processor",
                        pass: requiredCpuTier === null ? true : specs.cpuTier >= requiredCpuTier,
                        mine: (
                          <select
                            value={specs.cpuTier}
                            onChange={(event) => updatePlayerSpecs(participant.id, "cpuTier", Number(event.target.value))}
                            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                          >
                            {TIER_OPTIONS.map((tier) => (
                              <option key={`cpu-${tier.value}`} value={tier.value}>
                                {tier.label}
                              </option>
                            ))}
                          </select>
                        ),
                        required:
                          requirements.parsed.processor && requiredCpuTier !== null
                            ? `${requirements.parsed.processor} (Tier ${requiredCpuTier})`
                            : requirements.parsed.processor ?? "Not specified",
                      },
                      {
                        key: "gpu",
                        label: "Graphics card",
                        pass: requiredGpuTier === null ? true : specs.gpuTier >= requiredGpuTier,
                        mine: (
                          <select
                            value={specs.gpuTier}
                            onChange={(event) => updatePlayerSpecs(participant.id, "gpuTier", Number(event.target.value))}
                            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                          >
                            {TIER_OPTIONS.map((tier) => (
                              <option key={`gpu-${tier.value}`} value={tier.value}>
                                {tier.label}
                              </option>
                            ))}
                          </select>
                        ),
                        required:
                          requirements.parsed.graphics && requiredGpuTier !== null
                            ? `${requirements.parsed.graphics} (Tier ${requiredGpuTier})`
                            : requirements.parsed.graphics ?? "Not specified",
                      },
                      {
                        key: "ram",
                        label: "Memory (RAM)",
                        pass:
                          requirements.parsed.memoryGb === undefined
                            ? true
                            : specs.ramGb >= requirements.parsed.memoryGb,
                        mine: (
                          <input
                            type="number"
                            min={1}
                            value={specs.ramGb}
                            onChange={(event) =>
                              updatePlayerSpecs(participant.id, "ramGb", Number(event.target.value) || 0)
                            }
                            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                          />
                        ),
                        required:
                          requirements.parsed.memoryGb !== undefined
                            ? `${requirements.parsed.memoryGb} GB`
                            : "Not specified",
                      },
                      {
                        key: "vram",
                        label: "Video memory (VRAM)",
                        pass:
                          requirements.parsed.vramGb === undefined
                            ? true
                            : specs.vramGb >= requirements.parsed.vramGb,
                        mine: (
                          <input
                            type="number"
                            min={1}
                            value={specs.vramGb}
                            onChange={(event) =>
                              updatePlayerSpecs(participant.id, "vramGb", Number(event.target.value) || 0)
                            }
                            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                          />
                        ),
                        required:
                          requirements.parsed.vramGb !== undefined
                            ? `${requirements.parsed.vramGb} GB`
                            : "Not specified",
                      },
                      {
                        key: "storage",
                        label: "Available storage",
                        pass:
                          requirements.parsed.storageGb === undefined
                            ? true
                            : specs.storageGb >= requirements.parsed.storageGb,
                        mine: (
                          <input
                            type="number"
                            min={1}
                            value={specs.storageGb}
                            onChange={(event) =>
                              updatePlayerSpecs(participant.id, "storageGb", Number(event.target.value) || 0)
                            }
                            className="h-8 w-full rounded-md border border-border bg-background px-2 text-xs"
                          />
                        ),
                        required:
                          requirements.parsed.storageGb !== undefined
                            ? `${requirements.parsed.storageGb} GB`
                            : "Not specified",
                      },
                    ]

                    const compatibilitySummary = evaluateParticipantCompatibility(participant.id, requirements)
                    const allChecksPass = compatibilitySummary.allChecksPass

                    return (
                      <section
                        key={`requirements-${participant.id}`}
                        className="rounded-xl border border-border/70 bg-card/60 p-3"
                      >
                        <div className="mb-3 flex items-center justify-between gap-2">
                          <h3 className="text-sm font-semibold">{participant.name}</h3>
                          {participant.id === "self" && (
                            <span className="text-[10px] text-primary bg-primary/10 border border-primary/20 rounded-full px-2 py-0.5">
                              Auto-saved
                            </span>
                          )}
                          <span
                            className={`inline-flex items-center gap-1 rounded-full px-2.5 py-1 text-[11px] font-medium ${
                              allChecksPass
                                ? "bg-emerald-500/15 text-emerald-600"
                                : "bg-destructive/15 text-destructive"
                            }`}
                          >
                            {allChecksPass ? (
                              <CheckCircle2 className="h-3.5 w-3.5" />
                            ) : (
                              <XCircle className="h-3.5 w-3.5" />
                            )}
                            {allChecksPass
                              ? "Minimum requirements are met"
                              : "Minimum requirements are not met"}
                          </span>
                        </div>

                        <div className="space-y-2">
                          {checks.map((check) => (
                            <div
                              key={`${participant.id}-${check.key}`}
                              className={`grid gap-2 rounded-lg border p-2 sm:grid-cols-2 ${
                                check.pass
                                  ? "border-emerald-500/30 bg-emerald-500/10"
                                  : "border-destructive/30 bg-destructive/10"
                              }`}
                            >
                              <div>
                                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                  {check.label} - Your specs
                                </p>
                                {check.mine}
                              </div>
                              <div>
                                <p className="mb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
                                  Minimum required
                                </p>
                                <p className="min-h-8 rounded-md border border-border bg-background/70 px-2 py-1.5 text-xs">
                                  {check.required}
                                </p>
                              </div>
                            </div>
                          ))}
                        </div>
                      </section>
                    )
                  })}
                </div>
              )}
            </div>
          </DialogContent>
        </Dialog>

        {/* SPECS MODAL */}
        <Dialog open={isSpecsModalOpen} onOpenChange={setIsSpecsModalOpen}>
          <DialogContent className="max-w-lg overflow-hidden border-border bg-card/95 p-0 shadow-2xl backdrop-blur-xl">
            <div className="bg-gradient-to-br from-primary/15 via-transparent to-accent/10 px-6 pt-8 pb-6">
              <DialogHeader className="items-center text-center">
                <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-lg">
                  <Cpu className="h-7 w-7" />
                </div>
                <DialogTitle>My hardware specs</DialogTitle>
                <DialogDescription className="max-w-sm text-sm">
                  Set your specs once and they'll be used automatically when checking game requirements.
                </DialogDescription>
              </DialogHeader>
            </div>

            <div className="space-y-4 px-6 py-6">
              {/* OS */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Operating System
                </label>
                <div className="grid grid-cols-3 gap-2">
                  {["Windows 10", "Windows 11", "macOS", "Linux"].map((os) => {
                    const specs = playerSpecsById["self"] ?? DEFAULT_PLAYER_SPECS
                    return (
                      <button
                        key={os}
                        type="button"
                        onClick={() => updatePlayerSpecs("self", "os", os)}
                        className={`rounded-lg border px-3 py-2 text-xs font-medium transition-colors ${
                          specs.os === os
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {os}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* CPU */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Processor (CPU)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {TIER_OPTIONS.map((tier) => {
                    const specs = playerSpecsById["self"] ?? DEFAULT_PLAYER_SPECS
                    const labels = ["Budget", "Entry", "Mid", "High", "Top"]
                    return (
                      <button
                        key={tier.value}
                        type="button"
                        onClick={() => updatePlayerSpecs("self", "cpuTier", tier.value)}
                        className={`flex flex-col items-center rounded-lg border px-2 py-2 text-xs transition-colors ${
                          specs.cpuTier === tier.value
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <span className="font-semibold">{tier.value}</span>
                        <span className="text-[9px] mt-0.5 opacity-70">{labels[tier.value - 1]}</span>
                      </button>
                    )
                  })}
                </div>
                <p className="text-[10px] text-muted-foreground">
                  1 = old budget CPU (Pentium, FX-4) · 5 = flagship (i9, Ryzen 9)
                </p>
              </div>

              {/* GPU */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Graphics Card (GPU)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {TIER_OPTIONS.map((tier) => {
                    const specs = playerSpecsById["self"] ?? DEFAULT_PLAYER_SPECS
                    const labels = ["DX10", "DX11", "GTX 9xx", "RTX 20/30", "RTX 40+"]
                    return (
                      <button
                        key={tier.value}
                        type="button"
                        onClick={() => updatePlayerSpecs("self", "gpuTier", tier.value)}
                        className={`flex flex-col items-center rounded-lg border px-2 py-2 text-xs transition-colors ${
                          specs.gpuTier === tier.value
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        <span className="font-semibold">{tier.value}</span>
                        <span className="text-[9px] mt-0.5 opacity-70">{labels[tier.value - 1]}</span>
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* RAM y VRAM */}
              <div className="grid grid-cols-2 gap-4">
                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    RAM (GB)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[4, 8, 16, 32].map((gb) => {
                      const specs = playerSpecsById["self"] ?? DEFAULT_PLAYER_SPECS
                      return (
                        <button
                          key={gb}
                          type="button"
                          onClick={() => updatePlayerSpecs("self", "ramGb", gb)}
                          className={`rounded-lg border py-2 text-xs font-medium transition-colors ${
                            specs.ramGb === gb
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {gb}
                        </button>
                      )
                    })}
                  </div>
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                    VRAM (GB)
                  </label>
                  <div className="grid grid-cols-4 gap-1.5">
                    {[2, 4, 8, 12].map((gb) => {
                      const specs = playerSpecsById["self"] ?? DEFAULT_PLAYER_SPECS
                      return (
                        <button
                          key={gb}
                          type="button"
                          onClick={() => updatePlayerSpecs("self", "vramGb", gb)}
                          className={`rounded-lg border py-2 text-xs font-medium transition-colors ${
                            specs.vramGb === gb
                              ? "border-primary bg-primary/15 text-primary"
                              : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40"
                          }`}
                        >
                          {gb}
                        </button>
                      )
                    })}
                  </div>
                </div>
              </div>

              {/* Storage */}
              <div className="space-y-1.5">
                <label className="text-xs font-medium uppercase tracking-wide text-muted-foreground">
                  Available Storage (GB)
                </label>
                <div className="grid grid-cols-5 gap-2">
                  {[50, 100, 200, 500, 1000].map((gb) => {
                    const specs = playerSpecsById["self"] ?? DEFAULT_PLAYER_SPECS
                    return (
                      <button
                        key={gb}
                        type="button"
                        onClick={() => updatePlayerSpecs("self", "storageGb", gb)}
                        className={`rounded-lg border py-2 text-xs font-medium transition-colors ${
                          specs.storageGb === gb
                            ? "border-primary bg-primary/15 text-primary"
                            : "border-border bg-secondary/30 text-muted-foreground hover:border-primary/40"
                        }`}
                      >
                        {gb}
                      </button>
                    )
                  })}
                </div>
              </div>

              {/* Resumen */}
              <div className="rounded-xl border border-primary/20 bg-primary/5 px-4 py-3 text-xs text-muted-foreground">
                <p className="font-medium text-foreground mb-1">Current specs</p>
                {(() => {
                  const specs = playerSpecsById["self"] ?? DEFAULT_PLAYER_SPECS
                  return (
                    <p>
                      {specs.os} · CPU Tier {specs.cpuTier} · GPU Tier {specs.gpuTier} · {specs.ramGb}GB RAM · {specs.vramGb}GB VRAM · {specs.storageGb}GB Storage
                    </p>
                  )
                })()}
                <p className="mt-1 text-[10px] text-primary/70">Changes are saved automatically.</p>
              </div>

              <Button
                type="button"
                className="w-full"
                onClick={() => setIsSpecsModalOpen(false)}
              >
                Done
              </Button>
            </div>
          </DialogContent>
        </Dialog>
      </div>
    </main>
  )
}
