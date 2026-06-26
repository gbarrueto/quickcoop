"use client"

import { useQuery } from "@tanstack/react-query"
import type { EpicGameDetails } from "@/types"

type EpicGameDetailsResponse = {
  success: boolean
  accountId: string
  gamesCount: number
  games: EpicGameDetails[]
}

async function fetchEpicGameDetails(): Promise<EpicGameDetailsResponse> {
  const response = await fetch("/api/epic/game-details")

  if (!response.ok) {
    const data = await response.json().catch(() => null)
    throw new Error(data?.error ?? "Failed to load Epic game details")
  }

  return response.json()
}

// Where this data is displayed is a later (UIUX phase) decision — this hook
// just makes it available via TanStack Query, per the project's data-fetching
// convention (see docs/anonymous-first-flow-plan.md, project-epic-game-details memory).
export function useEpicGameDetails(epicAccountId: string | null) {
  return useQuery({
    queryKey: ["epic-game-details", epicAccountId],
    queryFn: fetchEpicGameDetails,
    enabled: Boolean(epicAccountId),
    staleTime: 24 * 60 * 60 * 1000,
  })
}
