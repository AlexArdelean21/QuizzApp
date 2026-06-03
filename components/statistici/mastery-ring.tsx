"use client"

import { useEffect, useState } from "react"
import { cn } from "@/lib/utils"

type Props = {
  masteryPct: number
  distinctCorrectCount: number
  totalQuestions: number
  className?: string
}

// Animated progress ring rendered with two stacked SVG circles. The track
// uses a low-opacity stroke while the indicator uses a gradient stroke and
// `pathLength` so the animation is independent of the actual radius.
export function MasteryRing({ masteryPct, distinctCorrectCount, totalQuestions, className }: Props) {
  const targetValue = Math.max(0, Math.min(100, Math.round(masteryPct)))
  const [animatedValue, setAnimatedValue] = useState(0)

  useEffect(() => {
    // Tiny rAF schedule so the SVG receives the 0-state once before tweening.
    const handle = requestAnimationFrame(() => setAnimatedValue(targetValue))
    return () => cancelAnimationFrame(handle)
  }, [targetValue])

  const pulse = targetValue >= 90
  const ringSize = 220
  const stroke = 14
  const radius = (ringSize - stroke) / 2
  const dashOffset = 100 - animatedValue
  const tone =
    targetValue >= 90 ? "emerald" : targetValue >= 70 ? "sky" : targetValue >= 40 ? "amber" : "rose"
  const gradientId = "mastery-gradient"
  const toneStops: Record<typeof tone, [string, string]> = {
    emerald: ["#34d399", "#10b981"],
    sky: ["#38bdf8", "#3b82f6"],
    amber: ["#fbbf24", "#f97316"],
    rose: ["#fb7185", "#e11d48"],
  }
  const [colorA, colorB] = toneStops[tone]

  return (
    <div
      className={cn(
        "card-surface relative flex flex-col items-center gap-6 rounded-2xl p-6 shadow-xl shadow-primary/5",
        className,
      )}
    >
      <div className="flex w-full max-w-md flex-col items-center gap-1 text-center">
        <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
          Nivel de pregătire
        </p>
        <p className="text-sm text-muted-foreground">
          Procent din pool-ul examenului pentru care ai răspuns corect.
        </p>
      </div>

      <div
        className={cn(
          "relative mx-auto flex shrink-0 items-center justify-center",
          pulse && "mastery-pulse rounded-full",
        )}
      >
        <svg
          viewBox={`0 0 ${ringSize} ${ringSize}`}
          width={ringSize}
          height={ringSize}
          className="-rotate-90"
        >
          <defs>
            <linearGradient id={gradientId} x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor={colorA} />
              <stop offset="100%" stopColor={colorB} />
            </linearGradient>
          </defs>
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke="currentColor"
            strokeWidth={stroke}
            className="text-border/50"
          />
          <circle
            cx={ringSize / 2}
            cy={ringSize / 2}
            r={radius}
            fill="none"
            stroke={`url(#${gradientId})`}
            strokeWidth={stroke}
            strokeLinecap="round"
            pathLength={100}
            strokeDasharray={100}
            strokeDashoffset={dashOffset}
            style={{ transition: "stroke-dashoffset 900ms cubic-bezier(0.22, 1, 0.36, 1)" }}
          />
        </svg>
        <div className="pointer-events-none absolute inset-0 flex flex-col items-center justify-center">
          <span className="text-5xl font-semibold tracking-tight text-foreground tabular-nums">
            {targetValue}
            <span className="text-2xl font-medium text-muted-foreground">%</span>
          </span>
          <span className="mt-1 text-xs uppercase tracking-widest text-muted-foreground">pool</span>
        </div>
      </div>

      <div className="flex w-full max-w-sm items-center justify-center gap-2 rounded-xl bg-secondary/40 px-4 py-3 text-sm">
        <span className="text-muted-foreground">Corecte cel puțin o dată</span>
        <span className="font-semibold text-foreground tabular-nums">
          {distinctCorrectCount}
          <span className="ml-1 text-xs font-medium text-muted-foreground">/ {totalQuestions}</span>
        </span>
      </div>
    </div>
  )
}
