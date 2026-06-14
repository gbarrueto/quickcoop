import type { TrendingGame } from "@/types"
import { TrendingGamesPanel } from "./trending-games-panel"
import { BackgroundGames } from "./background-games"
import { Gamepad2 } from "lucide-react"
import { Card, CardContent, CardHeader, CardTitle } from "../ui/card"
import { Badge } from "../ui/badge"
import { useCarousel } from "@/hooks/use-carousel"

type TrendingGamesPanelProps = {
  games: TrendingGame[]
  isLoading: boolean
  loadError: string | null
}

export function TrendingGames({ games, isLoading, loadError }: TrendingGamesPanelProps) {
  const { activeIndex, goTo } = useCarousel(games.length, 3000)

  return (
    <div className="absolute w-full h-full top-0 left-0">
      <div className="relative w-full h-full">
        <BackgroundGames
          games={games}
          isLoading={isLoading}
          loadError={loadError}
          activeIndex={activeIndex}
        />
        <TrendingGamesPanel
          games={games}
          isLoading={isLoading}
          loadError={loadError}
          activeIndex={activeIndex}
          onSelect={goTo}
        />
      </div>
    </div>
  )
}