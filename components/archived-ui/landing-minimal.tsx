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
  Check,
  ChevronDown,
  Search,
  Filter,
} from "lucide-react"

const platforms = ["Steam", "Epic Games", "GOG", "Origin"]

const matchedGames = [
  {
    name: "Stardew Valley",
    image: "🌾",
    players: "1-4",
    price: "$14.99",
    match: 4,
    platforms: ["Steam", "Epic Games"],
  },
  {
    name: "Terraria",
    image: "⛏️",
    players: "1-8",
    price: "$9.99",
    match: 4,
    platforms: ["Steam"],
  },
  {
    name: "Deep Rock Galactic",
    image: "🪨",
    players: "1-4",
    price: "$29.99",
    match: 3,
    platforms: ["Steam", "Epic Games"],
  },
  {
    name: "Valheim",
    image: "⚔️",
    players: "1-10",
    price: "$19.99",
    match: 3,
    platforms: ["Steam"],
  },
]

const steps = [
  {
    number: "01",
    title: "Connect Your Libraries",
    description: "Link your Steam, Epic, or import your game list directly",
  },
  {
    number: "02",
    title: "Add Your Friends",
    description: "Invite friends or share your unique group code",
  },
  {
    number: "03",
    title: "Get Matched",
    description: "We find games everyone owns and can play together",
  },
]

export function LandingMinimal() {
  const [selectedPlatforms, setSelectedPlatforms] = useState<string[]>([])

  const togglePlatform = (platform: string) => {
    setSelectedPlatforms((prev) =>
      prev.includes(platform) ? prev.filter((p) => p !== platform) : [...prev, platform]
    )
  }

  return (
    <div className="min-h-screen bg-background">
      {/* Navigation */}
      <nav className="flex items-center justify-between px-6 py-6 lg:px-16 max-w-7xl mx-auto">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-primary flex items-center justify-center">
            <Gamepad2 className="w-5 h-5 text-primary-foreground" />
          </div>
          <span className="text-xl font-semibold tracking-tight">PlayMate</span>
        </div>
        <div className="hidden md:flex items-center gap-10 text-sm font-medium">
          <a href="#" className="text-foreground">
            Features
          </a>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
            How It Works
          </a>
          <a href="#" className="text-muted-foreground hover:text-foreground transition-colors">
            Pricing
          </a>
        </div>
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="hidden sm:inline-flex">
            Sign In
          </Button>
          <Button>Get Started</Button>
        </div>
      </nav>

      {/* Hero Section */}
      <section className="px-6 py-16 lg:px-16 lg:py-24 max-w-7xl mx-auto">
        <div className="max-w-3xl">
          <p className="text-sm font-medium text-accent mb-4 tracking-wide uppercase">
            Game Matching Made Simple
          </p>
          <h1 className="text-4xl md:text-6xl lg:text-7xl font-bold leading-[1.1] tracking-tight mb-6">
            Find games to play
            <br />
            <span className="text-muted-foreground">with your friends</span>
          </h1>
          <p className="text-lg text-muted-foreground mb-10 max-w-xl leading-relaxed">
            Connect your game libraries, match with friends, and discover what everyone can
            play together. No installs, no hassle.
          </p>

          {/* Search-like Input */}
          <div className="flex flex-col sm:flex-row gap-3 max-w-xl">
            <div className="relative flex-1">
              <Search className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-muted-foreground" />
              <Input
                placeholder="Enter your Steam profile URL or username..."
                className="pl-12 h-12 text-base bg-card border-border"
              />
            </div>
            <Button size="lg" className="h-12 px-8">
              Connect
              <ArrowRight className="w-4 h-4 ml-2" />
            </Button>
          </div>

          <p className="text-sm text-muted-foreground mt-4">
            Or{" "}
            <button className="text-foreground underline underline-offset-4 hover:text-accent">
              import a game list manually
            </button>
          </p>
        </div>
      </section>

      {/* Platform Selection */}
      <section className="px-6 py-12 lg:px-16 border-y border-border bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <p className="text-sm text-muted-foreground mb-4">Supported Platforms</p>
          <div className="flex flex-wrap gap-3">
            {platforms.map((platform) => (
              <button
                key={platform}
                onClick={() => togglePlatform(platform)}
                className={`flex items-center gap-2 px-5 py-2.5 rounded-full border text-sm font-medium transition-all ${
                  selectedPlatforms.includes(platform)
                    ? "bg-primary text-primary-foreground border-primary"
                    : "bg-card border-border hover:border-foreground/20"
                }`}
              >
                {selectedPlatforms.includes(platform) && <Check className="w-4 h-4" />}
                {platform}
              </button>
            ))}
          </div>
        </div>
      </section>

      {/* How It Works */}
      <section className="px-6 py-20 lg:px-16 max-w-7xl mx-auto">
        <div className="mb-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">How It Works</h2>
          <p className="text-muted-foreground max-w-lg">
            Three simple steps to find your next multiplayer adventure
          </p>
        </div>
        <div className="grid md:grid-cols-3 gap-8 lg:gap-12">
          {steps.map((step, i) => (
            <div key={i} className="relative">
              <span className="text-6xl font-bold text-muted/50">{step.number}</span>
              <h3 className="text-xl font-semibold mt-4 mb-2">{step.title}</h3>
              <p className="text-muted-foreground">{step.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* Game Matching Preview */}
      <section className="px-6 py-20 lg:px-16 bg-muted/30">
        <div className="max-w-7xl mx-auto">
          <div className="flex flex-col lg:flex-row items-start gap-12">
            <div className="lg:w-1/3">
              <h2 className="text-3xl md:text-4xl font-bold mb-4">
                See What Everyone Can Play
              </h2>
              <p className="text-muted-foreground mb-6">
                Our matching algorithm finds games across all connected libraries and shows
                you what everyone in your group owns.
              </p>
              <div className="space-y-4">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                    <Users className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">Cross-library matching</p>
                    <p className="text-sm text-muted-foreground">Steam, Epic, GOG & more</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                    <Filter className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">Smart filtering</p>
                    <p className="text-sm text-muted-foreground">By genre, players, price</p>
                  </div>
                </div>
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-full bg-accent/10 flex items-center justify-center text-accent">
                    <Zap className="w-5 h-5" />
                  </div>
                  <div>
                    <p className="font-medium">Instant results</p>
                    <p className="text-sm text-muted-foreground">No waiting, no downloads</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Preview Card */}
            <div className="lg:w-2/3 w-full">
              <div className="bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                <div className="flex items-center justify-between p-5 border-b border-border">
                  <div>
                    <h3 className="font-semibold">Matched Games</h3>
                    <p className="text-sm text-muted-foreground">4 friends in group</p>
                  </div>
                  <Button variant="outline" size="sm">
                    <Filter className="w-4 h-4 mr-2" />
                    Filter
                  </Button>
                </div>
                <div className="divide-y divide-border">
                  {matchedGames.map((game, i) => (
                    <div
                      key={i}
                      className="flex items-center justify-between p-5 hover:bg-muted/50 transition-colors cursor-pointer"
                    >
                      <div className="flex items-center gap-4">
                        <div className="w-14 h-14 rounded-xl bg-muted flex items-center justify-center text-2xl">
                          {game.image}
                        </div>
                        <div>
                          <p className="font-medium">{game.name}</p>
                          <div className="flex items-center gap-3 text-sm text-muted-foreground">
                            <span>{game.players} players</span>
                            <span>•</span>
                            <span>{game.price}</span>
                          </div>
                        </div>
                      </div>
                      <div className="flex items-center gap-4">
                        <div className="flex -space-x-2">
                          {Array.from({ length: game.match }).map((_, j) => (
                            <div
                              key={j}
                              className="w-8 h-8 rounded-full bg-accent/20 border-2 border-card flex items-center justify-center text-xs font-medium"
                            >
                              {String.fromCharCode(65 + j)}
                            </div>
                          ))}
                        </div>
                        <ChevronDown className="w-5 h-5 text-muted-foreground -rotate-90" />
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section className="px-6 py-20 lg:px-16 max-w-7xl mx-auto">
        <div className="grid md:grid-cols-2 gap-6">
          {[
            {
              icon: <Star className="w-6 h-6" />,
              title: "Ratings & Reviews",
              description:
                "See aggregated ratings from multiple sources to help you pick the best game",
            },
            {
              icon: <Gamepad2 className="w-6 h-6" />,
              title: "Platform Info",
              description:
                "Check which platforms each game is available on and cross-play support",
            },
            {
              icon: <Users className="w-6 h-6" />,
              title: "Player Count",
              description:
                "Know exactly how many players each game supports for your group size",
            },
            {
              icon: <Zap className="w-6 h-6" />,
              title: "Specs Check",
              description:
                "Verify everyone in your group can run the game before you commit",
            },
          ].map((feature, i) => (
            <div
              key={i}
              className="p-8 rounded-2xl border border-border bg-card hover:shadow-lg transition-shadow"
            >
              <div className="w-12 h-12 rounded-xl bg-muted flex items-center justify-center text-foreground mb-4">
                {feature.icon}
              </div>
              <h3 className="text-xl font-semibold mb-2">{feature.title}</h3>
              <p className="text-muted-foreground">{feature.description}</p>
            </div>
          ))}
        </div>
      </section>

      {/* CTA */}
      <section className="px-6 py-20 lg:px-16">
        <div className="max-w-4xl mx-auto text-center bg-card border border-border rounded-3xl p-12 lg:p-16">
          <h2 className="text-3xl md:text-4xl font-bold mb-4">
            Ready to find your next game night pick?
          </h2>
          <p className="text-muted-foreground mb-8 max-w-xl mx-auto">
            Join thousands of friend groups using PlayMate to discover shared games.
          </p>
          <Button size="lg" className="text-lg px-10 h-14">
            Get Started Free
            <ArrowRight className="w-5 h-5 ml-2" />
          </Button>
        </div>
      </section>

      {/* Footer */}
      <footer className="px-6 py-12 lg:px-16 border-t border-border">
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row items-center justify-between gap-4">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-primary flex items-center justify-center">
              <Gamepad2 className="w-4 h-4 text-primary-foreground" />
            </div>
            <span className="font-semibold">PlayMate</span>
          </div>
          <p className="text-sm text-muted-foreground">
            Built for UI/UX Course • 2026
          </p>
        </div>
      </footer>
    </div>
  )
}
