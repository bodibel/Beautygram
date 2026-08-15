"use client"

import { createContext, useContext, useEffect, useState } from "react"

type Theme = "light" | "dark" | "system"

interface ThemeContextValue {
  theme: Theme
  resolvedTheme: "light" | "dark"
  setTheme: (theme: Theme) => void
}

const ThemeContext = createContext<ThemeContextValue>({
  theme: "light",
  resolvedTheme: "light",
  setTheme: () => {},
})

function getStoredTheme(): Theme {
  if (typeof window === "undefined") return "light"

  const stored = localStorage.getItem("glowyspot-theme")
  return stored === "light" || stored === "dark" || stored === "system" ? stored : "light"
}

function getSystemTheme(): "light" | "dark" {
  if (typeof window === "undefined") return "light"

  return window.matchMedia("(prefers-color-scheme: dark)").matches ? "dark" : "light"
}

export function ThemeProvider({ children }: { children: React.ReactNode }) {
  const [theme, setThemeState] = useState<Theme>("light")
  const [systemTheme, setSystemTheme] = useState<"light" | "dark">("light")
  const [isHydrated, setIsHydrated] = useState(false)
  const resolvedTheme = isHydrated ? (theme === "system" ? systemTheme : theme) : "light"

  useEffect(() => {
    const hydrateTheme = setTimeout(() => {
      setThemeState(getStoredTheme())
      setSystemTheme(getSystemTheme())
      setIsHydrated(true)
    }, 0)

    return () => clearTimeout(hydrateTheme)
  }, [])

  useEffect(() => {
    if (!isHydrated) return

    const root = document.documentElement

    if (resolvedTheme === "dark") {
      root.classList.add("dark")
    } else {
      root.classList.remove("dark")
    }

    if (theme !== "system") {
      localStorage.setItem("glowyspot-theme", theme)
    } else {
      localStorage.removeItem("glowyspot-theme")
    }
  }, [isHydrated, theme, resolvedTheme])

  useEffect(() => {
    if (!isHydrated || theme !== "system") return

    const mq = window.matchMedia("(prefers-color-scheme: dark)")
    const handler = (e: MediaQueryListEvent) => setSystemTheme(e.matches ? "dark" : "light")

    mq.addEventListener("change", handler)
    return () => mq.removeEventListener("change", handler)
  }, [isHydrated, theme])

  return (
    <ThemeContext.Provider value={{ theme, resolvedTheme, setTheme: setThemeState }}>
      {children}
    </ThemeContext.Provider>
  )
}

export const useTheme = () => useContext(ThemeContext)
