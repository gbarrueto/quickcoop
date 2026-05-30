"use client"

import { useEffect, useState } from "react"
import { STORAGE_KEYS, STORAGE_TTL } from "@/lib/storage"
import type { TrendingGame } from "@/types"
import { FALLBACK_TRENDING_GAMES } from "@/components/landing/constants"

export function useTrendingGames() {
  const [games, setGames] = useState<TrendingGame[]>(FALLBACK_TRENDING_GAMES)
  const [isLoading, setIsLoading] = useState(true)
  const [loadError, setLoadError] = useState<string | null>(null)

  useEffect(() => {
    let isCancelled = false

    const readCachedTrendingGames = () => {
      try {
        const rawCache = window.localStorage.getItem(STORAGE_KEYS.trendingCache)
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
        if (age > STORAGE_TTL.trendingCacheMs) {
          return null
        }

        return parsed.games
      } catch {
        return null
      }
    }

    const saveCachedTrendingGames = (cachedGames: TrendingGame[]) => {
      try {
        window.localStorage.setItem(
          STORAGE_KEYS.trendingCache,
          JSON.stringify({
            savedAt: Date.now(),
            games: cachedGames,
          }),
        )
      } catch {
        // Ignore storage issues and keep UI functional.
      }
    }

    const loadTrendingGames = async () => {
      const cachedGames = readCachedTrendingGames()
      if (cachedGames) {
        setGames(cachedGames)
        setLoadError(null)
        setIsLoading(false)
        return
      }

      setIsLoading(true)

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
          setGames(payload.games)
          setLoadError(null)
          saveCachedTrendingGames(payload.games)
        }
      } catch {
        if (!isCancelled) {
          setGames(FALLBACK_TRENDING_GAMES)
          setLoadError("Live trend data unavailable. Showing fallback list.")
        }
      } finally {
        if (!isCancelled) {
          setIsLoading(false)
        }
      }
    }

    void loadTrendingGames()

    return () => {
      isCancelled = true
    }
  }, [])

  return { games, isLoading, loadError }
}
