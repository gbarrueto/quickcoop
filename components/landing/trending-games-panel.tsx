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
    <aside className="relative" aria-labelledby="matched-games-title">
      <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full" />
      <Card className="relative rounded-2xl border-border bg-card p-6 shadow-2xl gap-0">
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
                      <p className="text-sm text-muted-foreground">{game.category}</p>
                      <div className="mt-1 flex items-center gap-2">
                        {game.stores.map((store) => (
                          <Badge
                            key={store}
                            variant="outline"
                            className="text-[10px] uppercase tracking-wide px-2 py-0.5"
                          >
                            {store}
                          </Badge>
                        ))}
                      </div>
                    </div>
                  </div>
                  <div className="flex items-center gap-3">
                    <div className="text-right">
                      <p className="text-sm font-medium">{game.playersNow} now</p>
                      <div className="inline-flex items-center gap-1 text-xs text-emerald-500">
                        <Star className="w-3 h-3" />
                        {game.trendLabel}
                      </div>
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
