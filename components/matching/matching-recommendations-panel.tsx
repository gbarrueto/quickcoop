import { ArrowLeft, ArrowRight, CheckCircle2 } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card"
import type { RecommendedGame } from "@/types"

type MatchingRecommendationsPanelProps = {
  recommendationsRef: React.RefObject<HTMLDivElement | null>
  recommendedGames: RecommendedGame[]
  onScroll: (direction: -1 | 1) => void
}

export function MatchingRecommendationsPanel({ recommendationsRef, recommendedGames, onScroll }: MatchingRecommendationsPanelProps) {
  return (
    <Card className="border-border/70 bg-card/50">
      <CardHeader className="flex-row items-center justify-between gap-3 space-y-0 px-4 pt-4">
        <div>
          <CardTitle className="text-base">Game recommendations</CardTitle>
          <CardDescription className="text-[11px]">You might be interested in these games.</CardDescription>
        </div>

        <div className="flex items-center gap-2">
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onScroll(-1)} aria-label="Scroll recommendations left">
            <ArrowLeft className="h-4 w-4" />
          </Button>
          <Button type="button" variant="outline" size="icon" className="h-7 w-7" onClick={() => onScroll(1)} aria-label="Scroll recommendations right">
            <ArrowRight className="h-4 w-4" />
          </Button>
        </div>
      </CardHeader>

      <CardContent className="px-4 pb-4">
        <div ref={recommendationsRef} className="overflow-x-auto pb-2" style={{ scrollbarWidth: "none" }}>
          <div className="grid grid-flow-col auto-cols-[calc((100%-0.75rem)/2)] gap-3 px-1">
            {recommendedGames.map((game) => (
              <article key={game.appId} className="overflow-hidden rounded-xl border border-border bg-secondary/20">
                <div className="h-20 w-full bg-secondary/40">
                  {game.imageUrl ? (
                    <img src={game.imageUrl} alt={game.name} className="h-full w-full object-cover" loading="lazy" />
                  ) : (
                    <div className="flex h-full w-full items-center justify-center bg-secondary/60">
                      <span className="text-[10px] font-medium uppercase tracking-wide text-white/50">No Image</span>
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
      </CardContent>
    </Card>
  )
}
