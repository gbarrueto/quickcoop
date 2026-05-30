"use client"

import { useEffect, useState } from "react"
import {
  ensureMockUsers,
  getCurrentMockUser,
  logoutMockUser,
  type MockUser,
} from "@/lib/mock-auth"

export function useMockAuthSession() {
  const [currentUser, setCurrentUser] = useState<MockUser | null>(null)

  useEffect(() => {
    ensureMockUsers()
    setCurrentUser(getCurrentMockUser())
  }, [])

  const logout = () => {
    logoutMockUser()
    setCurrentUser(null)
  }

  return { currentUser, setCurrentUser, logout }
}
