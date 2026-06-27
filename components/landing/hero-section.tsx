import type { TrendingGame } from "@/types"
import { QuickStartPanel } from "./quick-start-panel"
import { TrendingGamesPanel } from "./trending-games-panel"
import { BackgroundGames } from "./background-games"
import { TrendingGames } from "./trending-games"
import { ImportGame } from "@/types/game"

type HeroSectionProps = {
  steamId: string | null
  epicId: string | null
  hasGamePass: boolean | null
  importedGames: ImportGame[]
  canBeginMatching: boolean
  trendingGames: TrendingGame[]
  isTrendingLoading: boolean
  trendingLoadError: string | null
  onSteamConnectClick: () => void
  onEpicConnectClick: () => void
  onGamePassToggle: () => void
  onImportClick: () => void
}

export function HeroSection({
  steamId,
  epicId,
  hasGamePass,
  importedGames,
  canBeginMatching,
  trendingGames,
  isTrendingLoading,
  trendingLoadError,
  onSteamConnectClick,
  onEpicConnectClick,
  onGamePassToggle,
  onImportClick,
}: HeroSectionProps) {
  return (
    <section className="relative h-screen px-6 py-20 lg:px-12 lg:py-32" aria-labelledby="hero-title">
      <div className="max-w-7xl mx-auto h-full">
        <div className="grid h-full lg:grid-cols-1 gap-12 items-center">
          <article className="grid h-full justify-items-center z-2">
            <section className="grid justify-items-center text-center">
              <h1 id="hero-title" className="text-4xl md:text-6xl font-bold leading-tight">
                Take your friends and
                <span className="block text-quaternary">
                  Match Games
                </span>
              </h1>
              <p className="text-lg text-foreground/80 mb-8 max-w-lg">
                Connect your accounts or import a list of games and match games with your friends.
              </p>
            </section>

            <section className="content-end w-full" aria-labelledby="quick-start-title">
              <QuickStartPanel
                steamId={steamId}
                epicId={epicId}
                hasGamePass={hasGamePass}
                importedGames={importedGames}
                canBeginMatching={canBeginMatching}
                onSteamConnectClick={onSteamConnectClick}
                onEpicConnectClick={onEpicConnectClick}
                onGamePassToggle={onGamePassToggle}
                onImportClick={onImportClick}
              />
            </section>
          </article>
        </div>
      </div>

      <TrendingGames
        games={trendingGames}
        isLoading={isTrendingLoading}
        loadError={trendingLoadError}
      />
    </section>
  )
}
