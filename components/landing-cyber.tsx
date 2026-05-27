"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
import {
  ensureStoredUserProfile,
  updateStoredUserProfile,
} from "@/lib/user-profile"
import {
  ensureMockUsers,
  getCurrentMockUser,
  loginMockUser,
  logoutMockUser,
  registerMockUser,
  type MockUser,
} from "@/lib/mock-auth"
import {
  Gamepad2,
  Users,
  Zap,
  Star,
  TrendingUp,
  ArrowRight,
  Upload,
  Link2,
  Shield,
  CheckCircle2,
  User,
} from "lucide-react"
import Link from "next/link"

type TrendingGame = {
  name: string
  category: string
  playersNow: string
  trendLabel: string
  stores: string[]
  imageUrl?: string
}

const features = [
  {
    icon: <Users className="w-6 h-6" />,
    title: "Game Matching",
    description: "Find games you and your friends all own instantly",
  },
  {
    icon: <Star className="w-6 h-6" />,
    title: "Smart Recommendations",
    description: "Suggestions based on your play style",
  },
  {
    icon: <Zap className="w-6 h-6" />,
    title: "Quick Hop-In",
    description: "No software to install, works in your browser",
  },
  {
    icon: <Shield className="w-6 h-6" />,
    title: "Specs & Requirements",
    description: "Check if everyone can run the game",
  },
]

const fallbackTrendingMultiplayerGames: TrendingGame[] = [
  {
    name: "Counter-Strike 2",
    category: "Tactical FPS",
    playersNow: "1.08M",
    trendLabel: "Top #1",
    stores: ["Steam"],
    imageUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/730/header.jpg",
  },
  {
    name: "Helldivers 2",
    category: "Co-op Shooter",
    playersNow: "312K",
    trendLabel: "Top #2",
    stores: ["Steam", "Epic"],
    imageUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/553850/header.jpg",
  },
  {
    name: "Rocket League",
    category: "Sports / Arcade",
    playersNow: "497K",
    trendLabel: "Top #3",
    stores: ["Steam", "Epic"],
    imageUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/252950/header.jpg",
  },
  {
    name: "Apex Legends",
    category: "Battle Royale",
    playersNow: "441K",
    trendLabel: "Top #4",
    stores: ["Steam", "Epic"],
    imageUrl: "https://cdn.cloudflare.steamstatic.com/steam/apps/1172470/header.jpg",
  },
]

const EPIC_CONNECTED_SESSION_KEY = "qcoop-epic-connected"
const XBOX_CONNECTED_SESSION_KEY = "qcoop-xbox-connected"
const TRENDING_CACHE_KEY = "qcoop-trending-multiplayer-cache"
const TRENDING_CACHE_TTL_MS = 1000 * 60 * 60 * 24

export function LandingCyber() {
  const router = useRouter()
  const [currentUser, setCurrentUser] = useState<MockUser | null>(null)
  const [authModalOpen, setAuthModalOpen] = useState(false)
  const [authMode, setAuthMode] = useState<"login" | "register">("login")
  const [authName, setAuthName] = useState("")
  const [authEmail, setAuthEmail] = useState("")
  const [authPassword, setAuthPassword] = useState("")
  const [authError, setAuthError] = useState<string | null>(null)
  const [importMode, setImportMode] = useState<"link" | "import">("link")
  const [steamModalOpen, setSteamModalOpen] = useState(false)
  const [epicModalOpen, setEpicModalOpen] = useState(false)
  const [xboxModalOpen, setXboxModalOpen] = useState(false)
  const [steamId, setSteamId] = useState<string | null>(null)
  const [steamError, setSteamError] = useState<string | null>(null)
  const [isWaitingSteamAuth, setIsWaitingSteamAuth] = useState(false)
  const [trendingGames, setTrendingGames] = useState<TrendingGame[]>(fallbackTrendingMultiplayerGames)
  const [isTrendingLoading, setIsTrendingLoading] = useState(true)
  const [trendingLoadError, setTrendingLoadError] = useState<string | null>(null)
  const [hasGamePass, setHasGamePass] = useState<boolean | null>(null)
  const [xboxConnected, setXboxConnected] = useState(false)
  const [epicId, setEpicId] = useState<string | null>(null)
  const [epicError, setEpicError] = useState<string | null>(null)
  const [isWaitingEpicAuth, setIsWaitingEpicAuth] = useState(false)
  const [importModalOpen, setImportModalOpen] = useState(false)
  const [importText, setImportText] = useState("")
  const [importedGames, setImportedGames] = useState<string[]>([])

  const canBeginMatching =
    Boolean(currentUser) && (Boolean(steamId) || Boolean(epicId) || xboxConnected || importedGames.length > 0)

  const handleAuthSubmit = () => {
    setAuthError(null)

    if (authMode === "register") {
      const result = registerMockUser({
        name: authName,
        email: authEmail,
        password: authPassword,
      })

      if (!result.ok) {
        setAuthError(result.message)
        return
      }

      setCurrentUser(result.user)
      setAuthModalOpen(false)
      return
    }

    const result = loginMockUser({
      email: authEmail,
      password: authPassword,
    })

    if (!result.ok) {
      setAuthError(result.message)
      return
    }

    setCurrentUser(result.user)
    setAuthModalOpen(false)
  }

  const handleLogout = () => {
    logoutMockUser()
    setCurrentUser(null)
  }

  const confirmImport = () => {
    const games = importText
      .split("\n")
      .map((g) => g.trim())
      .filter(Boolean)
    const mergedGames = Array.from(new Set([...importedGames, ...games]))

    setImportedGames(mergedGames)
    updateStoredUserProfile((profile) => ({
      ...profile,
      importedGames: mergedGames,
    }))
    setImportModalOpen(false)
  }

  useEffect(() => {
    ensureMockUsers()
    setCurrentUser(getCurrentMockUser())

    const profile = ensureStoredUserProfile()

    if (profile.connections.steamId) {
      setSteamId(profile.connections.steamId)
    }

    if (profile.connections.epicAccountId) {
      setEpicId(profile.connections.epicAccountId)
    }

    setHasGamePass(profile.connections.hasGamePass)
    setXboxConnected(profile.connections.hasGamePass)

    if (profile.importedGames.length > 0) {
      setImportedGames(profile.importedGames)
    }
  }, [])

  const startSteamOpenId = () => {
    setSteamError(null)
    setIsWaitingSteamAuth(true)

    const popup = window.open(
      "/api/steam/login",
      "steam-openid-login",
      "width=700,height=760,menubar=no,toolbar=no,location=no,status=no",
    )

    if (!popup) {
      setIsWaitingSteamAuth(false)
      setSteamError("Popup blocked. Please allow popups and try again.")
    }
  }

  const startEpicOAuth = () => {
    setEpicError(null)
    setIsWaitingEpicAuth(true)

    const popup = window.open(
      "/api/epic/login",
      "epic-oauth-login",
      "width=700,height=760,menubar=no,toolbar=no,location=no,status=no",
    )

    if (!popup) {
      setIsWaitingEpicAuth(false)
      setEpicError("Popup blocked. Please allow popups and try again.")
    }
  }

  useEffect(() => {
    const handleMessage = (event: MessageEvent) => {
      if (event.origin !== window.location.origin || !event.data) {
        return
      }

      if (event.data.type === "steam-auth-success") {
        const resolvedSteamId = String(event.data.steamId || "")

        if (!resolvedSteamId) {
          setIsWaitingSteamAuth(false)
          setSteamError("Steam authentication finished but no steamId was returned.")
          return
        }

        setSteamId(resolvedSteamId)
        updateStoredUserProfile((profile) => ({
          ...profile,
          connections: {
            ...profile.connections,
            steamId: resolvedSteamId,
          },
        }))
        setIsWaitingSteamAuth(false)
      }

      if (event.data.type === "steam-auth-error") {
        setIsWaitingSteamAuth(false)
        setSteamError(event.data.error || "Steam authentication failed")
      }

      if (event.data.type === "epic-auth-success") {
        const resolvedEpicId = String(event.data.epicAccountId || "")
        setEpicId(resolvedEpicId)
        updateStoredUserProfile((profile) => ({
          ...profile,
          connections: {
            ...profile.connections,
            epicAccountId: resolvedEpicId,
          },
        }))
        setIsWaitingEpicAuth(false)
      }

      if (event.data.type === "epic-auth-error") {
        setIsWaitingEpicAuth(false)
        setEpicError(event.data.error || "Epic authentication failed")
      }
    }

    window.addEventListener("message", handleMessage)
    return () => window.removeEventListener("message", handleMessage)
  }, [])

  useEffect(() => {
    let isCancelled = false

    const readCachedTrendingGames = () => {
      try {
        const rawCache = window.localStorage.getItem(TRENDING_CACHE_KEY)
        if (!rawCache) {
          return null
        }

        const parsed = JSON.parse(rawCache) as {
          savedAt?: number
          games?: TrendingGame[]
        }

        if (!parsed.savedAt || !parsed.games?.length) {
          return null
        }

        const hasInvalidPlayers = parsed.games.some((game) => {
          const value = String(game.playersNow || "")
          return value.toLowerCase().includes("nan")
        })

        if (hasInvalidPlayers) {
          return null
        }

        const age = Date.now() - parsed.savedAt
        if (age > TRENDING_CACHE_TTL_MS) {
          return null
        }

        return parsed.games
      } catch {
        return null
      }
    }

    const saveCachedTrendingGames = (games: TrendingGame[]) => {
      try {
        window.localStorage.setItem(
          TRENDING_CACHE_KEY,
          JSON.stringify({
            savedAt: Date.now(),
            games,
          }),
        )
      } catch {
        // Ignore storage issues and keep UI functional.
      }
    }

    const loadTrendingGames = async () => {
      const cachedGames = readCachedTrendingGames()
      if (cachedGames) {
        setTrendingGames(cachedGames)
        setTrendingLoadError(null)
        setIsTrendingLoading(false)
        return
      }

      setIsTrendingLoading(true)

      try {
        const response = await fetch("/api/trending-multiplayer")

        if (!response.ok) {
          throw new Error(`Trending API failed with status ${response.status}`)
        }

        const payload = (await response.json()) as { games?: TrendingGame[] }

        if (!payload.games?.length) {
          throw new Error("Trending API returned no games")
        }

        if (!isCancelled) {
          setTrendingGames(payload.games)
          setTrendingLoadError(null)
          saveCachedTrendingGames(payload.games)
        }
      } catch {
        if (!isCancelled) {
          setTrendingGames(fallbackTrendingMultiplayerGames)
          setTrendingLoadError("Live trend data unavailable. Showing fallback list.")
        }
      } finally {
        if (!isCancelled) {
          setIsTrendingLoading(false)
        }
      }
    }

    void loadTrendingGames()

    return () => {
      isCancelled = true
    }
  }, [])

  return (
    <div className="min-h-screen bg-background overflow-hidden">
      {/* Animated Background */}
      <div className="fixed inset-0 pointer-events-none" aria-hidden="true">
        <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-primary/20 via-transparent to-transparent" />
        <div className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-primary/50 to-transparent" />
        <div
          className="absolute inset-0 opacity-30"
          style={{
            backgroundImage: `linear-gradient(rgba(0,255,200,0.03) 1px, transparent 1px), linear-gradient(90deg, rgba(0,255,200,0.03) 1px, transparent 1px)`,
            backgroundSize: "50px 50px",
          }}
        />
      </div>

      {/* Navigation */}
      <header className="relative z-10">
        <nav className="flex items-center justify-between px-6 py-4 lg:px-12" aria-label="Primary">
          <div className="flex items-center gap-2">
            <div className="w-10 h-10 rounded-lg bg-primary flex items-center justify-center">
              <Gamepad2 className="w-6 h-6 text-primary-foreground" />
            </div>
            <span className="text-xl font-bold tracking-tight">QCoop</span>
          </div>
          <div className="hidden md:flex items-center gap-8 text-sm">
            <a href="#features" className="text-muted-foreground hover:text-foreground transition-colors">
              Features
            </a>
            <a href="#how-it-works" className="text-muted-foreground hover:text-foreground transition-colors">
              How It Works
            </a>
          </div>
          {currentUser ? (
            <div className="flex items-center gap-2">
              <div className="inline-flex h-9 w-9 items-center justify-center rounded-full border border-primary/40 bg-primary/15 text-primary">
                <User className="h-4 w-4" />
              </div>
              <div className="hidden sm:block text-right">
                <p className="text-xs font-medium leading-none">{currentUser.name}</p>
                <p className="text-[10px] text-muted-foreground leading-none mt-1">Connected</p>
              </div>
              <Button type="button" size="sm" variant="outline" onClick={handleLogout}>
                Logout
              </Button>
            </div>
          ) : (
            <Button
              type="button"
              variant="outline"
              className="border-primary/50 hover:bg-primary/10"
              onClick={() => {
                setAuthMode("login")
                setAuthError(null)
                setAuthModalOpen(true)
              }}
            >
              Login
            </Button>
          )}
        </nav>
      </header>

      <main className="relative z-10">
      {/* Hero Section */}
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
                Connect your Steam and Epic libraries, match games with friends, and discover
                what to play next. All in your browser.
              </p>

              {/* Quick Start Options */}
              <section className="bg-card/50 backdrop-blur border border-border rounded-xl p-6 mb-8" aria-labelledby="quick-start-title">
                <h2 id="quick-start-title" className="sr-only">Quick start options</h2>
                <div className="flex gap-2 mb-4">
                  <button
                    onClick={() => setImportMode("link")}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      importMode === "link"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <Link2 className="w-4 h-4 inline mr-2" />
                    Link Account
                  </button>
                  <button
                    onClick={() => setImportMode("import")}
                    className={`flex-1 py-2 px-4 rounded-lg text-sm font-medium transition-all ${
                      importMode === "import"
                        ? "bg-primary text-primary-foreground"
                        : "bg-secondary text-secondary-foreground hover:bg-secondary/80"
                    }`}
                  >
                    <Upload className="w-4 h-4 inline mr-2" />
                    Import List
                  </button>
                </div>

                {importMode === "link" ? (
                  <div className="space-y-3" role="group" aria-label="Link game accounts">
                    <Button
                      type="button"
                      onClick={() => setSteamModalOpen(true)}
                      className={`w-full justify-start gap-3 text-white ${
                        steamId
                          ? "bg-emerald-600 hover:bg-emerald-500"
                          : "bg-[#171a21] hover:bg-[#2a475e]"
                      }`}
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z" />
                      </svg>
                      Connect Steam
                      {steamId && (
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-xs">
                          <CheckCircle2 className="h-4 w-4" />
                          Connected
                        </span>
                      )}
                    </Button>
                    {/* <Button
                      type="button"
                      onClick={() => setEpicModalOpen(true)}
                      className={`w-full justify-start gap-3 text-white ${
                        epicId
                          ? "bg-emerald-600 hover:bg-emerald-500"
                          : "bg-[#313131] hover:bg-[#444444]"
                      }`}
                    >
                      Connect Epic Games
                      {epicId && (
                        <span className="ml-auto inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-xs">
                          <CheckCircle2 className="h-4 w-4" />
                          Connected
                        </span>
                      )}
                    </Button> */}

                    {/* GAMEPASS */}
                    <button
                      type="button"
                      role="switch"
                      aria-checked={hasGamePass ?? false}
                      onClick={() => {
                        const next = !hasGamePass
                        setHasGamePass(next)
                        setXboxConnected(next)
                        updateStoredUserProfile((profile) => ({
                          ...profile,
                          connections: {
                            ...profile.connections,
                            hasGamePass: next,
                          },
                        }))
                        if (!next) {
                          setXboxConnected(false)
                        }
                      }}
                      className={`w-full flex items-center justify-between gap-3 px-4 py-2 rounded-md text-white text-sm font-medium transition-colors ${
                        hasGamePass
                          ? "bg-emerald-600 hover:bg-emerald-500"
                          : "bg-[#107c10] hover:bg-[#0f6f0f]"
                      }`}
                    >
                      <div className="flex items-center gap-3">
                        <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/35 text-xs font-semibold">
                          X
                        </span>
                        <span>{hasGamePass ? "Game Pass activo" : "Connect Xbox / Game Pass"}</span>
                        {hasGamePass && (
                          <span className="inline-flex items-center gap-1 rounded-full bg-white/15 px-2 py-1 text-xs">
                            <CheckCircle2 className="h-4 w-4" />
                            Connected
                          </span>
                        )}
                      </div>

                      {/* Switch visual */}
                      <span
                        className={`relative inline-flex h-5 w-9 shrink-0 rounded-full border-2 border-white/30 transition-colors duration-200 ${
                          hasGamePass ? "bg-white/30" : "bg-black/20"
                        }`}
                      >
                        <span
                          className={`pointer-events-none inline-block h-4 w-4 rounded-full bg-white shadow transform transition-transform duration-200 ${
                            hasGamePass ? "translate-x-4" : "translate-x-0"
                          }`}
                        />
                      </span>
                    </button>

                    <Button
                      type="button"
                      className="w-full mt-2"
                      disabled={!canBeginMatching}
                      onClick={() => {
                        if (!canBeginMatching) {
                          return
                        }
                        router.push("/matching")
                      }}
                    >
                      Begin matching
                    </Button>
                    {!canBeginMatching && (
                      <p className="text-xs text-muted-foreground text-center">
                        {!currentUser
                          ? "Login first to continue."
                          : "Connect at least one account to begin."}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3" role="group" aria-label="Import game list">
                    <p className="text-xs text-muted-foreground">
                      Manually import your library from any platform — one game per line.
                    </p>

                    {importedGames.length > 0 && (
                      <div className="rounded-lg border border-primary/30 bg-primary/10 px-3 py-2">
                        <p className="text-xs text-primary font-medium">
                          ✅ {importedGames.length} games imported
                        </p>
                        <p className="text-[10px] text-muted-foreground mt-0.5 line-clamp-2">
                          {importedGames.slice(0, 3).join(", ")}
                          {importedGames.length > 3 && ` and ${importedGames.length - 3} more...`}
                        </p>
                      </div>
                    )}

                    <Button
                      className="w-full"
                      onClick={() => setImportModalOpen(true)}
                    >
                      <Upload className="w-4 h-4 mr-2" />
                      {importedGames.length > 0 ? "Edit imported list" : "Import game list"}
                    </Button>

                    {importedGames.length > 0 && (
                      <Button
                        className="w-full mt-2"
                        onClick={() => {
                          if (!canBeginMatching) return
                          router.push("/matching")
                        }}
                        disabled={!canBeginMatching}
                      >
                        Begin matching
                        <ArrowRight className="w-4 h-4 ml-2" />
                      </Button>
                    )}
                  </div>
                )}
              </section>

              <p className="text-xs text-muted-foreground">
                Free to use • No account required for import
              </p>
            </article>

            {/* Preview Card */}
            <aside className="relative" aria-labelledby="matched-games-title">
              <div className="absolute -inset-4 bg-primary/20 blur-3xl rounded-full" />
              <div className="relative bg-card border border-border rounded-2xl p-6 shadow-2xl">
                <div className="flex items-center justify-between mb-6">
                  <h2 id="matched-games-title" className="font-semibold">Trending Multiplayer Games</h2>
                  <span className="text-xs text-primary bg-primary/10 px-3 py-1 rounded-full">
                    {isTrendingLoading ? "Refreshing..." : "Live now"}
                  </span>
                </div>
                {trendingLoadError && (
                  <p className="mb-4 rounded-md border border-amber-500/20 bg-amber-500/10 px-3 py-2 text-xs text-amber-300">
                    {trendingLoadError}
                  </p>
                )}
                <ul className="space-y-3">
                  {trendingGames.map((game, i) => (
                    <li
                      key={i}
                      className="flex items-center justify-between p-4 bg-secondary/50 rounded-xl hover:bg-secondary transition-colors cursor-pointer group"
                    >
                      <article className="flex items-center justify-between gap-4 w-full">
                      <div className="flex items-center gap-4">
                        <div className="h-12 w-20 overflow-hidden rounded-md border border-border bg-background/60">
                          {game.imageUrl ? (
                            <img
                              src={game.imageUrl}
                              alt={`${game.name} cover`}
                              className="h-full w-full object-cover"
                              loading="lazy"
                            />
                          ) : (
                            <div className="flex h-full w-full items-center justify-center text-primary/70">
                              <Gamepad2 className="h-5 w-5" />
                            </div>
                          )}
                        </div>
                        <div>
                          <p className="font-medium">{game.name}</p>
                          <p className="text-sm text-muted-foreground">
                            {game.category}
                          </p>
                          <div className="mt-1 flex items-center gap-2">
                            {game.stores.map((store) => (
                              <span
                                key={store}
                                className="text-[10px] uppercase tracking-wide text-muted-foreground bg-background/80 border border-border px-2 py-0.5 rounded"
                              >
                                {store}
                              </span>
                            ))}
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-3">
                        <div className="text-right">
                          <p className="text-sm font-medium">{game.playersNow} now</p>
                          <div className="inline-flex items-center gap-1 text-xs text-emerald-500">
                            <Star className="w-3 h-3" />
                            {game.trendLabel}
                          </div>
                        </div>
                      </div>
                      </article>
                    </li>
                  ))}
                </ul>
              </div>
            </aside>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section id="features" className="px-6 py-20 lg:px-12" aria-labelledby="features-title">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 id="features-title" className="text-3xl md:text-4xl font-bold mb-4">Everything You Need</h2>
            <p className="text-muted-foreground max-w-2xl mx-auto">
              Powerful features to help you and your friends find the perfect game
            </p>
          </div>
          <ul className="grid md:grid-cols-2 lg:grid-cols-4 gap-6">
            {features.map((feature, i) => (
              <li
                key={i}
                className="group p-6 bg-card/50 backdrop-blur border border-border rounded-xl hover:border-primary/50 transition-all duration-300 hover:shadow-[0_0_30px_rgba(0,255,200,0.1)]"
              >
                <article>
                <div className="w-12 h-12 bg-primary/10 rounded-lg flex items-center justify-center text-primary mb-4 group-hover:bg-primary group-hover:text-primary-foreground transition-all">
                  {feature.icon}
                </div>
                <h3 className="font-semibold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.description}</p>
                </article>
              </li>
            ))}
          </ul>
        </div>
      </section>

      {/* Stats Section */}
      <section id="how-it-works" className="px-6 py-20 lg:px-12 border-y border-border" aria-labelledby="stats-title">
        <div className="max-w-7xl mx-auto">
          <h2 id="stats-title" className="sr-only">Platform stats</h2>
          <dl className="grid grid-cols-2 md:grid-cols-4 gap-8 text-center">
            {[
              { value: "50K+", label: "Games Indexed" },
              { value: "100K+", label: "Active Users" },
              { value: "1M+", label: "Matches Made" },
              { value: "4.9", label: "User Rating" },
            ].map((stat, i) => (
              <div key={i}>
                <dt className="text-muted-foreground text-sm">{stat.label}</dt>
                <dd className="text-3xl md:text-4xl font-bold text-primary mb-2">{stat.value}</dd>
              </div>
            ))}
          </dl>
        </div>
      </section>

      {/* CTA Section */}
      <section id="pricing" className="px-6 py-20 lg:px-12" aria-labelledby="cta-title">
        <div className="max-w-4xl mx-auto text-center">
          <h2 id="cta-title" className="text-3xl md:text-4xl font-bold mb-4">
            Ready to Find Your Next Game?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-2xl mx-auto">
            Join thousands of gamers who use QCoop to discover what to play with friends.
          </p>
          {/* <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8">
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Watch Demo
            </Button>
          </div> */}
        </div>
      </section>
      </main>

      <Dialog open={steamModalOpen} onOpenChange={setSteamModalOpen}>
        <DialogContent className="max-w-xl overflow-hidden border-border bg-card/95 p-0 shadow-2xl backdrop-blur-xl">
          <div className="bg-gradient-to-br from-primary/15 via-transparent to-accent/10 px-6 pt-8 pb-6 text-center">
            <DialogHeader className="items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#171a21] shadow-lg shadow-primary/15">
                  <svg className="w-10 h-10" viewBox="0 0 24 24" fill="currentColor"><path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z"></path></svg>
              </div>
              <DialogTitle>Connect Steam</DialogTitle>
              <DialogDescription className="max-w-sm text-sm">
                Sign in with OpenID to validate your Steam identity. This is a quick test flow, not a full account setup.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-6 py-6">
            <section className="rounded-2xl border border-border bg-secondary/30 p-4 text-center" aria-labelledby="steam-privacy-title">
              <h3 id="steam-privacy-title" className="mb-2 font-semibold">
                Privacy information
              </h3>
              <p className="text-sm text-muted-foreground">
                By continuing, QCoop will request read access to the following Steam account data:
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>Owned game library</li>
                <li>Friends list</li>
              </ul>
            </section>

            <section className="space-y-3 text-center" aria-labelledby="steam-auth-title">
              <h3 id="steam-auth-title" className="font-semibold">
                OpenID Sign-In
              </h3>
              <div className="flex justify-center">
                <button
                  type="button"
                  onClick={startSteamOpenId}
                  className="inline-flex items-center justify-center overflow-hidden rounded-md border border-border bg-[#171a21] transition-opacity cursor-pointer"
                >
                  <img
                    src="/sits_01.png"
                    alt="Sign in through Steam"
                    width={180}
                    height={42}
                    className="block h-auto w-auto"
                  />
                </button>
              </div>
              {isWaitingSteamAuth && (
                <p className="text-sm text-primary">Waiting for Steam authentication...</p>
              )}
              {steamId && (
                <div className="rounded-xl border border-primary/30 bg-primary/10 px-4 py-3 text-sm text-primary">
                  Steam authenticated successfully. steamId: {steamId}
                </div>
              )}
              {steamError && <p className="text-sm text-destructive">{steamError}</p>}
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={authModalOpen} onOpenChange={setAuthModalOpen}>
        <DialogContent className="max-w-md overflow-hidden border-border bg-card/95 p-0 shadow-2xl backdrop-blur-xl">
          <div className="bg-gradient-to-br from-primary/15 via-transparent to-accent/10 px-6 pt-8 pb-6 text-center">
            <DialogHeader className="items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-primary/15 text-primary shadow-lg shadow-primary/15">
                <User className="h-7 w-7" />
              </div>
              <DialogTitle>{authMode === "login" ? "Login" : "Create account"}</DialogTitle>
              <DialogDescription className="max-w-sm text-sm">
                {authMode === "login"
                  ? "Use fixed mock credentials or your registered local user."
                  : "Create a local mock account without database."}
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-4 px-6 py-6">
            {authMode === "register" && (
              <div>
                <label className="mb-1 block text-xs font-medium text-muted-foreground">Name</label>
                <input
                  type="text"
                  value={authName}
                  onChange={(event) => setAuthName(event.target.value)}
                  className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                  placeholder="Your name"
                />
              </div>
            )}
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Email</label>
              <input
                type="email"
                value={authEmail}
                onChange={(event) => setAuthEmail(event.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                placeholder="demo@qcoop.app"
              />
            </div>
            <div>
              <label className="mb-1 block text-xs font-medium text-muted-foreground">Password</label>
              <input
                type="password"
                value={authPassword}
                onChange={(event) => setAuthPassword(event.target.value)}
                className="h-9 w-full rounded-md border border-border bg-background px-2 text-sm"
                placeholder="demo123"
              />
            </div>

            {authError && <p className="text-xs text-destructive">{authError}</p>}

            <div className="rounded-md border border-border/70 bg-secondary/20 p-2 text-[11px] text-muted-foreground">
              Demo login: demo@qcoop.app / demo123
            </div>

            <div className="flex gap-2">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setAuthMode(authMode === "login" ? "register" : "login")
                  setAuthError(null)
                }}
              >
                {authMode === "login" ? "Need account" : "Have account"}
              </Button>
              <Button type="button" className="flex-1" onClick={handleAuthSubmit}>
                {authMode === "login" ? "Login" : "Register"}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={epicModalOpen} onOpenChange={setEpicModalOpen}>
        <DialogContent className="max-w-xl overflow-hidden border-border bg-card/95 p-0 shadow-2xl backdrop-blur-xl">
          <div className="bg-gradient-to-br from-primary/15 via-transparent to-accent/10 px-6 pt-8 pb-6 text-center">
            <DialogHeader className="items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#313131] text-white shadow-lg shadow-primary/15">
                <span className="text-xl font-bold">E</span>
              </div>
              <DialogTitle>Connect Epic Games</DialogTitle>
              <DialogDescription className="max-w-sm text-sm">
                Connect your Epic Games account to continue building your multiplayer match profile.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-6 py-6">
            {/* <section className="rounded-2xl border border-border bg-secondary/30 p-4 text-center" aria-labelledby="epic-privacy-title">
              <h3 id="epic-privacy-title" className="mb-2 font-semibold">
                Privacy information
              </h3>
              <p className="text-sm text-muted-foreground">
                By continuing, QCoop will request read access to the following account data:
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>Owned game library</li>
                <li>Friends list</li>
              </ul>
            </section> */}

            <section className="space-y-3" aria-labelledby="epic-auth-title">
              {/* <h3 id="epic-auth-title" className="font-semibold text-center">
                Account Sign-In
              </h3>
              <div className="flex justify-center">
                <Button
                  type="button"
                  onClick={startEpicOAuth}
                  className="bg-[#313131] hover:bg-[#444444] text-white"
                >
                  Sign in with Epic Games
                </Button>
              </div> */}

              {/* Aviso sobre limitación de biblioteca */}
              <div className="rounded-lg border border-amber-400/20 bg-amber-400/5 px-3 py-2 text-xs text-amber-300">
                <p className="font-medium mb-1">⚠️ Library access not available</p>
                <p>
                  Epic Games does not allow third-party apps to read your game library. 
                  So you have to import your library manually below.
                  {/* You can still connect your account for identity and friends matching, 
                  or import your library manually below. */}
                </p>
              </div>

              {/* Import manual */}
              <div className="space-y-2">
                <p className="text-xs text-muted-foreground text-center">
                  To add Epic games manually, paste your library below:
                </p>
                <textarea
                  className="w-full rounded-md border border-border bg-background px-3 py-2 text-xs min-h-[80px] resize-none"
                  placeholder={"Fortnite\nRocket League\nFallen Order\n..."}
                  onChange={(e) => {
                    const games = e.target.value
                      .split("\n")
                      .map((g) => g.trim())
                      .filter(Boolean)
                      updateStoredUserProfile((profile) => ({
                        ...profile,
                        importedGames: Array.from(new Set([...profile.importedGames, ...games])),
                      }))
                  }}
                />
                <p className="text-[10px] text-muted-foreground text-center">
                  One game per line.
                  {/* <a
                    href="https://store.epicgames.com/en-US/library"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-primary underline"
                  >
                    store.epicgames.com/library ↗
                  </a> */}
                </p>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      {/* Modal para importar libreria manual */}
      <Dialog open={importModalOpen} onOpenChange={() => {}}>
        <DialogContent
          className="max-w-xl overflow-hidden border-border bg-card/95 p-0 shadow-2xl backdrop-blur-xl"
          onPointerDownOutside={(e) => e.preventDefault()}
          onEscapeKeyDown={(e) => e.preventDefault()}
        >
          <div className="bg-gradient-to-br from-primary/15 via-transparent to-accent/10 px-6 pt-8 pb-6">
            <DialogHeader className="items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-secondary shadow-lg">
                <Upload className="w-6 h-6 text-primary" />
              </div>
              <DialogTitle>Import game list</DialogTitle>
              <DialogDescription className="max-w-sm text-sm">
                Paste your games one per line. Works with any platform — Epic, Xbox, GOG, or any other.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-6 py-6">

            {/* Textarea */}
            <div className="space-y-2">
              <div className="flex items-center justify-between">
                <label className="text-sm font-medium" htmlFor="import-textarea">
                  Your games
                </label>
                {importText.split("\n").filter((g) => g.trim()).length > 0 && (
                  <span className="text-xs text-primary">
                    {importText.split("\n").filter((g) => g.trim()).length} games detected
                  </span>
                )}
              </div>
              <textarea
                id="import-textarea"
                className="w-full rounded-xl border border-border bg-background/70 px-4 py-3 text-sm min-h-[200px] resize-none focus:outline-none focus:ring-1 focus:ring-primary/50 placeholder:text-muted-foreground/50"
                placeholder={"Rocket League\nFortnite\nFallen Order\nCyberpunk 2077\n..."}
                value={importText}
                onChange={(e) => setImportText(e.target.value)}
                spellCheck={false}
              />
              <p className="text-[10px] text-muted-foreground">
                One game per line. Names are matched case-insensitively when comparing with friends.
              </p>
            </div>

            {/* Preview de los juegos detectados */}
            {importText.split("\n").filter((g) => g.trim()).length > 0 && (
              <section className="rounded-xl border border-border bg-secondary/20 p-3 max-h-32 overflow-y-auto">
                <p className="text-[10px] uppercase tracking-widest text-muted-foreground mb-2 font-medium">Preview</p>
                <div className="flex flex-wrap gap-1.5">
                  {importText
                    .split("\n")
                    .map((g) => g.trim())
                    .filter(Boolean)
                    .map((game, i) => (
                      <span
                        key={i}
                        className="rounded-full border border-border bg-background/70 px-2 py-0.5 text-[10px] text-muted-foreground"
                      >
                        {game}
                      </span>
                    ))}
                </div>
              </section>
            )}

            {/* Botones */}
            <div className="flex gap-3 pt-1">
              <Button
                type="button"
                variant="outline"
                className="flex-1"
                onClick={() => {
                  setImportText(
                    importedGames.length > 0
                      ? importedGames.join("\n")
                      : ""
                  )
                  setImportModalOpen(false)
                }}
              >
                Cancel
              </Button>
              <Button
                type="button"
                className="flex-1"
                disabled={importText.split("\n").filter((g) => g.trim()).length === 0}
                onClick={confirmImport}
              >
                <CheckCircle2 className="w-4 h-4 mr-2" />
                Import {importText.split("\n").filter((g) => g.trim()).length > 0
                  ? `${importText.split("\n").filter((g) => g.trim()).length} games`
                  : ""}
              </Button>
            </div>
          </div>
        </DialogContent>
      </Dialog>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 lg:px-12 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded bg-primary flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">QCoop</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for UI/UX Course • 2026
          </p>
          <Link
            href="/privacy"
            className="text-sm text-muted-foreground hover:text-primary transition-colors"
          >
            Privacy Policy
          </Link>
        </div>
      </footer>
    </div>
  )
}
