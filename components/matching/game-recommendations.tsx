'use client'

import type { RecommendedGame } from "@/types"
import { GameRecommendationsPanel } from "./game-recommendations-panel"
import { BackgroundGames } from "./background-games"
import { useCarousel } from "@/hooks/use-carousel"

type GameRecommendationsPanelProps = {
  games: RecommendedGame[]
}

export function GameRecommendations({ games }: GameRecommendationsPanelProps) {
  const { activeIndex, goTo } = useCarousel(games.length, 3000)

  return (
    <div className="absolute w-full h-full top-0 left-0">
      <div className="relative w-full h-full">
        <BackgroundGames
          games={games}
          activeIndex={activeIndex}
        />
        <GameRecommendationsPanel
          games={games}
          activeIndex={activeIndex}
          onSelect={goTo}
        />
      </div>
    </div>
  )
}