"use client"

import { useEffect, useState } from "react"
import { Moon, Sun } from "lucide-react"

type Theme = "light" | "dark"

export function ThemeToggler() {
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<Theme>("dark")

  useEffect(() => {
    const savedTheme = localStorage.getItem("theme")
    const initialTheme: Theme = savedTheme === "light" ? "light" : "dark"
    setTheme(initialTheme)
    setMounted(true)
  }, [])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem("theme", theme)
  }, [mounted, theme])

  const toggleTheme = () => {
    const nextTheme: Theme = theme === "dark" ? "light" : "dark"
    setTheme(nextTheme)
  }

  if (!mounted) {
    return (
      <button
        type="button"
        aria-label="Toggle theme"
        className="inline-flex items-center justify-center rounded-md border border-border bg-card p-1.5 text-muted-foreground transition"
      >
        <span className="size-4" aria-hidden="true" />
      </button>
    )
  }

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={theme === "dark" ? "Switch to light mode" : "Switch to dark mode"}
      className="inline-flex items-center justify-center rounded-md border border-border bg-card p-1.5 text-muted-foreground transition hover:bg-secondary hover:text-foreground"
    >
      {theme === "dark" ? (
        <Sun className="size-4" />
      ) : (
        <Moon className="size-4" />
      )}
    </button>
  )
}
