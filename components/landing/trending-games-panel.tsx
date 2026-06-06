import { Gamepad2, Star } from "lucide-react"
import type { TrendingGame } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type TrendingGamesPanelProps = {
  games: TrendingGame[]
  isLoading: boolean
  loadError: string | null
  activeIndex: number
  onSelect: (index: number) => void 
}

export function TrendingGamesPanel({ games, isLoading, loadError, activeIndex, onSelect }: TrendingGamesPanelProps) {
  return (
    <aside className="absolute top-0 right-0 h-full content-center z-2" aria-labelledby="matched-games-title">
      <Card className="group relative rounded-2xl border-none shadow-none bg-card/0 p-6 gap-0
                      transform translate-x-[80%] hover:translate-x-0
                      transition-all duration-300 ease-in-out
                      hover:bg-secondary/30
                      "
      >
        <CardHeader className="opacity-0 px-0 pb-6 flex-row items-center justify-between space-y-0 
                              group-hover:opacity-100
                              transition-all duration-300 ease-in-out
                              "
        >
          <CardTitle id="matched-games-title" className="font-semibold text-base">
            Trending Multiplayer Games
          </CardTitle>
          <Badge variant="secondary" className="text-xs text-primary bg-primary/10 border-transparent">
            {isLoading ? "Refreshing..." : "Live now"}
          </Badge>
        </CardHeader>
        <CardContent className="px-0">
          {loadError && (
            <p className="mb-4 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
              {loadError}
            </p>
          )}
          <ul className="space-y-1">
            {games.map((game, index) => (
              <li
                key={`${game.name}-${index}`}
                onClick={() => onSelect(index)}
                className={`flex items-center justify-between p-2 rounded-xl transition-colors cursor-pointer group 
                          hover:bg-primary
                          ${ index === activeIndex ? "transform -translate-x-[10%]" : "" }
                          transition-transform duration-300 ease-in-out 
                          `
                }
                aria-current={index === activeIndex ? "true" : "false"}
                aria-label={`Slide ${index + 1}`}
              >
                <article className="flex items-center gap-4 w-full">
                  <div className="h-12 w-20 overflow-hidden rounded-md border border-border bg-background/60">
                    {game.imageUrl ? (
                      <img
                        src={game.imageUrl}
                        alt={`${game.name} cover`}
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary/70">
                        <Gamepad2 className="h-5 w-5" />
                      </div>
                    )}
                  </div>
                  <p className="font-medium">{game.name}</p>
                </article>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </aside>
  )
}
