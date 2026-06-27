import { Gamepad2, Star } from "lucide-react"
import type { RecommendedGame } from "@/types"
import { Card, CardContent } from "@/components/ui/card"
import { useEffect, useRef } from "react"

type GameRecommendationsPanelProps = {
  games: RecommendedGame[]
  activeIndex: number
  onSelect: (index: number) => void 
}

export function GameRecommendationsCarousel({ games, activeIndex, onSelect }: GameRecommendationsPanelProps) {
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
      className="absolute top-0 left-0 h-full w-full overflow-hidden content-center z-2 scrollbar-none" 
      style={{scrollbarWidth: 'none'}}
    >
      <Card className="group relative rounded-2xl border-none shadow-none bg-card/0 gap-0
                      transition-all duration-300 ease-in-out
                      "
      >
        <CardContent className="px-0">
          <ul className="grid justify-items-center">
            {games.map((game, index) => (
              <li
                key={`${game.name}-${index}`}
                ref={(el) => { itemRefs.current[index] = el }}
                onClick={() => onSelect(index)}
                className={`flex items-center justify-between px-2 py-1 rounded-xl transition-colors cursor-pointer group
                          ${ index === activeIndex ? "transform scale-125" : "" }
                          transition-transform duration-300 ease-in-out
                          `
                }
                aria-current={index === activeIndex ? "true" : "false"}
                aria-label={`Slide ${index + 1}`}
              >
                <article className="flex items-center gap-4 w-full">
                  <div className="relative h-10 w-18 overflow-hidden rounded-md border border-border bg-background/60">
                    {game.imageUrl ? (
                      <img
                        src={game.imageUrl}
                        alt=""
                        className="h-full w-full object-cover"
                        loading="lazy"
                      />
                    ) : (
                      <div className="flex h-full w-full items-center justify-center text-primary/70">
                        <Gamepad2 className="h-5 w-5" />
                      </div>
                    )}
                    <div className="absolute top-0 left-0 grid grid-rows-[20%_80%] items-center h-full w-full text-[8px] bg-background/80 opacity-0 hover:opacity-100">
                      <div className="flex items-center gap-1 justify-self-end text-secondary pt-1 pr-1">
                        <Star className="h-2 w-2" />
                        {game.rating}
                      </div>
                      <div className="font-bold text-center">{game.name}</div>
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
