'use client'

import { createContext, useContext, useEffect, useState } from 'react'
import { Button } from '@/components/ui/8bit/button'
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/8bit/select'
import { FaMoon } from "react-icons/fa"
import { FaRegSun } from "react-icons/fa6"
import { themes } from '@/lib/themes'

type ColorMode = 'light' | 'dark'

interface ThemeContextValue {
  themeSlug: string
  colorMode: ColorMode
  mounted: boolean
  setThemeSlug: (slug: string) => void
  setColorMode: (mode: ColorMode) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  themeSlug: 'default',
  colorMode: 'dark',
  mounted: false,
  setThemeSlug: () => {},
  setColorMode: () => {},
})

const THEME_STORAGE_KEY = 'bag-of-color-theme'
const MODE_STORAGE_KEY = 'bag-of-mode'
const OLD_THEME_KEY = 'bag-of-theme'

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [themeSlug, setThemeSlugState] = useState<string>('default')
  const [colorMode, setColorModeState] = useState<ColorMode>('dark')
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    // Migrate from old 'bag-of-theme' key (values were 'dark'/'light')
    const oldTheme = localStorage.getItem(OLD_THEME_KEY)
    if (oldTheme === 'dark' || oldTheme === 'light') {
      // Migrate: write new keys, remove old key
      const migratedSlug = oldTheme === 'dark' ? 'default' : 'soft-pop'
      localStorage.setItem(THEME_STORAGE_KEY, migratedSlug)
      localStorage.setItem(MODE_STORAGE_KEY, oldTheme)
      localStorage.removeItem(OLD_THEME_KEY)
    }

    const storedTheme = localStorage.getItem(THEME_STORAGE_KEY)
    const storedMode = localStorage.getItem(MODE_STORAGE_KEY)
    const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches

    if (storedTheme) {
      setThemeSlugState(storedTheme)
    } else {
      setThemeSlugState(prefersDark ? 'default' : 'soft-pop')
    }

    if (storedMode === 'light' || storedMode === 'dark') {
      setColorModeState(storedMode)
    } else {
      setColorModeState(prefersDark ? 'dark' : 'light')
    }
  }, [])

  useEffect(() => {
    if (!mounted) return
    const root = document.documentElement
    root.classList.toggle('dark', colorMode === 'dark')
    if (themeSlug !== 'default') {
      root.setAttribute('data-theme', themeSlug)
    } else {
      root.removeAttribute('data-theme')
    }
  }, [themeSlug, colorMode, mounted])

  const setThemeSlug = (slug: string) => {
    setThemeSlugState(slug)
    localStorage.setItem(THEME_STORAGE_KEY, slug)
    // Auto-set color mode based on theme preference
    if (slug === 'soft-pop') {
      setColorModeState('light')
      localStorage.setItem(MODE_STORAGE_KEY, 'light')
    } else if (slug === 'default') {
      setColorModeState('dark')
      localStorage.setItem(MODE_STORAGE_KEY, 'dark')
    }
  }

  const setColorMode = (mode: ColorMode) => {
    setColorModeState(mode)
    localStorage.setItem(MODE_STORAGE_KEY, mode)
  }

  return (
    <ThemeContext.Provider value={{ themeSlug, colorMode, mounted, setThemeSlug, setColorMode }}>
      {children}
    </ThemeContext.Provider>
  )
}

export function useTheme() {
  return useContext(ThemeContext)
}

export function ThemeToggle() {
  const { colorMode, mounted, setColorMode } = useTheme()
  const isDark = colorMode === 'dark'

  return (
    <Button
      id="theme-toggle-btn"
      variant="outline"
      size="sm"
      onClick={() => setColorMode(isDark ? 'light' : 'dark')}
      title={isDark ? 'Switch to light mode' : 'Switch to dark mode'}
      className="h-9 w-9 p-0"
    >
      {mounted ? (isDark ? <FaMoon /> : <FaRegSun />) : <FaRegSun />}
    </Button>
  )
}

export function ThemeSelect() {
  const { themeSlug, mounted, setThemeSlug } = useTheme()

  if (!mounted) {
    return (
      <div className="h-9 w-[140px] border-2 border-black dark:border-white bg-background [box-shadow:2px_2px_0px_0px_rgba(0,0,0,1)] dark:[box-shadow:2px_2px_0px_0px_rgba(255,255,255,1)]" />
    )
  }

  const currentTheme = themes.find(t => t.slug === themeSlug) ?? themes[0]

  return (
    <Select value={themeSlug} onValueChange={setThemeSlug}>
      <SelectTrigger className="w-[140px] h-9">
        <SelectValue>
          <span className="flex items-center gap-1.5">
            <span>{currentTheme.emoji}</span>
            <span>{currentTheme.label}</span>
          </span>
        </SelectValue>
      </SelectTrigger>
      <SelectContent>
        {themes.map((theme) => (
          <SelectItem key={theme.slug} value={theme.slug}>
            <span className="flex items-center gap-1.5">
              <span>{theme.emoji}</span>
              <span>{theme.label}</span>
            </span>
          </SelectItem>
        ))}
      </SelectContent>
    </Select>
  )
}
