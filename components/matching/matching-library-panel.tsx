import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Users } from "lucide-react"
import { identityKey } from "@/lib/matching"
import type { CategoryFilterMode, FriendLibrarySnapshot, FriendProfile, GameCard } from "@/types"
import { PlatformBadge } from "./platform-badge"

type MatchingLibraryPanelProps = {
  allUserGames: GameCard[]
  categoryFilteredGames: GameCard[]
  selectedCount: number
  selectedProfiles: FriendProfile[]
  identityLibraries: Record<string, FriendLibrarySnapshot>
  availableCategories: string[]
  selectedCategories: string[]
  categoryFilterMode: CategoryFilterMode
  isLoadingCategories: boolean
  categoryFilterError: string | null
  categoriesByApp: Record<number, string[]>
  onToggleCategory: (category: string) => void
  onSetCategoryFilterMode: (mode: CategoryFilterMode) => void
  onClearFilters: () => void
  onOpenRequirements: (game: GameCard) => void
  onToggleSelection: (profileId: string) => void
}

function getInitials(value: string) {
  return value
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() ?? "")
    .join("")
}

function countGames(profile: FriendProfile, identityLibraries: Record<string, FriendLibrarySnapshot>): number {
  const allIds = new Set<number>()
  profile.identities.forEach((identity) => {
    identityLibraries[identityKey(identity)]?.appIds.forEach((id) => allIds.add(id))
  })
  return allIds.size
}

function FriendAvatarStack({
  profiles,
  identityLibraries,
  onToggleSelection,
}: {
  profiles: FriendProfile[]
  identityLibraries: Record<string, FriendLibrarySnapshot>
  onToggleSelection: (profileId: string) => void
}) {
  return (
    <div className="flex items-center">
      {profiles.map((profile, index) => {
        const name = profile.identities[0]?.displayName ?? "?"
        const gameCount = countGames(profile, identityLibraries)

        return (
          <Tooltip key={profile.profileId}>
            <TooltipTrigger asChild>
              <button
                type="button"
                onClick={() => onToggleSelection(profile.profileId)}
                className="relative rounded-full ring-2 ring-card transition-all duration-150 hover:scale-110 focus:outline-none"
                style={{ zIndex: profiles.length - index, marginLeft: index > 0 ? "-0.625rem" : undefined }}
              >
                <Avatar className="h-8 w-8">
                  <AvatarFallback className="text-[10px]">{getInitials(name)}</AvatarFallback>
                </Avatar>
              </button>
            </TooltipTrigger>
            <TooltipContent side="bottom" className="space-y-1.5 p-2.5">
              <p className="font-semibold">{name}</p>
              <div className="flex gap-1">
                {profile.identities.map((identity) => (
                  <PlatformBadge key={identityKey(identity)} platform={identity.platform} />
                ))}
              </div>
              {gameCount > 0 && (
                <p className="text-[11px] opacity-70">{gameCount} games in library</p>
              )}
              <p className="text-[10px] opacity-50">Click to remove</p>
            </TooltipContent>
          </Tooltip>
        )
      })}
    </div>
  )
}

function GameTile({ game, categories, onOpenRequirements }: { game: GameCard; categories: string[]; onOpenRequirements: (game: GameCard) => void }) {
  return (
    <button
      type="button"
      onClick={() => onOpenRequirements(game)}
      className="overflow-hidden rounded-xl border border-border bg-secondary/20 text-left transition-colors hover:border-primary/40 hover:bg-secondary/30"
    >
      <div className="h-20 w-full bg-secondary/40">
        {game.imageUrl ? (
          <img src={game.imageUrl} alt={game.name} className="h-full w-full object-cover" loading="lazy" />
        ) : (
          <div className="flex h-full w-full items-center justify-center bg-secondary/60">
            <span className="text-[10px] font-medium uppercase tracking-wide text-white/50">No Image</span>
          </div>
        )}
      </div>

      <div className="space-y-1 p-2.5">
        <h3 className="line-clamp-2 text-sm leading-tight font-medium">{game.name}</h3>
        <PlatformBadge platform={game.platform} />

        <div className="flex items-center justify-between text-xs text-muted-foreground">
          <span>{game.players} players</span>
          <span>{game.rating > 0 ? `Rating ${game.rating}` : ""}</span>
        </div>

        <div className="flex flex-wrap gap-1 pt-1">
          {categories.slice(0, 2).map((category) => (
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
  )
}

export function MatchingLibraryPanel({
  allUserGames,
  categoryFilteredGames,
  selectedCount,
  selectedProfiles,
  identityLibraries,
  availableCategories,
  selectedCategories,
  categoryFilterMode,
  isLoadingCategories,
  categoryFilterError,
  categoriesByApp,
  onToggleCategory,
  onSetCategoryFilterMode,
  onClearFilters,
  onOpenRequirements,
  onToggleSelection,
}: MatchingLibraryPanelProps) {
  return (
    <Card className="flex flex-col border-border/70 bg-card/50 lg:overflow-hidden">
      <CardHeader className="border-b border-border/70 px-5 pb-4 pt-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-xl">Your library</CardTitle>
            <CardDescription>
              {selectedCount > 0
                ? `${categoryFilteredGames.length} shared games with selected friends`
                : `${allUserGames.length} games in your library`}
            </CardDescription>
          </div>

          {selectedProfiles.length > 0 && (
            <div className="flex flex-col items-end gap-1.5">
              <span className="inline-flex items-center gap-1 text-[9px] font-semibold uppercase tracking-widest text-primary/60">
                <Users className="h-2.5 w-2.5" />
                Playing with
              </span>
              <FriendAvatarStack
                profiles={selectedProfiles}
                identityLibraries={identityLibraries}
                onToggleSelection={onToggleSelection}
              />
            </div>
          )}
        </div>
      </CardHeader>

      <CardContent className="space-y-4 p-5 lg:flex lg:flex-col lg:flex-1 lg:min-h-0">
        <div className="rounded-xl border border-border/70 bg-background/40 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs font-medium">Category filters</p>
            <div className="flex items-center gap-2">
              {isLoadingCategories && <p className="text-[11px] text-primary">Loading categories...</p>}
              <div className="inline-flex overflow-hidden rounded-md border border-border/80 bg-background/70 text-[10px] uppercase tracking-wide">
                <button
                  type="button"
                  className={`px-2 py-1 transition-colors ${categoryFilterMode === "or" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => onSetCategoryFilterMode("or")}
                >
                  ANY
                </button>
                <button
                  type="button"
                  className={`border-l border-border/80 px-2 py-1 transition-colors ${categoryFilterMode === "and" ? "bg-primary/15 text-primary" : "text-muted-foreground hover:text-foreground"}`}
                  onClick={() => onSetCategoryFilterMode("and")}
                >
                  ALL
                </button>
              </div>

              {selectedCategories.length > 0 && (
                <Button type="button" size="sm" variant="outline" className="h-6 px-2 text-[10px]" onClick={onClearFilters}>
                  Clear filters
                </Button>
              )}
            </div>
          </div>

          {categoryFilterError && <p className="mt-2 text-[11px] text-destructive">{categoryFilterError}</p>}

          <div className="mt-2 flex flex-wrap gap-2">
            {availableCategories.length > 0 ? (
              availableCategories.map((category) => {
                const selected = selectedCategories.includes(category)
                return (
                  <button
                    key={category}
                    type="button"
                    onClick={() => onToggleCategory(category)}
                    className={`rounded-full border px-2.5 py-1 text-[10px] uppercase tracking-wide transition-colors ${selected ? "border-primary bg-primary/15 text-primary" : "border-border bg-background/70 text-muted-foreground hover:text-foreground"}`}
                  >
                    {category}
                  </button>
                )
              })
            ) : (
              <p className="text-[11px] text-muted-foreground">No category data available yet for the visible games.</p>
            )}
          </div>

          {selectedCategories.length > 1 && (
            <p className="mt-2 text-[11px] text-muted-foreground">
              Current mode: {categoryFilterMode.toUpperCase()} ({categoryFilterMode === "or" ? "matches any selected category" : "must match all selected categories"})
            </p>
          )}
        </div>

        <ScrollArea className="h-[calc(100vh-20rem)] lg:h-auto lg:flex-1 lg:min-h-0 pr-1">
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4 2xl:grid-cols-5">
            {categoryFilteredGames.map((game, index) => (
              <GameTile
                key={`${game.platform}-${game.appId}-${index}`}
                game={game}
                categories={game.platform === "steam" ? categoriesByApp[game.appId] ?? [] : game.tags ?? []}
                onOpenRequirements={onOpenRequirements}
              />
            ))}
          </div>

          {categoryFilteredGames.length === 0 && (
            <p className="mt-4 text-sm text-muted-foreground">No shared games found for the current friend selection.</p>
          )}
        </ScrollArea>
      </CardContent>
    </Card>
  )
}
