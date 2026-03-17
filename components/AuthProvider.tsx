'use client'
import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { applyThemeVars } from '@/components/ThemeProvider'
import type { ThemeId } from '@/components/ThemeProvider'
import type { User } from '@supabase/supabase-js'

const VALID_THEMES = new Set(['default', 'midnight', 'forest', 'rose', 'mono'])

interface AuthCtx {
  user:             User | null
  displayName:      string | null
  setDisplayName:   (name: string | null) => void
  emoji:            string | null
  setEmoji:         (emoji: string | null) => void
  refreshProfile:   () => void
}

const AuthContext = createContext<AuthCtx>({
  user: null, displayName: null, setDisplayName: () => {}, emoji: null, setEmoji: () => {}, refreshProfile: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,        setUser]        = useState<User | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [emoji,       setEmoji]       = useState<string | null>(null)

  const fetchDisplayName = useCallback(async (userId: string) => {
    const { data } = await supabase
      .from('profiles')
      .select('display_name, language, theme, emoji')
      .eq('id', userId)
      .single()
    setDisplayName(data?.display_name ?? null)
    setEmoji(data?.emoji ?? null)
    // Always apply theme on login — saved preference or default for new accounts
    const themeId = (data?.theme && VALID_THEMES.has(data.theme) ? data.theme : 'default') as ThemeId
    try { localStorage.setItem('today-theme', themeId); } catch {}
    applyThemeVars(themeId)
    if (data?.language) {
      try { localStorage.setItem('today-language', data.language); } catch {}
    }
    window.dispatchEvent(new CustomEvent('settings-updated'))
  }, [])

  useEffect(() => {
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchDisplayName(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((_event, session) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchDisplayName(session.user.id)
      else { setDisplayName(null); setEmoji(null); }
    })

    return () => subscription.unsubscribe()
  }, [fetchDisplayName])

  const refreshProfile = useCallback(() => {
    if (user) fetchDisplayName(user.id)
  }, [user, fetchDisplayName])

  return (
    <AuthContext.Provider value={{ user, displayName, setDisplayName, emoji, setEmoji, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
