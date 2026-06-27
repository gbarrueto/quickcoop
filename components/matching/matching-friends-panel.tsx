"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { GitMerge, GripVertical, UserRoundPlus, X } from "lucide-react"
import { identityKey } from "@/lib/matching"
import type { FriendProfile } from "@/types"
import { PlatformBadge } from "./platform-badge"

type MatchingFriendsPanelProps = {
  allFriendProfiles: FriendProfile[]
  canDragMerge: boolean
  draggingProfileId: string | null
  loadingIdentities: Record<string, boolean>
  identityErrors: Record<string, string | null>
  mergeNotice: string | null
  selectedCount: number
  onToggleSelection: (profileId: string) => void
  onToggleExpanded: (profileId: string) => void
  onDragStart: (profileId: string) => void
  onDragEnd: () => void
  onDrop: (targetProfileId: string) => void
  onUnmerge: (profileId: string) => void
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

export function MatchingFriendsPanel({
  allFriendProfiles,
  canDragMerge,
  draggingProfileId,
  loadingIdentities,
  identityErrors,
  mergeNotice,
  selectedCount,
  onToggleSelection,
  onToggleExpanded,
  onDragStart,
  onDragEnd,
  onDrop,
  onUnmerge,
}: MatchingFriendsPanelProps) {
  const [tipVisible, setTipVisible] = useState(true)
  const [dragPos, setDragPos] = useState<{ x: number; y: number } | null>(null)
  const [dragOverProfileId, setDragOverProfileId] = useState<string | null>(null)

  // Stable refs to avoid stale closures inside the mounted effect
  const draggingRef = useRef<{ profileId: string; cardWidth: number } | null>(null)
  const callbacksRef = useRef({ onDragStart, onDragEnd, onDrop })
  callbacksRef.current = { onDragStart, onDragEnd, onDrop }

  const stopDrag = useCallback((targetProfileId?: string) => {
    if (!draggingRef.current) return
    const { profileId } = draggingRef.current
    draggingRef.current = null
    setDragPos(null)
    setDragOverProfileId(null)
    document.body.style.cursor = ""
    document.body.style.userSelect = ""

    if (targetProfileId && targetProfileId !== profileId) {
      callbacksRef.current.onDrop(targetProfileId)
    } else {
      callbacksRef.current.onDragEnd()
    }
  }, [])

  useEffect(() => {
    const handleMove = (e: PointerEvent) => {
      if (!draggingRef.current) return
      setDragPos({ x: e.clientX, y: e.clientY })

      const el = document.elementFromPoint(e.clientX, e.clientY)
      const article = el?.closest("[data-profile-id]") as HTMLElement | null
      const targetId = article?.dataset.profileId ?? null
      const newTarget = targetId !== draggingRef.current.profileId ? targetId : null
      setDragOverProfileId((prev) => (prev !== newTarget ? newTarget : prev))
    }

    const handleUp = (e: PointerEvent) => {
      if (!draggingRef.current) return
      const el = document.elementFromPoint(e.clientX, e.clientY)
      const article = el?.closest("[data-profile-id]") as HTMLElement | null
      stopDrag(article?.dataset.profileId ?? undefined)
    }

    const handleKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") stopDrag()
    }

    window.addEventListener("pointermove", handleMove)
    window.addEventListener("pointerup", handleUp)
    window.addEventListener("keydown", handleKey)
    return () => {
      window.removeEventListener("pointermove", handleMove)
      window.removeEventListener("pointerup", handleUp)
      window.removeEventListener("keydown", handleKey)
    }
  }, [stopDrag])

  const draggingProfile = draggingProfileId
    ? allFriendProfiles.find((p) => p.profileId === draggingProfileId) ?? null
    : null
  const ghostWidth = draggingRef.current?.cardWidth ?? 280
  const hasEpicFriends = allFriendProfiles.some((profile) =>
    profile.identities.some((identity) => identity.platform === "epic"),
  )

  return (
    <Card className="flex flex-col border-border/70 bg-background/80 h-full gap-0 py-0 pt-2 overflow-hidden">
      <CardHeader className="border-border/70 px-5 shrink-0">
        <CardTitle className="text-xs">Friends</CardTitle>
        <CardDescription className="text-xs">Click to select. Drag to merge.</CardDescription>
        {hasEpicFriends && (
          <CardDescription className="text-xs">
            Epic friends only show their library if they're also on QuickCoop.
          </CardDescription>
        )}
      </CardHeader>

      <CardContent className="space-y-2 p-5 flex flex-col flex-1 min-h-0 gap-1.5">
        {tipVisible && (
          <div className="relative shrink-0 rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
            <button
              type="button"
              onClick={() => setTipVisible(false)}
              className="absolute right-2 top-2 rounded p-0.5 text-primary/60 transition-colors hover:text-primary"
              aria-label="Dismiss tip"
            >
              <X className="h-3.5 w-3.5" />
            </button>
            <p className="font-medium">Merge tip</p>
            <p className="mt-1">Hold and drag the grip handle onto another friend to merge identities across platforms.</p>
          </div>
        )}

        {mergeNotice && <p className="shrink-0 text-xs text-secondary font-bold">{mergeNotice}</p>}

        {selectedCount > 0 && (
          <Badge variant="secondary" className="inline-flex w-fit shrink-0 items-center gap-2 rounded-full px-3 py-1 text-xs text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Filtering with {selectedCount} selected {selectedCount === 1 ? "friend" : "friends"}
          </Badge>
        )}

        <ScrollArea className="flex-1 min-h-0 pr-1">
          <div className="space-y-3">
            {allFriendProfiles.map((profile) => {
              const primaryIdentity = profile.identities[0]
              const hasMultipleIdentities = profile.identities.length > 1
              const hasLoadingIdentity = profile.identities.some((identity) => loadingIdentities[identityKey(identity)])
              const firstIdentityError = profile.identities.map((identity) => identityErrors[identityKey(identity)]).find(Boolean)

              const qcoopUsername = profile.identities.find((identity) => identity.qcoopUsername)?.qcoopUsername

              const isDragSource = draggingProfileId === profile.profileId
              const isDragTarget = dragOverProfileId === profile.profileId && draggingProfileId !== profile.profileId

              const articleClass = [
                "select-none cursor-pointer rounded-xl border p-3 transition-all duration-150",
                isDragSource
                  ? "opacity-40 border-dashed border-primary/30 bg-secondary/10"
                  : isDragTarget
                    ? "border-primary/60 bg-primary/15 ring-2 ring-primary/25 shadow-md shadow-primary/10 text-secondary"
                    : profile.selected
                      ? "border-tertiary/70 bg-tertiary/80"
                      : "border-tertiary/50 bg-tertiary/10 hover:bg-tertiary/20 text-white/60 hover:text-white/90",
              ].join(" ")

              return (
                <article
                  key={profile.profileId}
                  data-profile-id={profile.profileId}
                  onClick={() => onToggleSelection(profile.profileId)}
                  className={articleClass}
                >
                  <div className="flex items-center gap-3">
                    <div
                      onPointerDown={(e) => {
                        if (!canDragMerge) return
                        e.stopPropagation()
                        e.preventDefault()
                        const card = e.currentTarget.closest("article")
                        draggingRef.current = {
                          profileId: profile.profileId,
                          cardWidth: card?.offsetWidth ?? 280,
                        }
                        setDragPos({ x: e.clientX, y: e.clientY })
                        callbacksRef.current.onDragStart(profile.profileId)
                        document.body.style.cursor = "grabbing"
                        document.body.style.userSelect = "none"
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={[
                        "shrink-0 rounded p-0.5 transition-colors",
                        canDragMerge
                          ? "cursor-grab text-muted-foreground hover:text-foreground"
                          : "cursor-default text-muted-foreground/25",
                      ].join(" ")}
                    >
                      <GripVertical className="h-4 w-4" />
                    </div>

                    <Avatar className="h-9 w-9">
                      <AvatarFallback className="text-[11px]">{getInitials(primaryIdentity?.displayName ?? "P")}</AvatarFallback>
                    </Avatar>

                    <div className="min-w-0 flex-1">
                      <p className="truncate text-sm font-medium">{primaryIdentity?.displayName}</p>
                      {qcoopUsername && <p className="truncate text-xs text-emerald-500">On QuickCoop as {qcoopUsername}</p>}
                      {hasLoadingIdentity && <p className="text-xs text-primary">Loading library...</p>}
                      {firstIdentityError && <p className="text-xs text-destructive">{firstIdentityError}</p>}
                    </div>

                    <div className="flex items-center gap-1">
                      {profile.identities.map((identity) => (
                        <PlatformBadge key={identityKey(identity)} platform={identity.platform} />
                      ))}
                    </div>
                  </div>

                  {hasMultipleIdentities && (
                    <div className="mt-2 border-t border-border/70 pt-2">
                      <div className="flex items-center justify-between gap-2">
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onToggleExpanded(profile.profileId) }}
                          className="text-xs text-muted-foreground transition-colors hover:text-foreground"
                        >
                          {profile.expanded ? "Hide merged identities" : "Show merged identities"}
                        </button>
                        <button
                          type="button"
                          onClick={(e) => { e.stopPropagation(); onUnmerge(profile.profileId) }}
                          className="inline-flex items-center gap-1 text-xs text-amber-500/80 transition-colors hover:text-amber-500"
                        >
                          <GitMerge className="h-3 w-3" />
                          Un-merge
                        </button>
                      </div>

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

            {allFriendProfiles.length === 0 && <p className="text-sm text-muted-foreground">No friends available to import.</p>}
          </div>
        </ScrollArea>
      </CardContent>

      {/* Floating drag ghost — follows the pointer, pointer-events:none so hit detection works through it */}
      {draggingProfile && dragPos && (
        <div
          className="pointer-events-none fixed z-50 rounded-xl border border-primary/40 bg-card p-3 shadow-[0_24px_48px_-8px_rgba(0,0,0,0.6),_0_8px_16px_-4px_rgba(0,0,0,0.3)]"
          style={{
            left: dragPos.x - ghostWidth / 2,
            top: dragPos.y - 36,
            width: ghostWidth,
            transform: "rotate(2deg) scale(1.03)",
            opacity: 0.95,
          }}
        >
          <div className="flex items-center gap-3">
            <GripVertical className="h-4 w-4 shrink-0 text-muted-foreground/25" />
            <Avatar className="h-9 w-9">
              <AvatarFallback className="text-[11px]">{getInitials(draggingProfile.identities[0]?.displayName ?? "P")}</AvatarFallback>
            </Avatar>
            <div className="min-w-0 flex-1">
              <p className="truncate text-sm font-medium">{draggingProfile.identities[0]?.displayName}</p>
            </div>
            <div className="flex items-center gap-1">
              {draggingProfile.identities.map((identity) => (
                <PlatformBadge key={identityKey(identity)} platform={identity.platform} />
              ))}
            </div>
          </div>
        </div>
      )}
    </Card>
  )
}
