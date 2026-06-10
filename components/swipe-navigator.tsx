"use client"

import { useEffect, useRef, useState, type ReactNode } from "react"
import { usePathname, useRouter } from "next/navigation"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { isAdminRole, isSuperAdminRole, normalizeRole } from "@/lib/auth/roles"

type Role = "guest" | "user" | "org_admin" | "super_admin"

type TabEntry = {
  href: string | null
  kind: "route" | "profile"
  // When matching pathname, must equal exactly (not just startsWith).
  exact?: boolean
}

function getContext(pathname: string): "admin" | "user" {
  if (pathname.startsWith("/admin") || pathname.startsWith("/dashboard/admin")) {
    return "admin"
  }
  return "user"
}

function getTabsForContext(role: Role, ctx: "admin" | "user"): TabEntry[] {
  if (ctx === "admin") {
    if (role === "super_admin") {
      return [
        { href: "/admin", kind: "route", exact: true },
        { href: "/dashboard/admin/elevi", kind: "route" },
        { href: "/admin/global", kind: "route" },
        { href: "/", kind: "route", exact: true },
      ]
    }
    if (role === "org_admin") {
      return [
        { href: "/admin", kind: "route", exact: true },
        { href: "/dashboard/admin/elevi", kind: "route" },
        { href: "/dashboard/admin/invite", kind: "route" },
        { href: "/", kind: "route", exact: true },
      ]
    }
    return []
  }

  // User-side context — admins get an extra "Admin" tab between Statistici and Profil
  if (role === "guest") return []
  if (role === "super_admin" || role === "org_admin") {
    return [
      { href: "/", kind: "route", exact: true },
      { href: "/dashboard/statistici", kind: "route" },
      { href: "/admin", kind: "route", exact: true },
      { href: null, kind: "profile" },
    ]
  }
  return [
    { href: "/", kind: "route", exact: true },
    { href: "/dashboard/statistici", kind: "route" },
    { href: null, kind: "profile" },
  ]
}

function findActiveTabIndex(tabs: TabEntry[], pathname: string): number {
  return tabs.findIndex((tab) => {
    if (tab.kind !== "route" || !tab.href) return false
    if (tab.exact) return pathname === tab.href
    return pathname === tab.href || pathname.startsWith(tab.href + "/")
  })
}

type Props = { children: ReactNode }

export function SwipeNavigator({ children }: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const [role, setRole] = useState<Role>("guest")
  const [quizActive, setQuizActive] = useState(false)
  const layerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    let cancelled = false
    const resolve = async () => {
      try {
        const supabase = getSupabaseBrowserClient()
        const { data: { user } } = await supabase.auth.getUser()
        if (!user) {
          if (!cancelled) setRole("guest")
          return
        }
        const { data: profile } = await supabase
          .from("profiles")
          .select("role")
          .eq("id", user.id)
          .maybeSingle()
        if (cancelled) return
        const normalized = normalizeRole(profile?.role)
        if (isSuperAdminRole(normalized)) setRole("super_admin")
        else if (isAdminRole(normalized)) setRole("org_admin")
        else setRole("user")
      } catch {
        if (!cancelled) setRole("guest")
      }
    }
    void resolve()
    return () => { cancelled = true }
  }, [])

  useEffect(() => {
    const onChange = (event: Event) => {
      const ev = event as CustomEvent<boolean>
      setQuizActive(Boolean(ev.detail))
    }
    window.addEventListener("quiz-active-change", onChange as EventListener)
    return () => window.removeEventListener("quiz-active-change", onChange as EventListener)
  }, [])

  const startXRef = useRef<number | null>(null)
  const startYRef = useRef<number | null>(null)
  const startTimeRef = useRef<number>(0)
  const directionLockedRef = useRef<"horizontal" | "vertical" | null>(null)
  const currentDxRef = useRef<number>(0)
  const widthRef = useRef<number>(0)
  const lastEmittedHrefRef = useRef<string | null>(null)

  useEffect(() => {
    const ctx = getContext(pathname)
    const tabs = getTabsForContext(role, ctx)
    const activeIdx = findActiveTabIndex(tabs, pathname)

    if (role === "guest" || quizActive || activeIdx === -1 || tabs.length === 0) return
    if (typeof window === "undefined") return

    const mql = window.matchMedia("(min-width: 768px)")
    if (mql.matches) return

    const layer = layerRef.current
    if (!layer) return

    widthRef.current = window.innerWidth

    const emitProgress = (destinationHref: string | null) => {
      if (lastEmittedHrefRef.current === destinationHref) return
      lastEmittedHrefRef.current = destinationHref
      window.dispatchEvent(
        new CustomEvent("swipe-drag-progress", { detail: { destinationHref } })
      )
    }

    const clearProgress = () => {
      if (lastEmittedHrefRef.current !== null) {
        lastEmittedHrefRef.current = null
        window.dispatchEvent(
          new CustomEvent("swipe-drag-progress", { detail: { destinationHref: null } })
        )
      }
    }

    const resetTransform = () => {
      layer.style.transition = "transform 220ms ease-out"
      layer.style.transform = "translate3d(0, 0, 0)"
      window.setTimeout(() => {
        if (layer) layer.style.transition = ""
      }, 240)
    }

    const onTouchStart = (e: TouchEvent) => {
      const touch = e.touches[0]
      if (!touch) return
      const target = touch.target as HTMLElement | null
      if (target?.closest?.("[data-swipe-ignore], input[type='range'], .embla, [role='dialog'], [data-radix-dialog-content], button, a")) {
        // Skip swipe if user is touching an interactive element or marked region.
        // Links and buttons are critical — tap shouldn't be intercepted.
        return
      }

      startXRef.current = touch.clientX
      startYRef.current = touch.clientY
      startTimeRef.current = Date.now()
      directionLockedRef.current = null
      currentDxRef.current = 0
      widthRef.current = window.innerWidth
      layer.style.transition = ""
    }

    const onTouchMove = (e: TouchEvent) => {
      if (startXRef.current === null || startYRef.current === null) return
      const touch = e.touches[0]
      if (!touch) return

      const dx = touch.clientX - startXRef.current
      const dy = touch.clientY - startYRef.current

      if (directionLockedRef.current === null) {
        if (Math.abs(dx) < 10 && Math.abs(dy) < 10) return
        directionLockedRef.current = Math.abs(dx) > Math.abs(dy) ? "horizontal" : "vertical"
      }

      if (directionLockedRef.current === "vertical") return

      let clampedDx = dx
      if (activeIdx === 0 && dx > 0) clampedDx = dx * 0.3
      if (activeIdx === tabs.length - 1 && dx < 0) clampedDx = dx * 0.3

      currentDxRef.current = clampedDx
      layer.style.transform = `translate3d(${clampedDx}px, 0, 0)`

      // Emit destination progress for visual indicator
      const width = widthRef.current || window.innerWidth
      const halfThreshold = width * 0.25  // start hinting at 25% drag
      if (Math.abs(clampedDx) >= halfThreshold) {
        if (clampedDx < 0 && activeIdx < tabs.length - 1) {
          const next = tabs[activeIdx + 1]
          emitProgress(next.kind === "profile" ? "__profile__" : next.href)
        } else if (clampedDx > 0 && activeIdx > 0) {
          const prev = tabs[activeIdx - 1]
          emitProgress(prev.kind === "profile" ? "__profile__" : prev.href)
        }
      } else {
        clearProgress()
      }

      if (e.cancelable) e.preventDefault()
    }

    const onTouchEnd = () => {
      if (startXRef.current === null || directionLockedRef.current !== "horizontal") {
        startXRef.current = null
        startYRef.current = null
        directionLockedRef.current = null
        clearProgress()
        return
      }

      const dx = currentDxRef.current
      const elapsed = Date.now() - startTimeRef.current
      const velocity = Math.abs(dx) / Math.max(elapsed, 1)
      const width = widthRef.current || window.innerWidth

      const passedThreshold = Math.abs(dx) > width * 0.5
      const isFling = velocity > 0.5 && Math.abs(dx) > 50

      let targetIdx = activeIdx
      if (passedThreshold || isFling) {
        if (dx < 0 && activeIdx < tabs.length - 1) targetIdx = activeIdx + 1
        else if (dx > 0 && activeIdx > 0) targetIdx = activeIdx - 1
      }

      startXRef.current = null
      startYRef.current = null
      directionLockedRef.current = null
      currentDxRef.current = 0
      clearProgress()

      if (targetIdx === activeIdx) {
        resetTransform()
        return
      }

      const target = tabs[targetIdx]
      resetTransform()

      if (target.kind === "profile") {
        window.dispatchEvent(new CustomEvent("open-profile-sheet"))
      } else if (target.href) {
        router.push(target.href)
      }
    }

    layer.addEventListener("touchstart", onTouchStart, { passive: true })
    layer.addEventListener("touchmove", onTouchMove, { passive: false })
    layer.addEventListener("touchend", onTouchEnd, { passive: true })
    layer.addEventListener("touchcancel", onTouchEnd, { passive: true })

    if (activeIdx > 0) {
      const prev = tabs[activeIdx - 1]
      if (prev.href) router.prefetch(prev.href)
    }
    if (activeIdx < tabs.length - 1) {
      const next = tabs[activeIdx + 1]
      if (next.href) router.prefetch(next.href)
    }

    return () => {
      layer.removeEventListener("touchstart", onTouchStart)
      layer.removeEventListener("touchmove", onTouchMove)
      layer.removeEventListener("touchend", onTouchEnd)
      layer.removeEventListener("touchcancel", onTouchEnd)
    }
  }, [role, pathname, quizActive, router])

  return (
    <div ref={layerRef} style={{ touchAction: "pan-y", willChange: "transform" }}>
      {children}
    </div>
  )
}
