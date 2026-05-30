"use client"

import { useState } from "react"
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
  const [dragOverProfileId, setDragOverProfileId] = useState<string | null>(null)

  return (
    <Card className="flex flex-col border-border/70 bg-card/50">
      <CardHeader className="space-y-1 border-b border-border/70 px-5 pb-4 pt-5">
        <CardTitle className="text-xl">Friends</CardTitle>
        <CardDescription>Click a card to select. Drag the handle to merge identities.</CardDescription>
      </CardHeader>

      <CardContent className="space-y-4 p-5">
        {tipVisible && (
          <div className="relative rounded-lg border border-primary/30 bg-primary/10 p-3 text-xs text-primary">
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
            <p className="mt-2 inline-flex items-center gap-1">
              <UserRoundPlus className="h-3.5 w-3.5" />
              Merging between users of the same platform is blocked.
            </p>
          </div>
        )}

        {mergeNotice && <p className="text-xs text-amber-500">{mergeNotice}</p>}

        {selectedCount > 0 && (
          <Badge variant="secondary" className="inline-flex w-fit items-center gap-2 rounded-full px-3 py-1 text-xs text-emerald-700">
            <span className="h-2 w-2 rounded-full bg-emerald-500" />
            Filtering with {selectedCount} selected {selectedCount === 1 ? "friend" : "friends"}
          </Badge>
        )}

        <ScrollArea className="h-[calc(100vh-20rem)] pr-1">
          <div className="space-y-3">
            {allFriendProfiles.map((profile) => {
              const primaryIdentity = profile.identities[0]
              const hasMultipleIdentities = profile.identities.length > 1
              const hasLoadingIdentity = profile.identities.some((identity) => loadingIdentities[identityKey(identity)])
              const firstIdentityError = profile.identities.map((identity) => identityErrors[identityKey(identity)]).find((message) => Boolean(message))

              const isDragSource = draggingProfileId === profile.profileId
              const isDragTarget = dragOverProfileId === profile.profileId && draggingProfileId !== profile.profileId

              const articleClass = [
                "select-none cursor-pointer rounded-xl border p-3 transition-all duration-150",
                isDragSource
                  ? "opacity-40 border-dashed border-primary/30 bg-secondary/10"
                  : isDragTarget
                    ? "border-primary/60 bg-primary/15 ring-2 ring-primary/25 shadow-md shadow-primary/10"
                    : profile.selected
                      ? "border-primary/50 bg-primary/10"
                      : "border-border bg-secondary/20 hover:bg-secondary/30",
              ].join(" ")

              return (
                <article
                  key={profile.profileId}
                  onDragOver={(event) => {
                    if (!canDragMerge) return
                    event.preventDefault()
                    if (dragOverProfileId !== profile.profileId) {
                      setDragOverProfileId(profile.profileId)
                    }
                  }}
                  onDrop={() => {
                    setDragOverProfileId(null)
                    onDrop(profile.profileId)
                  }}
                  onClick={() => onToggleSelection(profile.profileId)}
                  className={articleClass}
                >
                  <div className="flex items-center gap-3">
                    <div
                      draggable={canDragMerge}
                      onDragStart={(e) => {
                        e.stopPropagation()

                        // Use the whole card as the drag image with a lifted look
                        const card = e.currentTarget.closest("article")
                        if (card) {
                          const clone = card.cloneNode(true) as HTMLElement
                          clone.style.position = "fixed"
                          clone.style.top = "-1000px"
                          clone.style.left = "0"
                          clone.style.width = `${card.offsetWidth}px`
                          clone.style.transform = "rotate(2deg) scale(1.03)"
                          clone.style.boxShadow = "0 24px 48px -8px rgba(0,0,0,0.6), 0 8px 16px -4px rgba(0,0,0,0.3)"
                          clone.style.borderRadius = "12px"
                          clone.style.opacity = "0.95"
                          document.body.appendChild(clone)
                          e.dataTransfer.setDragImage(clone, card.offsetWidth / 2, 36)
                          requestAnimationFrame(() => document.body.removeChild(clone))
                        }

                        onDragStart(profile.profileId)
                      }}
                      onDragEnd={(e) => {
                        e.stopPropagation()
                        setDragOverProfileId(null)
                        onDragEnd()
                      }}
                      onClick={(e) => e.stopPropagation()}
                      className={[
                        "shrink-0 rounded p-0.5 transition-colors",
                        canDragMerge
                          ? "cursor-grab active:cursor-grabbing text-muted-foreground hover:text-foreground"
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
    </Card>
  )
}
