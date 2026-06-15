"use client"

import { useEffect, useState, type ReactNode } from "react"
import { createPortal } from "react-dom"

type ModalPortalProps = {
  children: ReactNode
}

/**
 * Renders children into document.body via a portal.
 *
 * Why: SwipeNavigator wraps page content and applies a CSS transform during
 * touch gestures. A transformed ancestor becomes the containing block for
 * position:fixed descendants, which breaks `fixed inset-0` modals (they anchor
 * to the scrollable wrapper instead of the viewport). Portaling to body moves
 * the modal out of that subtree so `fixed inset-0` covers the real viewport.
 */
export function ModalPortal({ children }: ModalPortalProps) {
  const [mounted, setMounted] = useState(false)

  useEffect(() => {
    setMounted(true)
    return () => setMounted(false)
  }, [])

  if (!mounted) return null
  return createPortal(children, document.body)
}
