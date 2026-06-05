import type { MockUser, TrendingGame } from "@/types"
import { QuickStartPanel } from "./quick-start-panel"
import { TrendingGamesPanel } from "./trending-games-panel"
import { BackgroundGames } from "./background-games"
import { TrendingGames } from "./trending-games"

type HeroSectionProps = {
  currentUser: MockUser | null
  steamId: string | null
  hasGamePass: boolean | null
  importedGames: string[]
  canBeginMatching: boolean
  trendingGames: TrendingGame[]
  isTrendingLoading: boolean
  trendingLoadError: string | null
  onSteamConnectClick: () => void
  onGamePassToggle: () => void
  onImportClick: () => void
}

export function HeroSection({
  currentUser,
  steamId,
  hasGamePass,
  importedGames,
  canBeginMatching,
  trendingGames,
  isTrendingLoading,
  trendingLoadError,
  onSteamConnectClick,
  onGamePassToggle,
  onImportClick,
}: HeroSectionProps) {
  return (
    <section className="relative px-6 py-20 lg:px-12 lg:py-32" aria-labelledby="hero-title">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-1 gap-12 items-center">
          <article className="grid justify-items-center text-center z-2">
            <h1 id="hero-title" className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Take your friends and
              <span className="block text-primary drop-shadow-[0_0_30px_rgba(0,255,200,0.5)]">
                Match Games
              </span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              Connect your Steam account or import a list of games and match games with your friends.
            </p>

            <section className="mb-8" aria-labelledby="quick-start-title">
              <h2 id="quick-start-title" className="sr-only">
                Quick start options
              </h2>
              <QuickStartPanel
                currentUser={currentUser}
                steamId={steamId}
                hasGamePass={hasGamePass}
                importedGames={importedGames}
                canBeginMatching={canBeginMatching}
                onSteamConnectClick={onSteamConnectClick}
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
