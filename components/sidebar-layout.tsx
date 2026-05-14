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
 * Wraps header + routed pages so that when the nav drawer opens on `md+`,
 * content shifts right instead of sitting under the fixed panel.
 * Aura layers remain `fixed` to the viewport in `layout.tsx`, so they stay
 * visually consistent when padding changes.
 *
 * On small screens the drawer is an overlay (no inset). From `md` up, the
 * main column gets left padding equal to the drawer width so header titles
 * and page content center in the *remaining* viewport, not the full screen.
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
        className={cn(
          "flex min-h-0 min-w-0 flex-1 flex-col transition-all duration-300 ease-in-out",
          // Match fixed aside width (`w-[280px]`). `pl-64` is 256px — use exact
          // width so the push aligns with the panel edge on desktop.
          sidebarOpen && "md:pl-[280px]",
        )}
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
