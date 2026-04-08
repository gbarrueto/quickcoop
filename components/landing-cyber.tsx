"use client"

import { useEffect, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog"
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
} from "lucide-react"

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
    description: "AI-powered suggestions based on your play style",
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

const STEAM_SESSION_KEY = "qcoop-steam-id"
const EPIC_CONNECTED_SESSION_KEY = "qcoop-epic-connected"
const XBOX_CONNECTED_SESSION_KEY = "qcoop-xbox-connected"
const TRENDING_CACHE_KEY = "qcoop-trending-multiplayer-cache"
const TRENDING_CACHE_TTL_MS = 1000 * 60 * 60 * 24

export function LandingCyber() {
  const router = useRouter()
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

  const canBeginMatching = Boolean(steamId)

  useEffect(() => {
    const storedSteamId = window.sessionStorage.getItem(STEAM_SESSION_KEY)

    if (storedSteamId) {
      setSteamId(storedSteamId)
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
        window.sessionStorage.setItem(STEAM_SESSION_KEY, resolvedSteamId)
        setIsWaitingSteamAuth(false)
      }

      if (event.data.type === "steam-auth-error") {
        setIsWaitingSteamAuth(false)
        setSteamError(event.data.error || "Steam authentication failed")
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
            <a href="#pricing" className="text-muted-foreground hover:text-foreground transition-colors">
              Pricing
            </a>
          </div>
          <Button variant="outline" className="border-primary/50 hover:bg-primary/10">
            Sign In
          </Button>
        </nav>
      </header>

      <main className="relative z-10">
      {/* Hero Section */}
      <section className="px-6 py-20 lg:px-12 lg:py-32" aria-labelledby="hero-title">
        <div className="max-w-7xl mx-auto">
          <div className="grid lg:grid-cols-2 gap-12 items-center">
            <article>
              <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-primary/10 border border-primary/30 text-primary text-sm mb-6">
                <Zap className="w-4 h-4" />
                <span>No Installation Required</span>
              </div>
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
                    <Button
                      type="button"
                      onClick={() => setEpicModalOpen(true)}
                      className="w-full justify-start gap-3 text-white bg-[#313131] hover:bg-[#444444]"
                    >
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3.537 0C2.165 0 1.66.506 1.66 1.879V18.44a4.262 4.262 0 00.136 1.049c.238.97.848 1.877 1.877 2.635l6.26 4.588c.57.418.879.418 1.449 0l6.261-4.588c1.029-.758 1.639-1.665 1.877-2.635a4.262 4.262 0 00.136-1.049V1.879C19.656.506 19.151 0 17.779 0zm7.12 2.963l5.912 11.26h-3.188l-1.073-2.208H8.63l-1.072 2.208H4.37zm0 3.947l1.767 3.631H8.89z" />
                      </svg>
                      Connect Epic Games
                    </Button>
                    <Button
                      type="button"
                      onClick={() => setXboxModalOpen(true)}
                      className="w-full justify-start gap-3 text-white bg-[#107c10] hover:bg-[#0f6f0f]"
                    >
                      <span className="inline-flex h-5 w-5 items-center justify-center rounded-full border border-white/35 text-xs font-semibold">
                        X
                      </span>
                      Connect Xbox account
                    </Button>
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
                        Connect at least one account to begin. Steam is the only integration enabled for now.
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="space-y-3" role="group" aria-label="Import game list">
                    <Input
                      placeholder="Paste your game list here..."
                      className="bg-input border-border"
                    />
                    <p className="text-xs text-muted-foreground">
                      Export your library from Steam or Epic and paste it here
                    </p>
                    <Button className="w-full">
                      <Upload className="w-4 h-4 mr-2" />
                      Import Games
                    </Button>
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
          <div className="flex flex-col sm:flex-row gap-4 justify-center">
            <Button size="lg" className="text-lg px-8">
              Get Started Free
              <ArrowRight className="w-5 h-5 ml-2" />
            </Button>
            <Button size="lg" variant="outline" className="text-lg px-8">
              Watch Demo
            </Button>
          </div>
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
            <section className="rounded-2xl border border-border bg-secondary/30 p-4 text-center" aria-labelledby="epic-privacy-title">
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
            </section>

            <section className="space-y-3 text-center" aria-labelledby="epic-auth-title">
              <h3 id="epic-auth-title" className="font-semibold">
                Account Sign-In
              </h3>
              <div className="flex justify-center">
                <Button type="button" disabled className="bg-[#313131] text-white opacity-70 cursor-not-allowed">
                  Epic integration coming soon
                </Button>
              </div>
            </section>
          </div>
        </DialogContent>
      </Dialog>

      <Dialog open={xboxModalOpen} onOpenChange={setXboxModalOpen}>
        <DialogContent className="max-w-xl overflow-hidden border-border bg-card/95 p-0 shadow-2xl backdrop-blur-xl">
          <div className="bg-gradient-to-br from-primary/15 via-transparent to-accent/10 px-6 pt-8 pb-6 text-center">
            <DialogHeader className="items-center text-center">
              <div className="mb-4 flex h-14 w-14 items-center justify-center rounded-2xl bg-[#107c10] text-white shadow-lg shadow-primary/15">
                <span className="text-xl font-bold">X</span>
              </div>
              <DialogTitle>Connect Xbox account</DialogTitle>
              <DialogDescription className="max-w-sm text-sm">
                Connect your Xbox account to include your console profile in future game matching.
              </DialogDescription>
            </DialogHeader>
          </div>

          <div className="space-y-5 px-6 py-6">
            <section className="rounded-2xl border border-border bg-secondary/30 p-4 text-center" aria-labelledby="xbox-privacy-title">
              <h3 id="xbox-privacy-title" className="mb-2 font-semibold">
                Privacy information
              </h3>
              <p className="text-sm text-muted-foreground">
                By continuing, QCoop will request read access to the following account data:
              </p>
              <ul className="mt-3 space-y-1 text-sm text-muted-foreground">
                <li>Owned game library</li>
                <li>Friends list</li>
              </ul>
            </section>

            <section className="space-y-3 text-center" aria-labelledby="xbox-auth-title">
              <h3 id="xbox-auth-title" className="font-semibold">
                Account Sign-In
              </h3>
              <div className="flex justify-center">
                <Button type="button" disabled className="bg-[#107c10] text-white opacity-70 cursor-not-allowed">
                  Xbox integration coming soon
                </Button>
              </div>
            </section>
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
        </div>
      </footer>
    </div>
  )
}
