"use client"

import { useMemo } from "react"
import type { ExamStatistics } from "@/lib/quiz/statistics"
import { formatDurationLabel } from "@/lib/quiz/statistics"
import { MasteryRing } from "./mastery-ring"
import { EvolutionChart } from "./evolution-chart"
import {
  StatTile,
  TimeSpentTile,
  WrongQuestionsTile,
  SimulationsTile,
} from "./mini-tiles"

const ROMANIAN_DATE = new Intl.DateTimeFormat("ro-RO", {
  day: "numeric",
  month: "long",
  year: "numeric",
})

function formatDateRange(stats: ExamStatistics): string {
  const from = stats.dateRange.from ? new Date(stats.dateRange.from) : null
  const to = stats.dateRange.to ? new Date(stats.dateRange.to) : null
  if (!from || !to) return "Nu există încă simulări finalizate"
  const fromLabel = ROMANIAN_DATE.format(from)
  const toLabel = ROMANIAN_DATE.format(to)
  if (fromLabel === toLabel) return fromLabel
  return `${fromLabel} → ${toLabel}`
}

type Props = {
  stats: ExamStatistics
}

// Renders the data-dependent bento grid. Receives already-aggregated stats from
// the server component and only does cheap label derivations (Intl + tiny
// arithmetic over O(1) fields) so React render stays off the critical path.
export function StatisticsBento({ stats }: Props) {
  const dateRangeLabel = useMemo(() => formatDateRange(stats), [stats])

  const totalTimeLabel = useMemo(() => {
    if (stats.totalTimeSpentSec === 0) return "—"
    return formatDurationLabel(stats.totalTimeSpentSec)
  }, [stats.totalTimeSpentSec])

  const passRateLabel = useMemo(() => {
    if (stats.totalSimulations === 0) return "—"
    return `${Math.round((stats.passedSimulations / stats.totalSimulations) * 100)}%`
  }, [stats.passedSimulations, stats.totalSimulations])

  return (
    <>
      <p className="-mt-2 mb-6 text-sm text-muted-foreground">{dateRangeLabel}</p>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-6 lg:grid-cols-12">
        <MasteryRing
          masteryPct={stats.masteryPct}
          distinctCorrectCount={stats.distinctCorrectCount}
          totalQuestions={stats.totalQuestionsInPool}
          className="md:col-span-6 lg:col-span-4 lg:row-span-2"
        />

        <EvolutionChart
          data={stats.evolution}
          pragTrecerePct={stats.pragTrecerePct}
          pragTrecere={stats.pragTrecere}
          intrebariSimulare={stats.intrebariSimulare}
          className="relative z-0 md:col-span-6 lg:col-span-8 lg:row-span-2"
        />

        <TimeSpentTile
          totalLabel={totalTimeLabel}
          uniqueQuestions={stats.uniqueQuestionsAttempted}
          className="md:col-span-2 lg:col-span-4"
        />
        <SimulationsTile
          total={stats.totalSimulations}
          passed={stats.passedSimulations}
          passRateLabel={passRateLabel}
          className="md:col-span-2 lg:col-span-4"
        />
        <WrongQuestionsTile
          count={stats.wrongQuestionsCount}
          totalQuestions={stats.totalQuestionsInPool}
          className="md:col-span-2 lg:col-span-4"
        />

        {stats.totalSimulations === 0 && (
          <StatTile
            title="Începe prima simulare"
            value="0 simulări"
            description="Termină o simulare ca să vezi evoluția scorurilor și pragul de trecere reprezentat pe grafic."
            className="md:col-span-6 lg:col-span-12"
            tone="neutral"
          />
        )}
      </section>
    </>
  )
}
