import { Shield, Star, Users, Zap } from "lucide-react"
import type { TrendingGame } from "@/types"

export const LANDING_FEATURES = [
  {
    icon: Users,
    title: "Game Matching",
    description: "Find games you and your friends all own instantly",
  },
  {
    icon: Star,
    title: "Smart Recommendations",
    description: "Suggestions based on your play style",
  },
  {
    icon: Zap,
    title: "Quick Hop-In",
    description: "No software to install, works in your browser",
  },
  {
    icon: Shield,
    title: "Specs & Requirements",
    description: "Check if everyone can run the game",
  },
] as const

export const LANDING_STATS = [
  { value: "50K+", label: "Games Indexed" },
  { value: "100K+", label: "Active Users" },
  { value: "1M+", label: "Matches Made" },
  { value: "4.9", label: "User Rating" },
] as const

export const FALLBACK_TRENDING_GAMES: TrendingGame[] = [
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
