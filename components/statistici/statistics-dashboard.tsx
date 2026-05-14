"use client"

import { useEffect, useMemo } from "react"
import { useRouter } from "next/navigation"
import type { ExamSummary } from "@/lib/quiz/types"
import type { ExamStatistics } from "@/lib/quiz/statistics"
import { formatDurationLabel } from "@/lib/quiz/statistics"
import { ExamSelector } from "./exam-selector"
import { MasteryRing } from "./mastery-ring"
import { EvolutionChart } from "./evolution-chart"
import {
  StatTile,
  TimeSpentTile,
  WrongQuestionsTile,
  SimulationsTile,
} from "./mini-tiles"

const SELECTED_EXAM_STORAGE_KEY = "quiz.selectedExamId"
const ROMANIAN_DATE = new Intl.DateTimeFormat("ro-RO", { day: "numeric", month: "long", year: "numeric" })

type Props = {
  exams: ExamSummary[]
  selectedExam: ExamSummary
  stats: ExamStatistics
}

function formatDateRange(stats: ExamStatistics): string {
  const from = stats.dateRange.from ? new Date(stats.dateRange.from) : null
  const to = stats.dateRange.to ? new Date(stats.dateRange.to) : null
  if (!from || !to) return "Nu există încă simulări finalizate"
  const fromLabel = ROMANIAN_DATE.format(from)
  const toLabel = ROMANIAN_DATE.format(to)
  if (fromLabel === toLabel) return fromLabel
  return `${fromLabel} → ${toLabel}`
}

export function StatisticsDashboard({ exams, selectedExam, stats }: Props) {
  const router = useRouter()

  // Keep `localStorage` in sync so other parts of the app (quiz interface,
  // bookmarks, etc.) see the same selected exam after navigating away.
  useEffect(() => {
    if (typeof window === "undefined") return
    window.localStorage.setItem(SELECTED_EXAM_STORAGE_KEY, String(selectedExam.id))
  }, [selectedExam.id])

  const handleExamChange = (nextId: number) => {
    if (typeof window !== "undefined") {
      window.localStorage.setItem(SELECTED_EXAM_STORAGE_KEY, String(nextId))
    }
    router.push(`/dashboard/statistici?examen=${nextId}`)
  }

  const dateRangeLabel = useMemo(() => formatDateRange(stats), [stats])

  // Display rule: when the user hasn't completed any simulation we show an
  // em-dash instead of "Sub 1 min" so the tile reads as "no data yet" rather
  // than "almost no time spent".
  const totalTimeLabel = useMemo(() => {
    if (stats.totalTimeSpentSec === 0) return "—"
    return formatDurationLabel(stats.totalTimeSpentSec)
  }, [stats.totalTimeSpentSec])

  const passRateLabel = useMemo(() => {
    if (stats.totalSimulations === 0) return "—"
    return `${Math.round((stats.passedSimulations / stats.totalSimulations) * 100)}%`
  }, [stats.passedSimulations, stats.totalSimulations])

  return (
    <main className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      {/* Header lifts above chart stacking; exam selector sits in a flex child with z-[120]. */}
      <header className="relative z-[110] mb-8 flex flex-col gap-4 rounded-2xl border border-border/40 bg-card/55 p-6 shadow-xl shadow-primary/5 ring-1 ring-white/5 backdrop-blur-md isolate sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-muted-foreground">
            Statistici examen
          </p>
          <h1 className="mt-2 bg-gradient-to-r from-foreground via-foreground to-foreground/70 bg-clip-text text-3xl font-semibold leading-tight text-transparent md:text-4xl">
            {stats.examName}
          </h1>
          <p className="mt-2 text-sm text-muted-foreground">
            {dateRangeLabel}
          </p>
        </div>

        <div className="sm:shrink-0 sm:self-end">
          <ExamSelector
            exams={exams}
            selectedId={selectedExam.id}
            onChange={handleExamChange}
          />
        </div>
      </header>

      {/* Bento grid: 12 columns on lg, simpler stacks on smaller screens. */}
      <section className="grid grid-cols-1 gap-5 md:grid-cols-6 lg:grid-cols-12">
        {/* Mastery ring — 4 cols on lg, full width on small */}
        <MasteryRing
          masteryPct={stats.masteryPct}
          distinctCorrectCount={stats.distinctCorrectCount}
          totalQuestions={stats.totalQuestionsInPool}
          className="md:col-span-6 lg:col-span-4 lg:row-span-2"
        />

        {/* Evolution chart — the dominant tile */}
        <EvolutionChart
          data={stats.evolution}
          pragTrecerePct={stats.pragTrecerePct}
          pragTrecere={stats.pragTrecere}
          intrebariSimulare={stats.intrebariSimulare}
          className="relative z-0 md:col-span-6 lg:col-span-8 lg:row-span-2"
        />

        {/* Mini tiles row — three tiles share the row evenly on every
            breakpoint (col-span-2 of 6 / col-span-4 of 12). */}
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

        {/* Optional summary tile when the user has no data yet — fills the row */}
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
    </main>
  )
}
