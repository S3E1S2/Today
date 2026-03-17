'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import type { User } from '@supabase/supabase-js'

interface AuthCtx {
  user:             User | null
  displayName:      string | null
  setDisplayName:   (name: string | null) => void
  refreshProfile:   () => void
}

const AuthContext = createContext<AuthCtx>({
  user: null, displayName: null, setDisplayName: () => {}, refreshProfile: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,        setUser]        = useState<User | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)

  const fetchDisplayName = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('display_name')
      .eq('id', userId)
      .single()
    setDisplayName(data?.display_name ?? null)
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchDisplayName(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchDisplayName(session.user.id)
      else setDisplayName(null)
    })

    return () => subscription.unsubscribe()
  }, [fetchDisplayName])

  const refreshProfile = useCallback(() => {
    if (user) fetchDisplayName(user.id)
  }, [user, fetchDisplayName])

  return (
    <AuthContext.Provider value={{ user, displayName, setDisplayName, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
