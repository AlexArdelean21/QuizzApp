"use client"

import Link from "next/link"
import { useEffect, useState } from "react"
import { LogOut, X } from "lucide-react"
import { usePathname } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export function GlobalHeader() {
  const pathname = usePathname()
  const [showExit, setShowExit] = useState(false)
  const isLoginRoute = pathname.startsWith("/login")

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
      <div className="mx-auto grid h-14 w-full max-w-5xl grid-cols-[1fr_auto_1fr] items-center px-4 sm:px-6 lg:px-8">
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
          className="justify-self-center truncate px-2 text-sm font-semibold tracking-wide text-foreground md:text-base"
        >
          QuizzApp
        </Link>

        <button
          type="button"
          onClick={handleLogout}
          className="justify-self-end inline-flex items-center gap-1 rounded-md px-2 py-1 text-xs font-medium text-muted-foreground transition hover:bg-secondary hover:text-foreground"
        >
          <LogOut className="size-3.5" />
          Logout
        </button>
      </div>
    </header>
  )
}
