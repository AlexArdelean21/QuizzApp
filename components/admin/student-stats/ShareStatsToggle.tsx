"use client"

import { useState, useTransition } from "react"
import { setMyShareStatsEnabled } from "@/app/admin/actions"
import { cn } from "@/lib/utils"

type ShareStatsToggleProps = {
  initialEnabled: boolean
}

export function ShareStatsToggle({ initialEnabled }: ShareStatsToggleProps) {
  const [enabled, setEnabled] = useState(initialEnabled)
  const [pending, startTransition] = useTransition()
  const [errorMsg, setErrorMsg] = useState<string | null>(null)

  const handleToggle = () => {
    const next = !enabled
    setEnabled(next) // optimistic
    setErrorMsg(null)
    startTransition(() => {
      void (async () => {
        try {
          await setMyShareStatsEnabled(next)
        } catch (err) {
          setEnabled(!next) // rollback on error
          setErrorMsg(err instanceof Error ? err.message : "Nu s-a putut salva.")
        }
      })()
    })
  }

  return (
    <div>
      <div className="flex items-center justify-between gap-4 rounded-xl border bg-card p-4">
        <div>
          <p className="text-sm font-medium text-foreground">
            Partajează statisticile mele cu colegii admini
          </p>
          <p className="mt-1 text-xs text-muted-foreground">
            Când e activ, vei vedea statisticile altor org admini din organizația ta
            care au activat și ei această opțiune.
          </p>
        </div>
        <button
          type="button"
          role="switch"
          aria-checked={enabled}
          onClick={handleToggle}
          disabled={pending}
          className={cn(
            "relative inline-flex h-6 w-11 shrink-0 cursor-pointer items-center rounded-full transition-colors",
            enabled ? "bg-blue-600" : "bg-slate-300 dark:bg-slate-700"
          )}
        >
          <span
            className={cn(
              "inline-block size-4 transform rounded-full bg-white shadow-sm transition-transform",
              enabled ? "translate-x-6" : "translate-x-1"
            )}
          />
        </button>
      </div>
      {errorMsg ? (
        <p className="mt-2 text-xs text-rose-600 dark:text-rose-400">{errorMsg}</p>
      ) : null}
    </div>
  )
}
