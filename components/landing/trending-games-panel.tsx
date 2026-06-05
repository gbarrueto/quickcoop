import { Gamepad2, Star } from "lucide-react"
import type { TrendingGame } from "@/types"
import { Badge } from "@/components/ui/badge"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"

type TrendingGamesPanelProps = {
  games: TrendingGame[]
  isLoading: boolean
  loadError: string | null
}

export function TrendingGamesPanel({ games, isLoading, loadError }: TrendingGamesPanelProps) {
  return (
    <aside className="absolute top-0 right-0 h-full content-center" aria-labelledby="matched-games-title">
      <Card className="relative rounded-2xl border-border bg-card p-6 shadow-2xl gap-0
                        transform translate-x-[70%] hover:translate-x-0
                        transition-transform duration-300 ease-in-out">

        <CardHeader className="px-0 pb-6 flex-row items-center justify-between space-y-0">
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
          <ul className="space-y-3">
            {games.map((game, index) => (
              <li
                key={`${game.name}-${index}`}
                className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors cursor-pointer group"
              >
                <article className="flex items-center justify-between gap-4 w-full">
                  <div className="flex items-center gap-4">
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
                    <div>
                      <p className="font-medium">{game.name}</p>
                    </div>
                  </div>
                </article>
              </li>
            ))}
          </ul>
        </CardContent>
      </Card>
    </aside>
  )
}
