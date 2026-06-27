import type { TrendingGame } from "@/types"
import { TrendingGamesPanel } from "./trending-games-panel"
import { BackgroundGames } from "./background-games"
import { useCarousel } from "@/hooks/use-carousel"

type TrendingGamesPanelProps = {
  games: TrendingGame[]
  isLoading: boolean
  isLive: boolean
}

export function TrendingGames({ games, isLoading, isLive }: TrendingGamesPanelProps) {
  const { activeIndex, goTo } = useCarousel(games.length, 3000)

  return (
    <div className="absolute w-full h-full top-0 left-0">
      <div className="relative w-full h-full">
        <BackgroundGames games={games} activeIndex={activeIndex} />
        <TrendingGamesPanel
          games={games}
          isLoading={isLoading}
          isLive={isLive}
          activeIndex={activeIndex}
          onSelect={goTo}
        />
      </div>
    </div>
  )
}