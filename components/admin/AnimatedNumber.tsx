"use client"

import { useEffect, useRef, useState } from "react"

export function AnimatedNumber({
  value,
  duration = 1200,
  formatter,
}: {
  value: number
  duration?: number
  formatter?: (n: number) => string
}) {
  const [displayValue, setDisplayValue] = useState(0)
  const rafRef = useRef<number | null>(null)

  useEffect(() => {
    const startTime = performance.now()
    const startValue = 0

    const animate = (currentTime: number) => {
      const elapsed = currentTime - startTime
      const progress = Math.min(elapsed / duration, 1)
      const eased = 1 - Math.pow(1 - progress, 3)
      const current = Math.round(startValue + (value - startValue) * eased)
      setDisplayValue(current)

      if (progress < 1) {
        rafRef.current = requestAnimationFrame(animate)
      }
    }

    rafRef.current = requestAnimationFrame(animate)
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current)
    }
  }, [value, duration])

  const formatted = formatter
    ? formatter(displayValue)
    : displayValue.toLocaleString("ro-RO")

  return <span className="tabular-nums">{formatted}</span>
}
