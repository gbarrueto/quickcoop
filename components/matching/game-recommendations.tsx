'use client'

import type { RecommendedGame } from "@/types"
import { BackgroundGames } from "./background-games"

type GameRecommendationsPanelProps = {
  games: RecommendedGame[]
  activeIndex: number
}

export function GameRecommendations({ games, activeIndex }: GameRecommendationsPanelProps) {
  

  return (
    <div className="absolute w-full h-full top-0 left-0">
      <div className="relative w-full h-full">
        <BackgroundGames
          games={games}
          activeIndex={activeIndex}
        />
      </div>
    </div>
  )
}