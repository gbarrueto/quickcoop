import type { Platform } from "./platform"

export type GameCard = {
  appId: number
  name: string
  imageUrl: string
  rating: number
  players: string
  platform: Platform
  tags?: string[]
  playtimeMinutes?: number
}

export type RecommendedGame = {
  appId: number
  name: string
  imageUrl: string
  categories: [string, string]
  rating: number
  description: string
  price: string
}

export type TrendingGame = {
  name: string
  category: string
  playersNow: string
  trendLabel: string
  stores: string[]
  imageUrl?: string
}

export type ImportGame = {
  title: string
  imageUrl?: string
}

export type SteamOwnedGame = {
  appid: number
  name?: string
  playtime_forever?: number
}

export type EpicGame = {
  id: string
  title: string
  keyImages?: { type: string; url: string }[]
}

export type GamePassGame = {
  id: string
  title: string
  imageUrl: string
}
