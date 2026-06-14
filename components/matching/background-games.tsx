import { Gamepad2 } from "lucide-react"
import type { RecommendedGame } from "@/types"

type BackgroundGamesProps = {
  games: RecommendedGame[]
  activeIndex: number
}

export function BackgroundGames({ games, activeIndex }: BackgroundGamesProps) {
  return (
    <div className="absolute top-0 left-0 w-full h-full">
      <div className="relative h-full w-full overflow-hidden">
        {games.map((game, index) => (
          <div
            key={`${game.name}-${index}`}
            className={`absolute inset-0 transition-opacity duration-700 ease-in-out
                        ${index === activeIndex ? "opacity-100" : "opacity-0"}`}
          >
            {game.imageUrl ? (
              <img
                src={game.imageUrl}
                alt={`${game.name} cover`}
                className="absolute block w-full h-full object-cover -translate-x-1/2 -translate-y-1/2 top-1/2 left-1/2 blur-md scale-110"
                loading="lazy"
              />
            ) : (
              <div className="absolute flex items-center justify-center w-full h-full">
                <Gamepad2 className="h-5 w-5" />
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="absolute top-0 left-0 w-full h-full bg-[#575466]/70"></div>
    </div>
  )
}