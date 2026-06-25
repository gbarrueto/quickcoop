import { Avatar, AvatarFallback } from "@/components/ui/avatar"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import { ScrollArea } from "@/components/ui/scroll-area"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { Users } from "lucide-react"
import { identityKey } from "@/lib/matching"
import type { CategoryFilterMode, FriendLibrarySnapshot, FriendProfile, GameCard } from "@/types"
import { PlatformBadge } from "./platform-badge"
import { Star } from "lucide-react"

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
  isCategoryPanelOpen: boolean
  isFriendsPanelOpen: boolean
  onOpenCategoryPanel: () => void
  onOpenRecommendationsModal: () => void
  onOpenFriendsPanel: () => void
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
      className="relative grid overflow-hidden rounded-xl border border-border bg-secondary/20 text-left transition-colors hover:border-primary/40 hover:bg-secondary/30"
    >
      <div className="absolute top-1 right-1 flex bg-background/80 rounded-full items-center">
        <span>
          {game.rating > 0 
            ? (
              <div className="flex items-center gap-1 mx-2 text-xs text-secondary">
                <Star className="h-3 w-3" />
                {game.rating}
              </div>
            )
            : ""
          }
        </span>
        <PlatformBadge platform={game.platform} />
      </div>

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

        <div className="flex items-center justify-between text-xs text-muted-foreground">
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
  categoriesByApp,
  isCategoryPanelOpen,
  isFriendsPanelOpen,
  onOpenCategoryPanel,
  onOpenRecommendationsModal,
  onOpenFriendsPanel,
  onOpenRequirements,
}: MatchingLibraryPanelProps) {
  return (
    <Card className="flex flex-col border-border/70 bg-card/50 lg:overflow-hidden">
      <CardHeader className="border-border/70 px-5">
        <div className="flex items-start justify-between gap-4">
          <div className="space-y-1">
            <CardTitle className="text-medium">Your library</CardTitle>
            <CardDescription>
              {selectedCount > 0
                ? `${categoryFilteredGames.length} shared games with selected friends`
                : `${allUserGames.length} games in your library`}
            </CardDescription>
          </div>

          <div className="flex gap-2">
            <Button 
              onClick={onOpenRecommendationsModal}
              className={`border border-primary/50 text-primary transition-colors
                          ${isCategoryPanelOpen
                            ? "bg-primary/60 text-secondary hover:bg-primary/60"
                            : "bg-background hover:bg-primary/20"
                          }
              `}
            >
              Recommendations
            </Button>
            <Button 
              onClick={onOpenCategoryPanel}
              className={`border border-primary/50 text-primary transition-colors
                          ${isCategoryPanelOpen
                            ? "bg-primary/60 text-secondary hover:bg-primary/60"
                            : "bg-background hover:bg-primary/20"
                          }
              `}
            >
              Categories
            </Button>
            <Button 
              onClick={onOpenFriendsPanel}
              className={`border border-primary/50 text-primary transition-colors
                          ${isFriendsPanelOpen
                            ? "bg-primary/60 text-secondary hover:bg-primary/60"
                            : "bg-background hover:bg-primary/20"
                          }
              `}
            >
              Friends
            </Button>
          </div>
        </div>
      </CardHeader>

      <CardContent className="px-5 py-0 lg:flex lg:flex-col lg:flex-1 lg:min-h-0">
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
