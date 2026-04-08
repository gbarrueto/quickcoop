"use client"

import { useState } from "react"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import {
  Gamepad2,
  Users,
  Zap,
  Star,
  ArrowRight,
  Upload,
  Sparkles,
  Globe,
  Trophy,
  Heart,
  TrendingUp,
} from "lucide-react"

const trendingGames = [
  { name: "Lethal Company", genre: "Horror Co-op", players: "1-4", trending: "+45%" },
  { name: "Palworld", genre: "Survival", players: "1-32", trending: "+120%" },
  { name: "Helldivers 2", genre: "Shooter", players: "1-4", trending: "+89%" },
]

const reviews = [
  {
    name: "Alex",
    avatar: "A",
    text: "Finally found games my whole group owns. Saved us hours of searching!",
    rating: 5,
  },
  {
    name: "Sam",
    avatar: "S",
    text: "The recommendation engine is incredible. Found our new favorite game.",
    rating: 5,
  },
  {
    name: "Jordan",
    avatar: "J",
    text: "Import feature is a game changer. No account needed!",
    rating: 5,
  },
]

export function LandingGlass() {
  const [activeTab, setActiveTab] = useState<"connect" | "import">("connect")

  return (
    <div className="min-h-screen bg-background relative overflow-hidden">
      {/* Gradient Orbs */}
      <div className="fixed inset-0 pointer-events-none overflow-hidden">
        <div className="absolute top-[-20%] left-[-10%] w-[600px] h-[600px] rounded-full bg-primary/30 blur-[120px]" />
        <div className="absolute bottom-[-20%] right-[-10%] w-[500px] h-[500px] rounded-full bg-accent/30 blur-[120px]" />
        <div className="absolute top-[40%] right-[20%] w-[300px] h-[300px] rounded-full bg-primary/20 blur-[80px]" />
      </div>

      {/* Navigation */}
      <nav className="relative z-10 flex items-center justify-between px-6 py-5 lg:px-12">
        <div className="flex items-center gap-3">
          <div className="w-11 h-11 rounded-2xl bg-gradient-to-br from-primary to-accent flex items-center justify-center shadow-lg shadow-primary/25">
            <Gamepad2 className="w-6 h-6 text-primary-foreground" />
          </div>
          <span className="text-xl font-bold">PlayMate</span>
        </div>
        <div className="hidden md:flex items-center gap-1">
          {["Features", "Discover", "Pricing", "About"].map((item) => (
            <a
              key={item}
              href="#"
              className="px-4 py-2 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors rounded-lg hover:bg-card/50"
            >
              {item}
            </a>
          ))}
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="hidden sm:inline-flex">
            Log In
          </Button>
          <Button className="bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-lg shadow-primary/25">
            Get Started
          </Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="relative z-10 px-6 py-16 lg:px-12 lg:py-24">
        <div className="max-w-7xl mx-auto">
          <div className="text-center max-w-4xl mx-auto mb-16">
            <div className="inline-flex items-center gap-2 px-4 py-2 rounded-full bg-card/60 backdrop-blur border border-border text-sm mb-8">
              <Sparkles className="w-4 h-4 text-accent" />
              <span>AI-Powered Game Recommendations</span>
            </div>
            <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.1] mb-6 bg-gradient-to-br from-foreground via-foreground to-muted-foreground bg-clip-text">
              Your Squad&apos;s Perfect
              <span className="block bg-gradient-to-r from-primary to-accent bg-clip-text text-transparent">
                Game Night Awaits
              </span>
            </h1>
            <p className="text-lg md:text-xl text-muted-foreground max-w-2xl mx-auto leading-relaxed">
              Connect Steam & Epic, match libraries with friends, and discover games
              everyone can play. All from your browser.
            </p>
          </div>

          {/* Main Card */}
          <div className="max-w-2xl mx-auto">
            <div className="bg-card/60 backdrop-blur-xl border border-border rounded-3xl p-8 shadow-2xl">
              {/* Tabs */}
              <div className="flex p-1 bg-secondary/50 rounded-2xl mb-6">
                <button
                  onClick={() => setActiveTab("connect")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === "connect"
                      ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Globe className="w-4 h-4" />
                  Connect Account
                </button>
                <button
                  onClick={() => setActiveTab("import")}
                  className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl text-sm font-medium transition-all ${
                    activeTab === "import"
                      ? "bg-gradient-to-r from-primary to-accent text-primary-foreground shadow-lg"
                      : "text-muted-foreground hover:text-foreground"
                  }`}
                >
                  <Upload className="w-4 h-4" />
                  Import List
                </button>
              </div>

              {activeTab === "connect" ? (
                <div className="space-y-4">
                  <Button
                    variant="outline"
                    className="w-full h-14 justify-start gap-4 text-base bg-[#1b2838]/80 hover:bg-[#1b2838] border-[#1b2838] text-white"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M11.979 0C5.678 0 .511 4.86.022 11.037l6.432 2.658c.545-.371 1.203-.59 1.912-.59.063 0 .125.004.188.006l2.861-4.142V8.91c0-2.495 2.028-4.524 4.524-4.524 2.494 0 4.524 2.031 4.524 4.527s-2.03 4.525-4.524 4.525h-.105l-4.076 2.911c0 .052.004.105.004.159 0 1.875-1.515 3.396-3.39 3.396-1.635 0-3.016-1.173-3.331-2.727L.436 15.27C1.862 20.307 6.486 24 11.979 24c6.627 0 11.999-5.373 11.999-12S18.605 0 11.979 0z" />
                      </svg>
                    </div>
                    Connect with Steam
                    <ArrowRight className="w-5 h-5 ml-auto" />
                  </Button>
                  <Button
                    variant="outline"
                    className="w-full h-14 justify-start gap-4 text-base bg-[#2a2a2a]/80 hover:bg-[#2a2a2a] border-[#2a2a2a] text-white"
                  >
                    <div className="w-8 h-8 rounded-lg bg-white/10 flex items-center justify-center">
                      <svg className="w-5 h-5" viewBox="0 0 24 24" fill="currentColor">
                        <path d="M3.537 0C2.165 0 1.66.506 1.66 1.879V18.44a4.262 4.262 0 00.136 1.049c.238.97.848 1.877 1.877 2.635l6.26 4.588c.57.418.879.418 1.449 0l6.261-4.588c1.029-.758 1.639-1.665 1.877-2.635a4.262 4.262 0 00.136-1.049V1.879C19.656.506 19.151 0 17.779 0zm7.12 2.963l5.912 11.26h-3.188l-1.073-2.208H8.63l-1.072 2.208H4.37zm0 3.947l1.767 3.631H8.89z" />
                      </svg>
                    </div>
                    Connect with Epic Games
                    <ArrowRight className="w-5 h-5 ml-auto" />
                  </Button>
                  <p className="text-center text-sm text-muted-foreground pt-2">
                    We only read your game library. Your data stays private.
                  </p>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="relative">
                    <Input
                      placeholder="Paste your game list here..."
                      className="h-14 text-base bg-secondary/50 border-border pl-5 pr-24"
                    />
                    <Button className="absolute right-2 top-2 h-10 bg-gradient-to-r from-primary to-accent">
                      Import
                    </Button>
                  </div>
                  <div className="flex items-center justify-center gap-4 text-sm text-muted-foreground">
                    <span>Supports:</span>
                    <span className="px-2 py-1 bg-secondary/50 rounded">CSV</span>
                    <span className="px-2 py-1 bg-secondary/50 rounded">JSON</span>
                    <span className="px-2 py-1 bg-secondary/50 rounded">Text</span>
                  </div>
                  <p className="text-center text-sm text-muted-foreground">
                    No account needed. Just paste and match.
                  </p>
                </div>
              )}
            </div>
          </div>
        </div>
      </section>

      {/* Features Bento Grid */}
      <section className="relative z-10 px-6 py-20 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-16">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">
              Everything for Game Night
            </h2>
            <p className="text-muted-foreground max-w-xl mx-auto">
              Powerful features wrapped in a beautiful, easy-to-use interface
            </p>
          </div>

          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-4">
            {/* Large Feature Card */}
            <div className="lg:col-span-2 bg-card/60 backdrop-blur-xl border border-border rounded-3xl p-8 group hover:border-primary/50 transition-all">
              <div className="flex flex-col h-full">
                <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-primary/20 to-accent/20 flex items-center justify-center mb-6">
                  <Users className="w-7 h-7 text-primary" />
                </div>
                <h3 className="text-2xl font-bold mb-3">Smart Game Matching</h3>
                <p className="text-muted-foreground mb-6 flex-grow">
                  Our algorithm compares libraries across all connected accounts and instantly
                  shows games everyone owns. Filter by player count, genre, or let AI recommend
                  based on your group&apos;s preferences.
                </p>
                <div className="flex gap-3 flex-wrap">
                  {["Cross-platform", "Real-time sync", "Group filters"].map((tag) => (
                    <span
                      key={tag}
                      className="px-3 py-1.5 bg-secondary/50 rounded-full text-sm"
                    >
                      {tag}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            {/* Trending Card */}
            <div className="bg-card/60 backdrop-blur-xl border border-border rounded-3xl p-6 group hover:border-accent/50 transition-all">
              <div className="flex items-center gap-3 mb-4">
                <div className="w-10 h-10 rounded-xl bg-accent/20 flex items-center justify-center">
                  <TrendingUp className="w-5 h-5 text-accent" />
                </div>
                <h3 className="font-bold">Trending Now</h3>
              </div>
              <div className="space-y-3">
                {trendingGames.map((game, i) => (
                  <div
                    key={i}
                    className="flex items-center justify-between p-3 bg-secondary/30 rounded-xl"
                  >
                    <div>
                      <p className="font-medium text-sm">{game.name}</p>
                      <p className="text-xs text-muted-foreground">
                        {game.genre} • {game.players}
                      </p>
                    </div>
                    <span className="text-xs font-medium text-green-400">{game.trending}</span>
                  </div>
                ))}
              </div>
            </div>

            {/* Feature Cards */}
            {[
              {
                icon: <Star className="w-5 h-5" />,
                title: "Ratings & Reviews",
                desc: "Aggregated scores from Metacritic, Steam & more",
              },
              {
                icon: <Zap className="w-5 h-5" />,
                title: "Specs Check",
                desc: "Verify everyone can run the game",
              },
              {
                icon: <Trophy className="w-5 h-5" />,
                title: "Achievements",
                desc: "Track group completion & milestones",
              },
            ].map((feature, i) => (
              <div
                key={i}
                className="bg-card/60 backdrop-blur-xl border border-border rounded-3xl p-6 group hover:border-primary/50 transition-all"
              >
                <div className="w-10 h-10 rounded-xl bg-primary/20 flex items-center justify-center text-primary mb-4">
                  {feature.icon}
                </div>
                <h3 className="font-bold mb-2">{feature.title}</h3>
                <p className="text-sm text-muted-foreground">{feature.desc}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Reviews Section */}
      <section className="relative z-10 px-6 py-20 lg:px-12">
        <div className="max-w-7xl mx-auto">
          <div className="text-center mb-12">
            <h2 className="text-3xl md:text-4xl font-bold mb-4">Loved by Gamers</h2>
            <p className="text-muted-foreground">See what our community says</p>
          </div>
          <div className="grid md:grid-cols-3 gap-6">
            {reviews.map((review, i) => (
              <div
                key={i}
                className="bg-card/60 backdrop-blur-xl border border-border rounded-2xl p-6"
              >
                <div className="flex items-center gap-3 mb-4">
                  <div className="w-10 h-10 rounded-full bg-gradient-to-br from-primary to-accent flex items-center justify-center text-primary-foreground font-bold">
                    {review.avatar}
                  </div>
                  <div>
                    <p className="font-semibold">{review.name}</p>
                    <div className="flex gap-0.5">
                      {Array.from({ length: review.rating }).map((_, j) => (
                        <Star
                          key={j}
                          className="w-3.5 h-3.5 text-yellow-400 fill-yellow-400"
                        />
                      ))}
                    </div>
                  </div>
                </div>
                <p className="text-muted-foreground">{review.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* CTA Section */}
      <section className="relative z-10 px-6 py-20 lg:px-12">
        <div className="max-w-4xl mx-auto">
          <div className="relative overflow-hidden bg-gradient-to-br from-primary/20 via-card to-accent/20 backdrop-blur-xl border border-border rounded-3xl p-12 lg:p-16 text-center">
            <div className="absolute inset-0 bg-gradient-to-br from-primary/10 to-accent/10" />
            <div className="relative">
              <Heart className="w-12 h-12 mx-auto mb-6 text-accent" />
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                Start Your Game Night Journey
              </h2>
              <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
                Join thousands of friend groups finding their perfect multiplayer experience.
              </p>
              <Button
                size="lg"
                className="text-lg px-10 h-14 bg-gradient-to-r from-primary to-accent hover:opacity-90 shadow-xl shadow-primary/25"
              >
                Get Started Free
                <ArrowRight className="w-5 h-5 ml-2" />
              </Button>
              <p className="text-sm text-muted-foreground mt-4">
                No credit card required
              </p>
            </div>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="relative z-10 px-6 py-12 lg:px-12 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-3">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-primary to-accent flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-bold">PlayMate</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for UI/UX Course • 2026
          </p>
        </div>
      </footer>
    </div>
  )
}
