import type { TrendingGame } from "@/types"

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
