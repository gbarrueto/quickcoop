"use client"

import { useQuery } from "@tanstack/react-query"
import { createClient } from "@/utils/supabase/client"

export function useUserProfile(userId: string | undefined) {
  return useQuery({
    queryKey: ["user-profile", userId],
    queryFn: async () => {
      const supabase = createClient()
      const { data, error } = await supabase
        .from("users")
        .select("username")
        .eq("id", userId!)
        .single()

      if (error) throw error
      return data
    },
    enabled: !!userId,
  })
}
