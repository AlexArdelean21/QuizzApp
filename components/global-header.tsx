"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { LogOut, Menu, Moon, Sun, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { useTrackActivity } from "@/hooks/use-track-activity"

type Theme = "light" | "dark"

export function GlobalHeader() {
  useTrackActivity()
  const pathname = usePathname()
  const [showExit, setShowExit] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const [userEmail, setUserEmail] = useState("")
  const [isSidebarOpen, setIsSidebarOpen] = useState(false)
  const [mounted, setMounted] = useState(false)
  const [theme, setTheme] = useState<Theme>("dark")
  const isLoginRoute = pathname.startsWith("/login")
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/")
  const canExitQuiz = showExit && pathname === "/"

  useEffect(() => {
    const resolveAdminRole = async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setIsAdmin(false)
          setUserEmail("")
          return
        }
        setUserEmail(user.email ?? "")

        const { data: profile, error } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()

        if (error) {
          setIsAdmin(false)
          return
        }

        setIsAdmin(profile?.role === "admin")
      } catch {
        setIsAdmin(false)
      }
    }

    void resolveAdminRole()
  }, [])

  useEffect(() => {
    setMounted(true)
    const savedTheme = localStorage.getItem("theme")
    const initialTheme: Theme = savedTheme === "light" ? "light" : "dark"
    setTheme(initialTheme)
  }, [])

  useEffect(() => {
    if (!mounted) return
    document.documentElement.classList.toggle("dark", theme === "dark")
    localStorage.setItem("theme", theme)
  }, [mounted, theme])

  useEffect(() => {
    const handleQuizActive = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>
      setShowExit(Boolean(customEvent.detail))
    }

    window.addEventListener("quiz-active-change", handleQuizActive as EventListener)
    return () => {
      window.removeEventListener("quiz-active-change", handleQuizActive as EventListener)
    }
  }, [])

  useEffect(() => {
    if (!isSidebarOpen) return

    const onEscape = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setIsSidebarOpen(false)
      }
    }

    window.addEventListener("keydown", onEscape)
    return () => window.removeEventListener("keydown", onEscape)
  }, [isSidebarOpen])

  useEffect(() => {
    setIsSidebarOpen(false)
  }, [pathname])

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient()
    setIsSidebarOpen(false)
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const toggleTheme = () => {
    setTheme((prev) => (prev === "dark" ? "light" : "dark"))
  }

  const handleRequestExit = () => {
    window.dispatchEvent(new CustomEvent("quiz-exit-request"))
  }

  if (isLoginRoute) {
    return null
  }

  return (
    <>
      <header className="sticky top-0 z-30 w-full border-b border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
        <div className="mx-auto w-full max-w-5xl px-4 sm:px-6 lg:px-8">
          <div className="relative flex h-16 items-center justify-between">
            <button
              type="button"
              onClick={() => setIsSidebarOpen(true)}
              aria-label="Open navigation menu"
              className="inline-flex size-10 items-center justify-center rounded-md text-slate-700 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-white"
            >
              <Menu className="size-5" />
            </button>

            <Link
              href="/"
              className="absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 bg-gradient-to-r from-primary via-sky-400 to-blue-500 bg-clip-text px-2 text-3xl font-extrabold leading-none text-transparent sm:text-4xl"
            >
              QuizHub
            </Link>

            <button
              type="button"
              onClick={handleRequestExit}
              aria-label="Exit quiz"
              disabled={!canExitQuiz}
              className={`inline-flex size-10 items-center justify-center rounded-md transition ${
                canExitQuiz
                  ? "text-slate-700 hover:bg-slate-100 hover:text-slate-900 dark:text-slate-200 dark:hover:bg-slate-900 dark:hover:text-white"
                  : "pointer-events-none invisible"
              }`}
            >
              <X className="size-5" />
            </button>
          </div>
        </div>
      </header>

      {isSidebarOpen && (
        <button
          type="button"
          aria-label="Close sidebar backdrop"
          onClick={() => setIsSidebarOpen(false)}
          className="fixed inset-0 z-40 bg-black/60 backdrop-blur-sm"
        />
      )}

      <aside
        className={`fixed inset-y-0 left-0 z-50 flex w-[280px] flex-col border-r border-slate-200 bg-white shadow-2xl transition-transform duration-300 ease-out dark:border-slate-800 dark:bg-slate-950 ${
          isSidebarOpen ? "translate-x-0" : "-translate-x-full"
        }`}
      >
        <div className="flex items-center justify-between border-b border-slate-200 px-4 py-4 dark:border-slate-800">
          <p className="max-w-[220px] truncate text-sm text-slate-600 dark:text-slate-300">{userEmail || "No active session"}</p>
          <button
            type="button"
            onClick={() => setIsSidebarOpen(false)}
            aria-label="Close sidebar"
            className="inline-flex size-9 items-center justify-center rounded-md text-slate-500 transition hover:bg-slate-100 hover:text-slate-900 dark:text-slate-400 dark:hover:bg-slate-900 dark:hover:text-white"
          >
            <X className="size-4" />
          </button>
        </div>

        <div className="flex flex-1 flex-col px-3 py-4">
          <button
            type="button"
            onClick={toggleTheme}
            className="mb-2 flex w-full items-center justify-between rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
          >
            <span>{theme === "dark" ? "Light mode" : "Dark mode"}</span>
            {mounted && theme === "dark" ? <Sun className="size-4" /> : <Moon className="size-4" />}
          </button>

          <nav className="mt-2 flex flex-col gap-1">
            {isAdmin && !isAdminRoute && (
              <Link
                href="/admin"
                onClick={() => setIsSidebarOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Admin Dashboard
              </Link>
            )}

            {isAdmin && isAdminRoute && (
              <Link
                href="/"
                onClick={() => setIsSidebarOpen(false)}
                className="rounded-lg px-3 py-2 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
              >
                Inapoi la Quiz
              </Link>
            )}
          </nav>

          <div className="mt-auto border-t border-slate-200 pt-4 dark:border-slate-800">
            <button
              type="button"
              onClick={handleLogout}
              className="flex w-full items-center gap-2 rounded-lg px-3 py-3 text-sm font-medium text-slate-700 transition hover:bg-slate-100 dark:text-slate-200 dark:hover:bg-slate-900"
            >
              <LogOut className="size-4" />
              Logout
            </button>
          </div>
        </div>
      </aside>
    </>
  )
}
