"use client"

import { useEffect } from "react"
import { updateUserActivity } from "@/app/admin/actions"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

const TRACK_INTERVAL_MS = 24 * 60 * 60 * 1000
const STORAGE_PREFIX = "quizhub:last-activity-track:"

function getStorageKey(userId: string) {
  return `${STORAGE_PREFIX}${userId}`
}

function shouldTrackNow(userId: string) {
  const key = getStorageKey(userId)
  const previousRaw = window.localStorage.getItem(key)
  const previousTs = Number(previousRaw)
  if (!Number.isFinite(previousTs)) return true
  return Date.now() - previousTs >= TRACK_INTERVAL_MS
}

function markTrackedNow(userId: string) {
  window.localStorage.setItem(getStorageKey(userId), String(Date.now()))
}

export function useTrackActivity() {
  useEffect(() => {
    let isDisposed = false
    const inFlightByUser = new Set<string>()
    const supabase = getSupabaseBrowserClient()

    const trackForCurrentUser = async () => {
      const {
        data: { session },
      } = await supabase.auth.getSession()
      const userId = session?.user?.id

      if (!userId || isDisposed || inFlightByUser.has(userId) || !shouldTrackNow(userId)) {
        return
      }

      inFlightByUser.add(userId)
      try {
        await updateUserActivity()
        markTrackedNow(userId)
      } catch {
        // Silent fail: activity tracking must not impact user flow.
      } finally {
        inFlightByUser.delete(userId)
      }
    }

    void trackForCurrentUser()

    const {
      data: { subscription },
    } = supabase.auth.onAuthStateChange((event, session) => {
      if (event !== "SIGNED_IN" && event !== "TOKEN_REFRESHED") return
      if (!session?.user) return
      void trackForCurrentUser()
    })

    const handleVisibilityChange = () => {
      if (document.visibilityState === "visible") {
        void trackForCurrentUser()
      }
    }

    window.addEventListener("focus", handleVisibilityChange)
    document.addEventListener("visibilitychange", handleVisibilityChange)

    return () => {
      isDisposed = true
      subscription.unsubscribe()
      window.removeEventListener("focus", handleVisibilityChange)
      document.removeEventListener("visibilitychange", handleVisibilityChange)
    }
  }, [])
}
