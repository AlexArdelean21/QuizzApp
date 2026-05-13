"use client"

import { useTransition } from "react"
import { useRouter } from "next/navigation"
import { RefreshCcw } from "lucide-react"
import { Button } from "@/components/ui/button"

export function AdminRefreshButton() {
  const router = useRouter()
  const [isRefreshing, startRefreshTransition] = useTransition()

  return (
    <Button
      type="button"
      variant="outline"
      size="sm"
      onClick={() => {
        startRefreshTransition(() => {
          router.refresh()
        })
      }}
      disabled={isRefreshing}
      aria-label="Reîncarcă datele admin"
    >
      <RefreshCcw className={`size-4 ${isRefreshing ? "animate-spin" : ""}`} />
      {isRefreshing ? "Se reîncarcă..." : "Refresh"}
    </Button>
  )
}
