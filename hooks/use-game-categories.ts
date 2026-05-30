"use client"

import { useEffect, useRef, useState } from "react"
import { fetchGameCategories } from "@/lib/api"
import type { GameCard } from "@/types"

export function useGameCategories(filteredGames: GameCard[]) {
  const [categoriesByApp, setCategoriesByApp] = useState<Record<number, string[]>>({})
  const [isLoadingCategories, setIsLoadingCategories] = useState(false)
  const [categoryFilterError, setCategoryFilterError] = useState<string | null>(null)
  const pendingCategoryAppIdsRef = useRef<Set<number>>(new Set())

  useEffect(() => {
    if (filteredGames.length === 0) {
      return
    }

    const missingAppIds = Array.from(
      new Set(
        filteredGames
          .map((game) => game.appId)
          .filter((appId) => !(appId in categoriesByApp) && !pendingCategoryAppIdsRef.current.has(appId)),
      ),
    ).slice(0, 80)

    if (missingAppIds.length === 0) {
      return
    }

    let isCancelled = false

    missingAppIds.forEach((appId) => {
      pendingCategoryAppIdsRef.current.add(appId)
    })

    const loadCategories = async () => {
      setIsLoadingCategories(true)
      setCategoryFilterError(null)

      try {
        const payload = await fetchGameCategories(missingAppIds)
        const incoming = payload.categoriesByApp ?? {}

        if (!isCancelled) {
          setCategoriesByApp((prev) => {
            const next = { ...prev }
            Object.entries(incoming).forEach(([appId, categories]) => {
              next[Number(appId)] = categories
            })
            return next
          })
        }
      } catch (error) {
        if (!isCancelled) {
          setCategoryFilterError(
            error instanceof Error ? error.message : "Failed to load categories",
          )
        }
      } finally {
        missingAppIds.forEach((appId) => {
          pendingCategoryAppIdsRef.current.delete(appId)
        })

        if (!isCancelled) {
          setIsLoadingCategories(false)
        }
      }
    }

    void loadCategories()

    return () => {
      isCancelled = true
    }
  }, [filteredGames, categoriesByApp])

  return {
    categoriesByApp,
    isLoadingCategories,
    categoryFilterError,
  }
}
