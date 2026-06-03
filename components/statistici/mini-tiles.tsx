"use client"

import type { ReactNode } from "react"
import { Clock, ListChecks, Target } from "lucide-react"
import { cn } from "@/lib/utils"

type Tone = "primary" | "rose" | "amber" | "emerald" | "neutral"

const TONE_STYLES: Record<Tone, { iconWrap: string; ring: string; value: string }> = {
  primary: {
    iconWrap: "bg-sky-500/15 text-sky-500 dark:text-sky-300",
    ring: "ring-sky-500/10",
    value: "text-foreground",
  },
  rose: {
    iconWrap: "bg-rose-500/15 text-rose-500 dark:text-rose-300",
    ring: "ring-rose-500/10",
    value: "text-foreground",
  },
  amber: {
    iconWrap: "bg-amber-500/15 text-amber-500 dark:text-amber-300",
    ring: "ring-amber-500/10",
    value: "text-foreground",
  },
  emerald: {
    iconWrap: "bg-emerald-500/15 text-emerald-500 dark:text-emerald-300",
    ring: "ring-emerald-500/10",
    value: "text-foreground",
  },
  neutral: {
    iconWrap: "bg-secondary/70 text-muted-foreground",
    ring: "ring-white/5",
    value: "text-foreground",
  },
}

type StatTileProps = {
  title: string
  value: string | number
  subtitle?: ReactNode
  description?: ReactNode
  icon?: ReactNode
  tone?: Tone
  className?: string
  footer?: ReactNode
}

export function StatTile({
  title,
  value,
  subtitle,
  description,
  icon,
  tone = "neutral",
  className,
  footer,
}: StatTileProps) {
  const styles = TONE_STYLES[tone]
  return (
    <div
      className={cn(
        "card-surface relative flex flex-col gap-4 rounded-2xl p-5 shadow-lg shadow-primary/5 ring-1",
        styles.ring,
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            {title}
          </p>
          {subtitle && (
            <p className="mt-1 text-[11px] font-medium text-muted-foreground/80">
              {subtitle}
            </p>
          )}
        </div>
        {icon && (
          <span className={cn("flex size-9 shrink-0 items-center justify-center rounded-lg", styles.iconWrap)}>
            {icon}
          </span>
        )}
      </div>

      <p className={cn("text-3xl font-semibold tracking-tight tabular-nums", styles.value)}>
        {value}
      </p>

      {description && (
        <p className="text-sm text-muted-foreground">{description}</p>
      )}

      {footer && <div className="mt-auto">{footer}</div>}
    </div>
  )
}

export function TimeSpentTile({
  totalLabel,
  uniqueQuestions,
  className,
}: {
  totalLabel: string
  uniqueQuestions: number
  className?: string
}) {
  return (
    <StatTile
      title="Timp dedicat"
      subtitle="Timp total de studiu"
      value={totalLabel}
      tone="primary"
      icon={<Clock className="size-4" />}
      description={
        <>
          {uniqueQuestions} întrebări unice exersate (simulare + practică).
        </>
      }
      className={className}
    />
  )
}

export function WrongQuestionsTile({
  count,
  totalQuestions,
  className,
}: {
  count: number
  totalQuestions: number
  className?: string
}) {
  const ratio = totalQuestions > 0 ? Math.round((count / totalQuestions) * 100) : 0
  return (
    <StatTile
      title="Întrebări cu probleme"
      subtitle="Întrebări din pool-ul tău de greșeli"
      value={count}
      tone="rose"
      icon={<ListChecks className="size-4" />}
      description={
        totalQuestions > 0
          ? `${ratio}% din pool — acumulate la simulări și practică.`
          : "Adaugă întrebări în pool ca să poți recapitula."
      }
      className={className}
    />
  )
}

export function SimulationsTile({
  total,
  passed,
  passRateLabel,
  className,
}: {
  total: number
  passed: number
  passRateLabel: string
  className?: string
}) {
  return (
    <StatTile
      title="Simulări finalizate"
      subtitle="Strict mod simulare examen"
      value={total}
      tone="emerald"
      icon={<Target className="size-4" />}
      description={
        <>
          {passed} sub formă de promovate · rată de trecere{" "}
          <span className="font-semibold text-foreground">{passRateLabel}</span>
        </>
      }
      className={className}
    />
  )
}

