import { Gamepad2, Star } from "lucide-react"
import type { RecommendedGame } from "@/types"
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card"
import { useEffect, useRef } from "react"

type GameRecommendationsPanelProps = {
  games: RecommendedGame[]
  activeIndex: number
  onSelect: (index: number) => void 
}

export function GameRecommendationsPanel({ games, activeIndex, onSelect }: GameRecommendationsPanelProps) {
  const itemRefs = useRef<(HTMLLIElement | null)[]>([])

  useEffect(() => {
    itemRefs.current[activeIndex]?.scrollIntoView({
      behavior: "smooth",
      block: "nearest",
    })
  }, [activeIndex])

  return (
    <aside 
      aria-labelledby="matched-games-title"
      className="absolute top-0 left-0 h-full overflow-scroll content-center z-2
                transform -translate-x-[100%]
                " 
    >
      <Card className="group relative rounded-2xl border-none shadow-none bg-card/0 gap-0
                      transition-all duration-300 ease-in-out
                      "
      >
        <CardHeader className="px-0 pb-6 flex-row items-center justify-between space-y-0 
                              group-hover:opacity-100
                              transition-all duration-300 ease-in-out
                              "
        >
          <CardTitle id="matched-games-title" className="font-semibold text-base">
            Game recommendations
          </CardTitle>
        </CardHeader>
        <CardContent className="px-0">
          <ul className="">
            {games.map((game, index) => (
              <li
                key={`${game.name}-${index}`}
                ref={(el) => { itemRefs.current[index] = el }}
                onClick={() => onSelect(index)}
                className={`flex items-center justify-between px-2 py-1 rounded-xl transition-colors cursor-pointer group 
                          hover:bg-primary
                          ${ index === activeIndex ? "transform -translate-x-[10%]" : "" }
                          transition-transform duration-300 ease-in-out 
                          `
                }
                aria-current={index === activeIndex ? "true" : "false"}
                aria-label={`Slide ${index + 1}`}
              >
                <article className="flex items-center gap-4 w-full">
                  <div className="relative h-8 w-12 overflow-hidden rounded-md border border-border bg-background/60">
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
                    <p className="absolute bottom-0 left-0 bg-background/50 text-[8px] truncate">{game.name}</p>
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
