"use client"

import { useEffect, useRef, useState } from "react"
import { BookOpen, HelpCircle, Users, Building2 } from "lucide-react"
import type { PublicStats } from "@/lib/public-stats"

const STAT_DEFS = [
  { key: "examene", label: "Examene", icon: BookOpen, color: "text-blue-500" },
  { key: "intrebari", label: "Întrebări", icon: HelpCircle, color: "text-amber-500" },
  { key: "utilizatori", label: "Utilizatori", icon: Users, color: "text-emerald-500" },
  { key: "organizatii", label: "Organizații", icon: Building2, color: "text-violet-500" },
] as const

export function StatsCountUp({ stats }: { stats: PublicStats }) {
  return (
    <div className="grid grid-cols-2 gap-4 sm:gap-6 md:grid-cols-4">
      {STAT_DEFS.map((def) => {
        const Icon = def.icon
        const value = stats[def.key]
        return (
          <div key={def.key} className="flex flex-col items-start gap-2 sm:items-center sm:text-center">
            <Icon className={`size-5 ${def.color}`} />
            <CountUp target={value} />
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              {def.label}
            </span>
          </div>
        )
      })}
    </div>
  )
}

function CountUp({ target }: { target: number }) {
  const [value, setValue] = useState(0)
  const ref = useRef<HTMLSpanElement>(null)
  const hasStartedRef = useRef(false)

  useEffect(() => {
    if (!ref.current) return
    const observer = new IntersectionObserver(
      ([entry]) => {
        if (entry.isIntersecting && !hasStartedRef.current) {
          hasStartedRef.current = true
          const start = performance.now()
          const duration = 1400

          const tick = (now: number) => {
            const progress = Math.min((now - start) / duration, 1)
            const eased = 1 - Math.pow(1 - progress, 3)
            setValue(Math.round(target * eased))
            if (progress < 1) requestAnimationFrame(tick)
          }
          requestAnimationFrame(tick)
        }
      },
      { threshold: 0.3 }
    )
    observer.observe(ref.current)
    return () => observer.disconnect()
  }, [target])

  return (
    <span
      ref={ref}
      className="text-3xl font-bold tabular-nums tracking-tight text-foreground sm:text-4xl"
    >
      {value.toLocaleString("ro-RO")}
    </span>
  )
}
