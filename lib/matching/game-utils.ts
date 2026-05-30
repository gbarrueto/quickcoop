import type { GameCard, Platform, SteamOwnedGame } from "@/types"

export function normalizeGameName(value: string): string {
  return value.toLowerCase().replace(/[^a-z0-9]+/g, " ").trim().replace(/\s+/g, " ")
}

export function gameMatchKey(game: Pick<GameCard, "name">): string {
  return normalizeGameName(game.name)
}

export function hashIdFromString(value: string): number {
  return Math.abs(value.split("").reduce((acc, char) => acc * 31 + char.charCodeAt(0), 0)) % 9999999
}

function stableNumberFromId(id: number): number {
  const seed = String(id)
  let hash = 0
  for (let i = 0; i < seed.length; i += 1) {
    hash = (hash * 31 + seed.charCodeAt(i)) % 100000
  }
  return hash
}

export function deriveRating(appId: number): number {
  const base = 32 + (stableNumberFromId(appId) % 18)
  return Number((base / 10).toFixed(1))
}

export function derivePlayers(appId: number): string {
  const ranges = ["1-2", "1-4", "2-6", "2-8", "1-10", "1-16"]
  return ranges[stableNumberFromId(appId) % ranges.length]
}

export function toGameCards(games: SteamOwnedGame[], platform: Platform = "steam"): GameCard[] {
  return games.map((game) => ({
    appId: game.appid,
    name: game.name ?? `Steam App ${game.appid}`,
    imageUrl: `https://cdn.akamai.steamstatic.com/steam/apps/${game.appid}/header.jpg`,
    rating: deriveRating(game.appid),
    players: derivePlayers(game.appid),
    platform,
  }))
}

export function toImportedGameCard(name: string): GameCard {
  return {
    appId: hashIdFromString(name.toLowerCase().trim()),
    name,
    imageUrl: "",
    rating: 0,
    players: "??",
    platform: "import",
  }
}

export function dedupeGameCards(games: GameCard[]): GameCard[] {
  const seen = new Set<string>()
  return games.filter((game) => {
    const key = `${game.platform}-${game.appId}`
    if (seen.has(key)) {
      return false
    }
    seen.add(key)
    return true
  })
}
