"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchSteamGameDetails } from "@/lib/api"

// Where this data is displayed is a later (UIUX phase) decision — this hook
// just makes it available via TanStack Query, mirroring use-epic-game-details.ts.
export function useSteamGameDetails(steamId: string | null) {
  return useQuery({
    queryKey: ["steam-game-details", steamId],
    queryFn: () => fetchSteamGameDetails(steamId!),
    enabled: Boolean(steamId),
    staleTime: 24 * 60 * 60 * 1000,
  })
}
