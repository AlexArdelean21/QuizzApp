"use client"

import {
  CartesianGrid,
  Line,
  LineChart,
  ReferenceLine,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from "recharts"
import type { TooltipProps } from "recharts"
import type { SimulationPoint } from "@/lib/quiz/statistics"
import { formatDurationLabel } from "@/lib/quiz/statistics"
import { cn } from "@/lib/utils"

type Props = {
  data: SimulationPoint[]
  pragTrecerePct: number
  pragTrecere: number
  intrebariSimulare: number
  className?: string
}

const DATE_LABEL = new Intl.DateTimeFormat("ro-RO", { day: "2-digit", month: "short" })
const TOOLTIP_DATE = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric" })
const TOOLTIP_TIME = new Intl.DateTimeFormat("ro-RO", { hour: "2-digit", minute: "2-digit" })

type ChartDatum = SimulationPoint & {
  index: number
  label: string
}

// Frosted-glass tooltip styled for the dark theme regardless of the
// surrounding mode — the line chart card sits on a translucent surface so
// a uniformly dark popover keeps contrast high in both light and dark.
// `threshold` is threaded in via a closure in <Tooltip content={...}/> so
// the score color flips green/rose around the exam's pass mark.
type ChartTooltipProps = TooltipProps<number, string> & { threshold: number }

function ChartTooltip({ active, payload, threshold }: ChartTooltipProps) {
  if (!active || !payload || payload.length === 0) return null
  const datum = payload[0]?.payload as ChartDatum | undefined
  if (!datum) return null

  const date = new Date(datum.finishedAt)
  const passed = datum.scorePct >= threshold
  const scoreColor = passed ? "text-emerald-300" : "text-rose-300"

  return (
    <div className="min-w-[210px] rounded-xl border border-white/10 bg-slate-950/85 px-3.5 py-3 text-xs text-slate-200 shadow-2xl ring-1 ring-white/5 backdrop-blur-xl">
      <div className="flex items-baseline justify-between gap-3">
        <p className="text-[11px] font-semibold uppercase tracking-[0.16em] text-slate-300">
          {TOOLTIP_DATE.format(date)}
        </p>
        <p className="text-[10px] font-medium text-slate-500 tabular-nums">
          {TOOLTIP_TIME.format(date)}
        </p>
      </div>

      <div className="mt-2.5 space-y-1.5">
        <div className="flex items-center justify-between gap-4">
          <span className="flex items-center gap-2 text-slate-400">
            <span
              aria-hidden
              className="size-2 rounded-full"
              style={{ background: "linear-gradient(135deg,#38bdf8,#6366f1)" }}
            />
            Scor
          </span>
          <span className={cn("text-sm font-semibold tabular-nums", scoreColor)}>
            {datum.scorePct.toFixed(1)}%
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Corecte</span>
          <span className="font-medium text-white tabular-nums">
            {datum.correct}
            <span className="text-slate-500"> / {datum.total}</span>
          </span>
        </div>

        <div className="flex items-center justify-between gap-4">
          <span className="text-slate-400">Durată</span>
          <span className="font-medium text-white tabular-nums">
            {formatDurationLabel(datum.durationSec)}
          </span>
        </div>
      </div>

      {datum.timedOut && (
        <p className="mt-2 rounded-md bg-amber-500/15 px-2 py-1 text-[10px] font-medium text-amber-300">
          Sesiune finalizată automat — timer expirat
        </p>
      )}
    </div>
  )
}

export function EvolutionChart({
  data,
  pragTrecerePct,
  pragTrecere,
  intrebariSimulare,
  className,
}: Props) {
  // Prepare a stable, chronological dataset for recharts. We attach a 1-based
  // index for the X axis so even simulations done on the same day render
  // distinctly (recharts treats categorical axes by string identity).
  const chartData: ChartDatum[] = data.map((point, idx) => ({
    ...point,
    index: idx + 1,
    label: DATE_LABEL.format(new Date(point.finishedAt)),
  }))

  const hasData = chartData.length > 0
  const yMax = 100
  const yMin = 0

  return (
    <div
      className={cn(
        "relative flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/55 p-6 shadow-xl shadow-primary/5 ring-1 ring-white/5 backdrop-blur-md",
        className,
      )}
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Evoluție scor simulări
          </p>
          <p className="mt-1 text-sm text-muted-foreground">
            Ultimele {chartData.length || 20} simulări finalizate (excluse sesiunile de practică).
          </p>
        </div>
        <div className="rounded-lg border border-emerald-500/30 bg-emerald-500/10 px-3 py-1.5 text-right text-xs text-emerald-700 dark:text-emerald-300">
          <p className="font-semibold tabular-nums">{pragTrecerePct.toFixed(0)}%</p>
          <p className="opacity-80">
            prag trecere ({pragTrecere}/{intrebariSimulare})
          </p>
        </div>
      </div>

      <div className="h-72 w-full">
        {hasData ? (
          <ResponsiveContainer width="100%" height="100%">
            <LineChart data={chartData} margin={{ top: 12, right: 16, left: -8, bottom: 0 }}>
              <defs>
                <linearGradient id="evolution-line" x1="0" y1="0" x2="1" y2="0">
                  <stop offset="0%" stopColor="#38bdf8" />
                  <stop offset="100%" stopColor="#6366f1" />
                </linearGradient>
              </defs>
              <CartesianGrid stroke="currentColor" strokeOpacity={0.08} vertical={false} />
              <XAxis
                dataKey="label"
                stroke="currentColor"
                strokeOpacity={0.6}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                minTickGap={16}
              />
              <YAxis
                domain={[yMin, yMax]}
                stroke="currentColor"
                strokeOpacity={0.6}
                tickLine={false}
                axisLine={false}
                fontSize={11}
                tickFormatter={(value) => `${value}%`}
                width={40}
              />
              <Tooltip
                content={(props) => (
                  <ChartTooltip {...(props as TooltipProps<number, string>)} threshold={pragTrecerePct} />
                )}
                cursor={{ stroke: "currentColor", strokeOpacity: 0.15, strokeWidth: 1 }}
              />
              <ReferenceLine
                y={pragTrecerePct}
                stroke="#10b981"
                strokeDasharray="6 4"
                strokeWidth={1.5}
                label={{
                  value: `Prag trecere ${pragTrecerePct.toFixed(0)}%`,
                  position: "insideTopRight",
                  fill: "#10b981",
                  fontSize: 11,
                }}
              />
              <Line
                type="monotone"
                dataKey="scorePct"
                stroke="url(#evolution-line)"
                strokeWidth={2.5}
                dot={{ r: 3.5, strokeWidth: 0, fill: "#6366f1" }}
                activeDot={{ r: 5 }}
                isAnimationActive
                animationDuration={650}
              />
            </LineChart>
          </ResponsiveContainer>
        ) : (
          <div className="flex h-full items-center justify-center rounded-xl border border-dashed border-border/40 bg-secondary/30 px-6 text-center text-sm text-muted-foreground">
            Termină prima simulare pentru a începe să urmărești evoluția scorurilor.
          </div>
        )}
      </div>
    </div>
  )
}
