"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { api, type UserMe } from "@/lib/api"

interface AuthContextValue {
  user: UserMe | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null)
  const [loading, setLoading] = useState(true)

  const refresh = useCallback(async () => {
    try {
      const me = await api.auth.me()
      setUser(me)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    refresh().finally(() => setLoading(false))
  }, [refresh])

  const login = useCallback(async (email: string, password: string) => {
    const me = await api.auth.login(email, password)
    setUser(me)
  }, [])

  const logout = useCallback(async () => {
    await api.auth.logout()
    setUser(null)
  }, [])

  return (
    <AuthContext.Provider value={{ user, loading, login, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}

// Convenience helpers
export function useIsAdmin() {
  const { user } = useAuth()
  return user?.role === "admin"
}

export function useCanEdit() {
  const { user } = useAuth()
  return user?.role === "admin" || user?.role === "editor"
}

export function useCanContribute() {
  const { user } = useAuth()
  return user?.role === "admin" || user?.role === "editor" || user?.role === "contributor"
}
