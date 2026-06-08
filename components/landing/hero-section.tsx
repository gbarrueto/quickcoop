import type { MockUser, TrendingGame } from "@/types"
import { QuickStartPanel } from "./quick-start-panel"
import { TrendingGamesPanel } from "./trending-games-panel"

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
  onEpicConnectClick: () => void
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
  onEpicConnectClick,
  onGamePassToggle,
  onImportClick,
}: HeroSectionProps) {
  return (
    <section className="px-6 py-20 lg:px-12 lg:py-32" aria-labelledby="hero-title">
      <div className="max-w-7xl mx-auto">
        <div className="grid lg:grid-cols-2 gap-12 items-center">
          <article>
            <h1 id="hero-title" className="text-4xl md:text-6xl font-bold leading-tight mb-6">
              Find Your Next
              <span className="block text-primary drop-shadow-[0_0_30px_rgba(0,255,200,0.5)]">
                Multiplayer Match
              </span>
            </h1>
            <p className="text-lg text-muted-foreground mb-8 max-w-lg">
              Connect your Steam and Epic libraries, match games with friends, and discover what to play next. All in
              your browser.
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
                onEpicConnectClick={onEpicConnectClick}
                onGamePassToggle={onGamePassToggle}
                onImportClick={onImportClick}
              />
            </section>

            <p className="text-xs text-muted-foreground">Free to use • No account required for import</p>
          </article>

          <TrendingGamesPanel
            games={trendingGames}
            isLoading={isTrendingLoading}
            loadError={trendingLoadError}
          />
        </div>
      </div>
    </section>
  )
}
