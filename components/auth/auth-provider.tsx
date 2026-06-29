"use client"

import { createContext, useCallback, useContext, useEffect, useMemo, useState } from "react"
import { useRouter } from "next/navigation"
import { api } from "@/lib/api"
import { clearTokens, getRefreshToken, setTokens } from "@/lib/token-storage"
import type { User } from "@/lib/types"

type AuthContextValue = {
  user: User | null
  isLoading: boolean
  login: (username: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refreshUser: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const [user, setUser] = useState<User | null>(null)
  const [isLoading, setIsLoading] = useState(true)

  const refreshUser = useCallback(async () => {
    try {
      const currentUser = await api.me()
      setUser(currentUser)
    } catch {
      clearTokens()
      setUser(null)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      refreshUser().finally(() => setIsLoading(false))
    })
  }, [refreshUser])

  const login = useCallback(
    async (username: string, password: string) => {
      const result = await api.login(username, password)
      setTokens(result.access, result.refresh)
      setUser(result.user)
      router.replace("/dashboard")
    },
    [router],
  )

  const logout = useCallback(async () => {
    const refresh = getRefreshToken()
    try {
      if (refresh) await api.logout(refresh)
    } finally {
      clearTokens()
      setUser(null)
      router.replace("/login")
    }
  }, [router])

  const value = useMemo(
    () => ({ user, isLoading, login, logout, refreshUser }),
    [isLoading, login, logout, refreshUser, user],
  )

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>
}

export function useAuth() {
  const value = useContext(AuthContext)
  if (!value) throw new Error("useAuth must be used inside AuthProvider")
  return value
}
