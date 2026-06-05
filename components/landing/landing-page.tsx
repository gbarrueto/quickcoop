"use client"

import { useState } from "react"
import { BackgroundEffects, SiteFooter, SiteHeader } from "@/components/layout"
import { useEpicAuth } from "@/hooks/use-epic-auth"
import { useLandingProfile } from "@/hooks/use-landing-profile"
import { useMockAuthSession } from "@/hooks/use-mock-auth-session"
import { useSteamAuth } from "@/hooks/use-steam-auth"
import { useTrendingGames } from "@/hooks/use-trending-games"
import { AuthDialog } from "./auth-dialog"
import { CtaSection } from "./cta-section"
import { EpicConnectDialog } from "./epic-connect-dialog"
import { FeaturesSection } from "./features-section"
import { HeroSection } from "./hero-section"
import { ImportGamesDialog } from "./import-games-dialog"
import { StatsSection } from "./stats-section"
import { SteamConnectDialog } from "./steam-connect-dialog"

export function LandingPage() {
  const { currentUser, setCurrentUser, logout } = useMockAuthSession()
  const {
    hasGamePass,
    xboxConnected,
    importedGames,
    initialSteamId,
    initialEpicId,
    toggleGamePass,
    confirmImport,
  } = useLandingProfile()
  const { steamId, steamError, isWaiting: isWaitingSteamAuth, startAuth: startSteamOpenId } =
    useSteamAuth(initialSteamId)
  const { epicId } = useEpicAuth(initialEpicId)
  const { games: trendingGames, isLoading: isTrendingLoading, loadError: trendingLoadError } =
    useTrendingGames()

  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [steamModalOpen, setSteamModalOpen] = useState(false)
  const [epicModalOpen, setEpicModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)

  const canBeginMatching =
    Boolean(currentUser) &&
    (Boolean(steamId) || Boolean(epicId) || xboxConnected || importedGames.length > 0)

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      <BackgroundEffects />

      <SiteHeader
        currentUser={currentUser}
        onLoginClick={() => setAuthModalOpen(true)}
        onLogout={logout}
      />

      <main className="relative">
        <HeroSection
          currentUser={currentUser}
          steamId={steamId}
          hasGamePass={hasGamePass}
          importedGames={importedGames}
          canBeginMatching={canBeginMatching}
          trendingGames={trendingGames}
          isTrendingLoading={isTrendingLoading}
          trendingLoadError={trendingLoadError}
          onSteamConnectClick={() => setSteamModalOpen(true)}
          onGamePassToggle={toggleGamePass}
          onImportClick={() => setImportModalOpen(true)}
        />
        <FeaturesSection />
        <StatsSection />
        <CtaSection />
      </main>

      <SteamConnectDialog
        open={steamModalOpen}
        onOpenChange={setSteamModalOpen}
        steamId={steamId}
        steamError={steamError}
        isWaiting={isWaitingSteamAuth}
        onStartAuth={startSteamOpenId}
      />

      <AuthDialog
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
        onAuthenticated={setCurrentUser}
      />

      <EpicConnectDialog open={epicModalOpen} onOpenChange={setEpicModalOpen} />

      <ImportGamesDialog
        open={importModalOpen}
        importedGames={importedGames}
        onConfirm={(importText) => {
          confirmImport(importText)
          setImportModalOpen(false)
        }}
        onClose={() => setImportModalOpen(false)}
      />

      <SiteFooter />
    </div>
  )
}
