"use client"

import { useQuery } from "@tanstack/react-query"
import { fetchCatalogCandidates } from "@/lib/api/catalog"

// Real candidates for "similar" recommendations, sourced from the BDD
// catalog. Falls back to the static RECOMMENDED_GAMES pool in
// recommendation-utils.ts when the catalog has nothing relevant yet.
export function useCatalogRecommendations(tags: string[]) {
  return useQuery({
    queryKey: ["catalog-recommendations", tags],
    queryFn: () => fetchCatalogCandidates(tags),
    enabled: tags.length > 0,
    staleTime: 60 * 60 * 1000,
  })
}
