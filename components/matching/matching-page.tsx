"use client"

import { useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { fetchGameRequirements } from "@/lib/api"
import {
  DEFAULT_PLAYER_SPECS,
  RECOMMENDED_GAMES,
  buildSelectedLibrarySets,
  canMergeProfiles,
  dedupeGameCards,
  evaluateParticipantCompatibility,
  filterGamesByCategories,
  filterSharedGames,
  getAvailableCategories,
  identityKey,
  mergeProfileIdentities,
  toStoredIdentities,
} from "@/lib/matching"
import { updateStoredUserProfile } from "@/lib/user-profile"
import { useGameCategories } from "@/hooks/use-game-categories"
import { useIdentityLibrary } from "@/hooks/use-identity-library"
import { useMatchingInit } from "@/hooks/use-matching-init"
import type {
  CategoryFilterMode,
  GameCard,
  GameRequirementsPayload,
  PlayerSystemSpecs,
  RequirementsParticipant,
} from "@/types"
import { MatchingFriendsPanel } from "./matching-friends-panel"
import { MatchingHeader } from "./matching-header"
import { MatchingLibraryPanel } from "./matching-library-panel"
import { MatchingRecommendationsPanel } from "./matching-recommendations-panel"
import { MatchingRequirementsDialog } from "./matching-requirements-dialog"
import { MatchingSpecsDialog } from "./matching-specs-dialog"
import { Spinner } from "../ui/spinner"

export function MatchingPage() {
  const recommendationsRef = useRef<HTMLDivElement | null>(null)

  const {
    currentUser,
    loading,
    pageError,
    steamId,
    availablePlatforms,
    userGames,
    epicGames,
    gamePassGames,
    friendProfiles,
    epicFriends,
    identityLibraries,
    playerSpecsById,
    setFriendProfiles,
    setEpicFriends,
    setIdentityLibraries,
    setPlayerSpecsById,
  } = useMatchingInit()

  const [draggingProfileId, setDraggingProfileId] = useState<string | null>(null)
  const [mergeNotice, setMergeNotice] = useState<string | null>(null)
  const [selectedCategories, setSelectedCategories] = useState<string[]>([])
  const [categoryFilterMode, setCategoryFilterMode] = useState<CategoryFilterMode>("or")
  const [requirementsByApp, setRequirementsByApp] = useState<Record<number, GameRequirementsPayload>>({})
  const [requirementsLoadingByApp, setRequirementsLoadingByApp] = useState<Record<number, boolean>>({})
  const [requirementsErrorByApp, setRequirementsErrorByApp] = useState<Record<number, string | null>>({})
  const [selectedGameForRequirements, setSelectedGameForRequirements] = useState<GameCard | null>(null)
  const [isRequirementsModalOpen, setIsRequirementsModalOpen] = useState(false)
  const [isSpecsModalOpen, setIsSpecsModalOpen] = useState(false)

  const { loadingIdentities, identityErrors } = useIdentityLibrary(friendProfiles, identityLibraries, setIdentityLibraries)

  const allFriendProfiles = useMemo(() => [...friendProfiles, ...epicFriends], [friendProfiles, epicFriends])
  const allUserGames = useMemo(() => dedupeGameCards([...userGames, ...epicGames, ...gamePassGames]), [userGames, epicGames, gamePassGames])

  const filteredGames = useMemo(() => {
    const selectedProfiles = allFriendProfiles.filter((profile) => profile.selected)
    const librarySets = buildSelectedLibrarySets(selectedProfiles, identityLibraries, gamePassGames, identityKey)
    return filterSharedGames(allUserGames, librarySets)
  }, [allFriendProfiles, identityLibraries, allUserGames, gamePassGames])

  const { categoriesByApp, isLoadingCategories, categoryFilterError } = useGameCategories(filteredGames)
  const availableCategories = useMemo(() => getAvailableCategories(filteredGames, categoriesByApp), [filteredGames, categoriesByApp])
  const categoryFilteredGames = useMemo(
    () => filterGamesByCategories(filteredGames, categoriesByApp, selectedCategories, categoryFilterMode),
    [filteredGames, categoriesByApp, selectedCategories, categoryFilterMode],
  )

  const requirementsParticipants = useMemo<RequirementsParticipant[]>(
    () => [
      { id: "self", name: "You" },
      ...allFriendProfiles
        .filter((profile) => profile.selected)
        .map((profile) => ({ id: profile.profileId, name: profile.identities[0]?.displayName ?? "Player" })),
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
  }, [requirementsParticipants, setPlayerSpecsById])

  const toggleFriendSelection = (profileId: string) => {
    setFriendProfiles((prev) => prev.map((profile) => (profile.profileId === profileId ? { ...profile, selected: !profile.selected } : profile)))
    setEpicFriends((prev) => prev.map((profile) => (profile.profileId === profileId ? { ...profile, selected: !profile.selected } : profile)))
  }

  const toggleProfileExpanded = (profileId: string) => {
    setFriendProfiles((prev) => prev.map((profile) => (profile.profileId === profileId ? { ...profile, expanded: !profile.expanded } : profile)))
    setEpicFriends((prev) => prev.map((profile) => (profile.profileId === profileId ? { ...profile, expanded: !profile.expanded } : profile)))
  }

  const mergeProfiles = (sourceId: string, targetId: string) => {
    if (sourceId === targetId) return

    const source = friendProfiles.find((profile) => profile.profileId === sourceId)
    const target = friendProfiles.find((profile) => profile.profileId === targetId)
    if (!source || !target) return

    const mergeCheck = canMergeProfiles(source, target, availablePlatforms.length)
    if (!mergeCheck.ok) {
      setMergeNotice(mergeCheck.reason)
      return
    }

    setMergeNotice(null)

    setFriendProfiles((prev) => {
      const sourceProfile = prev.find((profile) => profile.profileId === sourceId)
      const targetProfile = prev.find((profile) => profile.profileId === targetId)
      if (!sourceProfile || !targetProfile) return prev

      const mergedIdentities = mergeProfileIdentities(sourceProfile, targetProfile)

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
        const mergedLibraryAppIds = Array.from(new Set([...(targetStored?.libraryAppIds ?? []), ...(sourceStored?.libraryAppIds ?? [])]))

        return {
          ...profile,
          friends: profile.friends
            .filter((friend) => friend.profileId !== sourceProfile.profileId)
            .map((friend) =>
              friend.profileId === targetProfile.profileId
                ? {
                    ...friend,
                    identities: toStoredIdentities(mergedIdentities),
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

  const unmergeProfile = (profileId: string) => {
    setFriendProfiles((prev) => {
      const profile = prev.find((p) => p.profileId === profileId)
      if (!profile || profile.identities.length <= 1) return prev

      const splitProfiles = profile.identities.map((identity) => ({
        profileId: `profile:${identity.platform}:${identity.accountId}`,
        identities: [identity],
        connections: { steamId: null, epicAccountId: null, hasGamePass: false },
        selected: false,
        expanded: false,
      }))

      updateStoredUserProfile((stored) => {
        const storedProfile = stored.friends.find((f) => f.profileId === profileId)
        if (!storedProfile || storedProfile.identities.length <= 1) return stored

        const splitStored = toStoredIdentities(profile.identities).map((identity) => ({
          profileId: `profile:${identity.platform}:${identity.accountId}`,
          identities: [identity],
          connections: { steamId: null, epicAccountId: null, hasGamePass: false } as const,
          selected: false,
          expanded: false,
          libraryAppIds: storedProfile.libraryAppIds,
          libraryTitles: storedProfile.libraryTitles,
        }))

        return {
          ...stored,
          friends: [...stored.friends.filter((f) => f.profileId !== profileId), ...splitStored],
        }
      })

      return [...prev.filter((p) => p.profileId !== profileId), ...splitProfiles]
    })
  }

  const canDragMerge = availablePlatforms.length >= 2
  const selectedProfiles = allFriendProfiles.filter((profile) => profile.selected)
  const selectedCount = selectedProfiles.length

  const updatePlayerSpecs = (participantId: string, field: keyof PlayerSystemSpecs, value: string | number) => {
    setPlayerSpecsById((prev) => {
      const current = prev[participantId] ?? { ...DEFAULT_PLAYER_SPECS }
      const updated = { ...current, [field]: value }

      if (participantId === "self") {
        updateStoredUserProfile((profile) => ({ ...profile, playerSpecs: updated }))
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
      const searchName = game.platform === "xbox" || game.platform === "import" ? game.name : undefined
      const payload = await fetchGameRequirements(game.appId, searchName)
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

  const getParticipantCompatibility = (participantId: string, requirements: GameRequirementsPayload) => {
    const specs = playerSpecsById[participantId] ?? DEFAULT_PLAYER_SPECS
    return evaluateParticipantCompatibility(specs, requirements)
  }

  const scrollRecommendations = (direction: -1 | 1) => {
    const container = recommendationsRef.current
    if (!container) return

    container.scrollBy({ left: direction * container.clientWidth, behavior: "smooth" })
  }

  if (loading) {
    return (
      <main className="min-h-screen bg-background px-6 py-16 lg:px-12 flex">
        <div className="mx-auto max-w-7xl flex-1 flex justify-center items-center">
          <Spinner className="w-[10%] h-[10%] text-quaternary" />
        </div>
      </main>
    )
  }

  if (pageError) {
    return (
      <main className="min-h-screen bg-background px-6 py-16 lg:px-12">
        <div className="mx-auto max-w-4xl rounded-2xl border border-destructive/40 bg-destructive/10 p-6">
          <h1 className="mb-2 text-2xl font-bold">Failed to prepare matching</h1>
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
    <main className="h-screen bg-background px-4 lg:px-12">
      <div className="mx-auto max-w-7xl">
        <MatchingHeader currentUser={currentUser} steamId={steamId} onOpenSpecs={() => setIsSpecsModalOpen(true)} />

        <section className="grid gap-6 lg:grid-cols-[2.2fr_1fr] lg:h-[calc(100vh-10rem)] lg:grid-rows-1">
          <MatchingLibraryPanel
            allUserGames={allUserGames}
            categoryFilteredGames={categoryFilteredGames}
            selectedCount={selectedCount}
            selectedProfiles={selectedProfiles}
            identityLibraries={identityLibraries}
            availableCategories={availableCategories}
            selectedCategories={selectedCategories}
            categoryFilterMode={categoryFilterMode}
            isLoadingCategories={isLoadingCategories}
            categoryFilterError={categoryFilterError}
            categoriesByApp={categoriesByApp}
            onToggleCategory={(category) =>
              setSelectedCategories((prev) =>
                prev.includes(category) ? prev.filter((value) => value !== category) : [...prev, category],
              )
            }
            onSetCategoryFilterMode={setCategoryFilterMode}
            onClearFilters={() => setSelectedCategories([])}
            onOpenRequirements={openRequirementsModal}
            onToggleSelection={toggleFriendSelection}
          />

          <aside className="flex flex-col gap-4 lg:h-full lg:overflow-y-auto">
            <MatchingFriendsPanel
              allFriendProfiles={allFriendProfiles}
              canDragMerge={canDragMerge}
              draggingProfileId={draggingProfileId}
              loadingIdentities={loadingIdentities}
              identityErrors={identityErrors}
              mergeNotice={mergeNotice}
              selectedCount={selectedCount}
              onToggleSelection={toggleFriendSelection}
              onToggleExpanded={toggleProfileExpanded}
              onDragStart={setDraggingProfileId}
              onDragEnd={() => setDraggingProfileId(null)}
              onDrop={(targetProfileId) => {
                if (draggingProfileId) {
                  mergeProfiles(draggingProfileId, targetProfileId)
                }
                setDraggingProfileId(null)
              }}
              onUnmerge={unmergeProfile}
            />
          </aside>
        </section>

        <MatchingRequirementsDialog
          open={isRequirementsModalOpen}
          onOpenChange={setIsRequirementsModalOpen}
          selectedGame={selectedGameForRequirements}
          requirementsByApp={requirementsByApp}
          requirementsLoadingByApp={requirementsLoadingByApp}
          requirementsErrorByApp={requirementsErrorByApp}
          requirementsParticipants={requirementsParticipants}
          playerSpecsById={playerSpecsById}
          onUpdatePlayerSpecs={updatePlayerSpecs}
          getParticipantCompatibility={getParticipantCompatibility}
        />

        <MatchingSpecsDialog
          open={isSpecsModalOpen}
          onOpenChange={setIsSpecsModalOpen}
          playerSpecsById={playerSpecsById}
          onUpdatePlayerSpecs={updatePlayerSpecs}
        />
      </div>
    </main>
  )
}
