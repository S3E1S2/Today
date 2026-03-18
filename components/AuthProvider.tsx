'use client'
import { createContext, useCallback, useContext, useEffect, useRef, useState } from 'react'
import { supabase } from '@/lib/supabase'
import { applyThemeVars } from '@/components/ThemeProvider'
import type { ThemeId } from '@/components/ThemeProvider'
import type { User } from '@supabase/supabase-js'

const VALID_THEMES = new Set(['default', 'midnight', 'forest', 'rose', 'mono', 'custom'])

const DATA_CLEAR_KEEP = new Set([
  'today-language', 'today-theme', 'today-theme-custom',
  'today-week-start', 'today-sleep-goal-v1', 'today-sections-visible',
])

interface AuthCtx {
  user:           User | null
  displayName:    string | null
  setDisplayName: (name: string | null) => void
  emoji:          string | null
  setEmoji:       (emoji: string | null) => void
  refreshProfile: () => void
}

const AuthContext = createContext<AuthCtx>({
  user: null, displayName: null, setDisplayName: () => {},
  emoji: null, setEmoji: () => {}, refreshProfile: () => {},
})

export function AuthProvider({ children }: { children: React.ReactNode }) {
  const [user,        setUser]        = useState<User | null>(null)
  const [displayName, setDisplayName] = useState<string | null>(null)
  const [emoji,       setEmoji]       = useState<string | null>(null)

  // Track which userId has already been fetched — prevents duplicate calls from
  // getSession() + INITIAL_SESSION both firing on the same page load.
  const fetchedRef = useRef<string | null>(null)

  const fetchDisplayName = useCallback(async (userId: string, force = false) => {
    if (!force && fetchedRef.current === userId) return
    fetchedRef.current = userId

    const { data: fullData, error: fullError } = await supabase
      .from('profiles')
      .select('display_name, language, theme, emoji, section_visibility, week_start')
      .eq('id', userId)
      .single()

    // If the query failed (likely a missing column causing 400), fall back to minimal select
    let data = fullError ? null : fullData
    if (fullError && fullError.code !== 'PGRST116') {
      const { data: fallback } = await supabase
        .from('profiles')
        .select('display_name, language, theme, emoji')
        .eq('id', userId)
        .single()
      data = fallback
    }

    // Update name + emoji only when the DB actually has values
    if (data?.display_name !== undefined) setDisplayName(data.display_name ?? null)
    if (data?.emoji !== undefined)        setEmoji(data.emoji ?? null)

    // Restore custom colors — separate query so a missing column doesn't break the main fetch
    try {
      const { data: colorsData } = await supabase
        .from('profiles')
        .select('custom_colors')
        .eq('id', userId)
        .single()
      if (colorsData?.custom_colors) {
        localStorage.setItem('today-theme-custom', colorsData.custom_colors)
      }
    } catch {}

    // Theme priority: DB value → localStorage fallback → 'default'
    let themeId: ThemeId = 'default'
    if (data?.theme && VALID_THEMES.has(data.theme)) {
      themeId = data.theme as ThemeId
    } else {
      try {
        const local = localStorage.getItem('today-theme')
        if (local && VALID_THEMES.has(local)) themeId = local as ThemeId
      } catch {}
    }
    try { localStorage.setItem('today-theme', themeId) } catch {}
    applyThemeVars(themeId)

    if (data?.language) {
      try { localStorage.setItem('today-language', data.language) } catch {}
    }
    if (data?.section_visibility) {
      try { localStorage.setItem('today-sections-visible', data.section_visibility) } catch {}
    }
    if (data?.week_start !== undefined && data.week_start !== null) {
      try { localStorage.setItem('today-week-start', String(data.week_start)) } catch {}
    }
    window.dispatchEvent(new CustomEvent('settings-updated'))
  }, [])

  useEffect(() => {
    // getSession() for an immediate check; ref prevents double-fetch with INITIAL_SESSION
    supabase.auth.getSession().then(({ data: { session } }) => {
      setUser(session?.user ?? null)
      if (session?.user) fetchDisplayName(session.user.id)
    })

    const { data: { subscription } } = supabase.auth.onAuthStateChange((event, session) => {
      setUser(session?.user ?? null)

      if (session?.user) {
        if (event === 'SIGNED_IN') {
          // New sign-in: clear guest/demo data, then force-fetch the profile
          try {
            Object.keys(localStorage)
              .filter(k => k.startsWith('today-') && !DATA_CLEAR_KEEP.has(k))
              .forEach(k => localStorage.removeItem(k))
          } catch {}
          fetchedRef.current = null          // reset so force-fetch goes through
          fetchDisplayName(session.user.id, true)
        } else {
          // INITIAL_SESSION, TOKEN_REFRESHED, etc. — ref deduplication prevents extra calls
          fetchDisplayName(session.user.id)
        }
      } else {
        fetchedRef.current = null
        setDisplayName(null)
        setEmoji(null)
      }
    })

    return () => subscription.unsubscribe()
  }, [fetchDisplayName])

  const refreshProfile = useCallback(() => {
    if (user) {
      fetchedRef.current = null
      fetchDisplayName(user.id, true)
    }
  }, [user, fetchDisplayName])

  return (
    <AuthContext.Provider value={{ user, displayName, setDisplayName, emoji, setEmoji, refreshProfile }}>
      {children}
    </AuthContext.Provider>
  )
}

export const useAuth = () => useContext(AuthContext)
