"use client"

import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  useState,
  type ReactNode,
} from "react"
import { cn } from "@/lib/utils"

const SIDEBAR_WIDTH_PX = 280

type SidebarContextValue = {
  sidebarOpen: boolean
  openSidebar: () => void
  closeSidebar: () => void
  setSidebarOpen: (open: boolean) => void
}

const SidebarContext = createContext<SidebarContextValue | null>(null)

export function useAppSidebar(): SidebarContextValue {
  const ctx = useContext(SidebarContext)
  if (!ctx) {
    throw new Error("useAppSidebar must be used within SidebarLayout")
  }
  return ctx
}

/**
 * Wraps header + routed pages. The nav drawer is a pure overlay on all
 * viewports — it never shifts the main content, so bg-mesh and noise-overlay
 * never repaint during animation.
 */
export function SidebarLayout({ children }: { children: ReactNode }) {
  const [sidebarOpen, setSidebarOpen] = useState(false)

  const closeSidebar = useCallback(() => setSidebarOpen(false), [])
  const openSidebar = useCallback(() => setSidebarOpen(true), [])

  const value = useMemo(
    () => ({
      sidebarOpen,
      setSidebarOpen,
      openSidebar,
      closeSidebar,
    }),
    [sidebarOpen, closeSidebar, openSidebar],
  )

  return (
    <SidebarContext.Provider value={value}>
      <div
        className="flex min-h-0 min-w-0 flex-1 flex-col"
        style={
          {
            ["--app-sidebar-width" as string]: `${SIDEBAR_WIDTH_PX}px`,
          } as React.CSSProperties
        }
      >
        {children}
      </div>
    </SidebarContext.Provider>
  )
}
