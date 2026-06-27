"use client"

import { useState } from "react"
import { BackgroundEffects, SiteFooter, SiteHeader } from "@/components/layout"
import { useAuthSession } from "@/hooks/use-auth-session"
import { useEpicAuth } from "@/hooks/use-epic-auth"
import { useLandingProfile } from "@/hooks/use-landing-profile"
import { useSteamAuth } from "@/hooks/use-steam-auth"
import { useTrendingGames } from "@/hooks/use-trending-games"
import { AuthDialog } from "./auth-dialog"
import { EpicConnectDialog } from "./epic-connect-dialog"
import { HeroSection } from "./hero-section"
import { ImportGamesDialog } from "./import-games-dialog"
import { SteamConnectDialog } from "./steam-connect-dialog"

export function LandingPage() {
  const { currentUser, logout } = useAuthSession()
  const {
    hasGamePass,
    xboxConnected,
    importedGames,
    initialSteamId,
    initialEpicId,
    toggleGamePass,
    confirmImport,
  } = useLandingProfile()
  const {
    steamId,
    steamError,
    isWaiting: isWaitingSteamAuth,
    startAuth: startSteamOpenId,
    disconnect: disconnectSteam,
  } = useSteamAuth(initialSteamId)
  const {
    epicId,
    epicError,
    isWaiting: isWaitingEpicAuth,
    popupClosed: epicPopupClosed,
    extensionAvailable: epicExtensionAvailable,
    startPopupAuth: startEpicPopupAuth,
    submitAuthCode: submitEpicAuthCode,
    reset: resetEpicAuth,
    disconnect: disconnectEpic,
  } = useEpicAuth(initialEpicId)
  const { games: trendingGames, isLoading: isTrendingLoading, isLive: isTrendingLive } =
    useTrendingGames()

  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [steamModalOpen, setSteamModalOpen] = useState(false)
  const [epicModalOpen, setEpicModalOpen] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)

  const canBeginMatching =
    Boolean(steamId) || Boolean(epicId) || xboxConnected || importedGames.length > 0

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
          steamId={steamId}
          epicId={epicId}
          hasGamePass={hasGamePass}
          importedGames={importedGames}
          canBeginMatching={canBeginMatching}
          trendingGames={trendingGames}
          isTrendingLoading={isTrendingLoading}
          isTrendingLive={isTrendingLive}
          onSteamConnectClick={() => setSteamModalOpen(true)}
          onEpicConnectClick={() => setEpicModalOpen(true)}
          onGamePassToggle={toggleGamePass}
          onImportClick={() => setImportModalOpen(true)}
        />
      </main>

      <SteamConnectDialog
        open={steamModalOpen}
        onOpenChange={setSteamModalOpen}
        steamId={steamId}
        steamError={steamError}
        isWaiting={isWaitingSteamAuth}
        currentUser={currentUser}
        onStartAuth={startSteamOpenId}
        onDisconnect={disconnectSteam}
      />

      <AuthDialog
        open={authModalOpen}
        onOpenChange={setAuthModalOpen}
      />

      <EpicConnectDialog
        open={epicModalOpen}
        onOpenChange={setEpicModalOpen}
        epicId={epicId}
        epicError={epicError}
        isWaiting={isWaitingEpicAuth}
        popupClosed={epicPopupClosed}
        extensionAvailable={epicExtensionAvailable}
        currentUser={currentUser}
        startPopupAuth={startEpicPopupAuth}
        submitAuthCode={submitEpicAuthCode}
        reset={resetEpicAuth}
        disconnect={disconnectEpic}
      />

      <ImportGamesDialog
        open={importModalOpen}
        importedGames={importedGames}
        onConfirm={(importGame) => {
          confirmImport(importGame)
          setImportModalOpen(false)
        }}
        onClose={() => setImportModalOpen(false)}
      />

      <SiteFooter />
    </div>
  )
}
