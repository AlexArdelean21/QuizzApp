"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { LogOut, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ThemeToggler } from "@/components/ThemeToggler"
import { useTrackActivity } from "@/hooks/use-track-activity"

export function GlobalHeader() {
  useTrackActivity()
  const pathname = usePathname()
  const [showExit, setShowExit] = useState(false)
  const [isAdmin, setIsAdmin] = useState(false)
  const isLoginRoute = pathname.startsWith("/login")
  const isAdminRoute = pathname === "/admin" || pathname.startsWith("/admin/")

  useEffect(() => {
    const resolveAdminRole = async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const {
          data: { user },
        } = await supabase.auth.getUser()

        if (!user) {
          setIsAdmin(false)
          return
        }

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
    const handleQuizActive = (event: Event) => {
      const customEvent = event as CustomEvent<boolean>
      setShowExit(Boolean(customEvent.detail))
    }

    window.addEventListener("quiz-active-change", handleQuizActive as EventListener)
    return () => {
      window.removeEventListener("quiz-active-change", handleQuizActive as EventListener)
    }
  }, [])

  const handleLogout = async () => {
    const supabase = getSupabaseBrowserClient()
    await supabase.auth.signOut()
    window.location.href = "/login"
  }

  const handleRequestExit = () => {
    window.dispatchEvent(new CustomEvent("quiz-exit-request"))
  }

  if (isLoginRoute) {
    return null
  }

  return (
    <header className="sticky top-0 z-[60] w-full bg-background/85 backdrop-blur-md">
      <div className="mx-auto grid h-20 w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 lg:px-8">
        <div className="justify-self-start">
          {showExit && pathname === "/" && (
            <button
              type="button"
              onClick={handleRequestExit}
              className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
            >
              <X className="size-3.5" />
              Ieșire
            </button>
          )}
        </div>

        <Link
          href="/"
          className="justify-self-center truncate px-2 bg-gradient-to-r from-primary via-sky-400 to-blue-500 bg-clip-text text-4xl font-extrabold leading-none text-transparent"
        >
          QuizHub
        </Link>

        <div className="justify-self-end inline-flex items-center gap-2">
          <ThemeToggler />

          {isAdmin && (
            <Link
              href={isAdminRoute ? "/" : "/admin"}
              className="inline-flex items-center gap-1 rounded-md border border-primary/40 bg-primary/10 px-2 py-1 text-xs font-medium text-primary transition hover:bg-primary/20"
            >
              {isAdminRoute ? "Go to QuizHub" : "Go to Admin Dashboard"}
            </Link>
          )}

          <button
            type="button"
            onClick={handleLogout}
            className="inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
          >
            <LogOut className="size-3.5" />
            Logout
          </button>
        </div>
      </div>
    </header>
  )
}
