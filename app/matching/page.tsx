"use client"

import { useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { CheckCircle2, UserRoundPlus, ArrowLeft } from "lucide-react"

type Platform = "steam" | "epic" | "xbox"
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

type GameCard = {
  appId: number
  name: string
  imageUrl: string
  rating: number
  players: string
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
  selected: boolean
  expanded: boolean
}

const STEAM_SESSION_KEY = "qcoop-steam-id"
const EPIC_CONNECTED_SESSION_KEY = "qcoop-epic-connected"
const XBOX_CONNECTED_SESSION_KEY = "qcoop-xbox-connected"

function identityKey(identity: IdentityRef): string {
  return `${identity.platform}:${identity.accountId}`
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

function toGameCards(games: SteamOwnedGame[]): GameCard[] {
  return games.map((game) => ({
    appId: game.appid,
    name: game.name ?? `Steam App ${game.appid}`,
    imageUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
    rating: deriveRating(game.appid),
    players: derivePlayers(game.appid),
  }))
}

export default function MatchingPage() {
  const router = useRouter()

  const [steamId, setSteamId] = useState<string | null>(null)
  const [availablePlatforms, setAvailablePlatforms] = useState<Platform[]>([])
  const [loading, setLoading] = useState(true)
  const [pageError, setPageError] = useState<string | null>(null)

  const [userGames, setUserGames] = useState<GameCard[]>([])
  const [friendProfiles, setFriendProfiles] = useState<FriendProfile[]>([])

  const [draggingProfileId, setDraggingProfileId] = useState<string | null>(null)
  const [mergeNotice, setMergeNotice] = useState<string | null>(null)

  const [identityLibraries, setIdentityLibraries] = useState<Record<string, Set<number>>>({})
  const [loadingIdentities, setLoadingIdentities] = useState<Record<string, boolean>>({})
  const [identityErrors, setIdentityErrors] = useState<Record<string, string | null>>({})
  const [categoriesByApp, setCategoriesByApp] = useState<Record<number, string[]>>({})
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [categoryFilterError, setCategoryFilterError] = useState<string | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [categoryFilterMode, setCategoryFilterMode] = useState<CategoryFilterMode>("or")

  useEffect(() => {
    const initialize = async () => {
      const storedSteamId = window.sessionStorage.getItem(STEAM_SESSION_KEY)
      const epicConnected = window.sessionStorage.getItem(EPIC_CONNECTED_SESSION_KEY) === "true"
      const xboxConnected = window.sessionStorage.getItem(XBOX_CONNECTED_SESSION_KEY) === "true"

      if (!storedSteamId) {
        router.push("/")
        return
      }

      const platforms: Platform[] = ["steam"]
      if (epicConnected) {
        platforms.push("epic")
      }
      if (xboxConnected) {
        platforms.push("xbox")
      }

      setAvailablePlatforms(platforms)

      setSteamId(storedSteamId)
      setLoading(true)
      setPageError(null)

      try {
        const [gamesRes, friendsRes] = await Promise.all([
          fetch(`/api/steam/owned-games?steamId=${storedSteamId}`),
          fetch(`/api/steam/friends?steamId=${storedSteamId}`),
        ])

        const gamesJson = (await gamesRes.json()) as OwnedGamesPayload & { error?: string }
        const friendsJson = (await friendsRes.json()) as FriendsPayload & { error?: string }

        if (!gamesRes.ok) {
          throw new Error(gamesJson.error || "Failed to fetch your Steam library")
        }

        if (!friendsRes.ok) {
          throw new Error(friendsJson.error || "Failed to fetch your Steam friends")
        }

        const ownedGames = gamesJson.data?.response?.games ?? []
        setUserGames(toGameCards(ownedGames))

        const profiles = (friendsJson.friends ?? []).map((friend) => ({
          profileId: `profile:steam:${friend.steamId}`,
          identities: [
            {
              platform: "steam" as const,
              accountId: friend.steamId,
              displayName: friend.name,
              avatar: friend.avatar ?? null,
            },
          ],
          selected: false,
          expanded: false,
        }))

        setFriendProfiles(profiles)
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
      setIdentityErrors((prev) => ({ ...prev, [key]: "Library import for this platform is not available yet." }))
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
      setIdentityLibraries((prev) => ({ ...prev, [key]: new Set(appIds) }))
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
      prev.map((profile) =>
        profile.profileId === profileId ? { ...profile, selected: !profile.selected } : profile,
      ),
    )
  }

  const toggleProfileExpanded = (profileId: string) => {
    setFriendProfiles((prev) =>
      prev.map((profile) =>
        profile.profileId === profileId ? { ...profile, expanded: !profile.expanded } : profile,
      ),
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

      return prev
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
    })
  }

  const canDragMerge = availablePlatforms.length >= 2

  const filteredGames = useMemo(() => {
    const selectedProfiles = friendProfiles.filter((profile) => profile.selected)
    if (selectedProfiles.length === 0) {
      return userGames
    }

    const selectedSets = selectedProfiles.map((profile) => {
      const mergedSet = new Set<number>()
      profile.identities.forEach((identity) => {
        const library = identityLibraries[identityKey(identity)]
        if (library) {
          library.forEach((appId) => mergedSet.add(appId))
        }
      })
      return mergedSet
    })

    return userGames.filter((game) => selectedSets.every((set) => set.has(game.appId)))
  }, [friendProfiles, identityLibraries, userGames])

  useEffect(() => {
    if (filteredGames.length === 0) {
      return
    }

    const missingAppIds = filteredGames
      .map((game) => game.appId)
      .filter((appId) => !(appId in categoriesByApp))
      .slice(0, 80)

    if (missingAppIds.length === 0) {
      return
    }

    let isCancelled = false

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

  const selectedCount = friendProfiles.filter((profile) => profile.selected).length
  const selectedProfiles = friendProfiles.filter((profile) => profile.selected)

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
            <p className="text-xs text-muted-foreground mt-2">Signed in with Steam ID: {steamId}</p>
          </div>
          <div className="flex gap-3">
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
                  : `${userGames.length} games in your library`}
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

            <div className="max-h-[calc(100vh-16rem)] overflow-y-auto pr-1">
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
              {categoryFilteredGames.map((game) => (
                <article
                  key={game.appId}
                  className="overflow-hidden rounded-xl border border-border bg-secondary/20"
                >
                  <div className="h-20 w-full bg-secondary/40">
                    <img
                      src={game.imageUrl}
                      alt={game.name}
                      className="h-full w-full object-cover"
                      loading="lazy"
                    />
                  </div>
                  <div className="space-y-1 p-2.5">
                    <h3 className="font-medium leading-tight text-sm line-clamp-2">{game.name}</h3>
                    <div className="flex items-center justify-between text-xs text-muted-foreground">
                      <span>{game.players} players</span>
                      <span>Rating {game.rating}</span>
                    </div>
                    <div className="flex flex-wrap gap-1 pt-1">
                      {(categoriesByApp[game.appId] ?? []).slice(0, 2).map((category) => (
                        <span
                          key={`${game.appId}-${category}`}
                          className="rounded-full border border-border/80 bg-background/70 px-1.5 py-0.5 text-[9px] uppercase tracking-wide text-muted-foreground"
                        >
                          {category}
                        </span>
                      ))}
                    </div>
                  </div>
                </article>
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
                            key={`group-${profile.profileId}-${identityKey(identity)}`}
                            className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary"
                          >
                            {identity.platform}
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

              <div className="max-h-[calc(100vh-20rem)] overflow-y-auto pr-1">
              <div className="space-y-3">
              {friendProfiles.map((profile) => {
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
                      <input
                        type="checkbox"
                        checked={profile.selected}
                        onChange={() => toggleFriendSelection(profile.profileId)}
                        className="h-4 w-4 accent-primary"
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
                            className="rounded-full bg-primary/15 px-2 py-0.5 text-[10px] uppercase tracking-wide text-primary"
                          >
                            {identity.platform}
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

              {friendProfiles.length === 0 && (
                <p className="text-sm text-muted-foreground">No Steam friends available to import.</p>
              )}
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
              </div>
            </section>
          </aside>
        </section>
      </div>
    </main>
  )
}
