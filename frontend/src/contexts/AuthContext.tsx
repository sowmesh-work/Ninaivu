"use client"

import { createContext, useContext, useEffect, useState, useCallback } from "react"
import { supabase } from "@/lib/supabase"
import { api, type UserMe } from "@/lib/api"

interface AuthContextValue {
  user: UserMe | null
  loading: boolean
  logout: () => Promise<void>
  refresh: () => Promise<void>
}

const AuthContext = createContext<AuthContextValue | null>(null)

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user, setUser] = useState<UserMe | null>(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async (hasSession: boolean) => {
    if (!hasSession) {
      setUser(null)
      return
    }
    try {
      const me = await api.auth.me()
      setUser(me)
    } catch {
      setUser(null)
    }
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      loadUser(!!session).finally(() => setLoading(false))
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      loadUser(!!session)
    })

    return () => subscription.unsubscribe()
  }, [loadUser])

  const logout = useCallback(async () => {
    await supabase.auth.signOut()
    setUser(null)
  }, [])

  const refresh = useCallback(async () => {
    const { data: { session } } = await supabase.auth.getSession()
    await loadUser(!!session)
  }, [loadUser])

  return (
    <AuthContext.Provider value={{ user, loading, logout, refresh }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error("useAuth must be used inside AuthProvider")
  return ctx
}

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
