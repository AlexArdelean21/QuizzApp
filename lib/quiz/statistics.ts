import type { SupabaseClient } from "@supabase/supabase-js"

// All statistics for a single (user, exam) pair. Everything is computed
// from three sources: `examene` (rules), `istoric_raspunsuri` (every
// attempt) and `sesiuni_simulare` / `sesiuni_practica` (finished sessions).
//
// Separation of concerns:
//   * Simulation-only: evolution chart, totalSimulations, passedSimulations
//   * Global (sim + practice): mastery / preparation, study time,
//     uniqueQuestionsAttempted, wrongQuestionsCount (`status_invatare`)
export type ExamStatistics = {
  examName: string
  pragTrecere: number
  intrebariSimulare: number
  pragTrecerePct: number
  /** % of pool questions answered correctly at least once (any mode). */
  masteryPct: number
  /** Distinct pool questions correct ≥1× in sim or practice. */
  distinctCorrectCount: number
  totalQuestionsInPool: number
  /** Distinct questions with any logged attempt (sim + practice). */
  uniqueQuestionsAttempted: number
  totalSimulations: number
  passedSimulations: number
  /** Seconds from finished sim sessions + finished practice sessions. */
  totalTimeSpentSec: number
  longestStreakDays: number
  wrongQuestionsCount: number
  evolution: SimulationPoint[]
  dateRange: { from: string | null; to: string | null }
}

export type SimulationPoint = {
  id: number
  finishedAt: string
  scorePct: number
  correct: number
  total: number
  durationSec: number
  timedOut: boolean
}

const PAGE_SIZE = 1000

// Formats a raw duration in seconds for display. The user-facing rule is:
//   - < 60s  → "Sub 1 min"
//   - < 60m  → "12 min"
//   - >= 60m → "1h 23m"
export function formatDurationLabel(seconds: number): string {
  if (!Number.isFinite(seconds) || seconds < 60) return "Sub 1 min"
  const totalMin = Math.floor(seconds / 60)
  if (totalMin < 60) return `${totalMin} min`
  const hours = Math.floor(totalMin / 60)
  const mins = totalMin % 60
  return `${hours}h ${mins.toString().padStart(2, "0")}m`
}

type ExamRuleRow = {
  id: number
  nume_examen: string | null
  prag_trecere: number | null
  intrebari_simulare: number | null
}

type AnswerHistoryRow = {
  intrebare_id: number
  corect: boolean
  data_raspuns: string | null
}

type SimulationRow = {
  id: number
  finished_at: string
  scor_procent: number | string
  raspunsuri_corecte: number
  total_intrebari: number
  durata_secunde: number
  timed_out: boolean
}

function clampPct(value: number): number {
  if (!Number.isFinite(value)) return 0
  return Math.max(0, Math.min(100, value))
}

async function analyzeAnswerHistory(
  supabase: SupabaseClient,
  userId: string,
  examenId: number
): Promise<{ attempted: Set<number>; everCorrect: Set<number> }> {
  const attempted = new Set<number>()
  const everCorrect = new Set<number>()
  let from = 0

  for (;;) {
    const { data, error } = await supabase
      .from("istoric_raspunsuri")
      .select("intrebare_id, corect")
      .eq("user_id", userId)
      .eq("examen_id", examenId)
      .order("id", { ascending: true })
      .range(from, from + PAGE_SIZE - 1)

    if (error) throw new Error(error.message)
    const rows = (data ?? []) as AnswerHistoryRow[]

    for (const row of rows) {
      const qid = Number(row.intrebare_id)
      if (!Number.isFinite(qid) || qid <= 0) continue
      attempted.add(qid)
      if (row.corect) everCorrect.add(qid)
    }

    if (rows.length < PAGE_SIZE) break
    from += PAGE_SIZE
  }

  return { attempted, everCorrect }
}

async function sumPracticeDurationSeconds(
  supabase: SupabaseClient,
  userId: string,
  examenId: number
): Promise<number> {
  const { data, error } = await supabase
    .from("sesiuni_practica")
    .select("durata_secunde")
    .eq("user_id", userId)
    .eq("examen_id", examenId)
    .eq("finalizat", true)
  if (error) throw new Error(error.message)
  const rows = (data ?? []) as Array<{ durata_secunde: number | null }>
  return rows.reduce((acc, row) => acc + Number(row.durata_secunde ?? 0), 0)
}

export async function getExamStatistics(
  supabase: SupabaseClient,
  userId: string,
  examenId: number
): Promise<ExamStatistics> {
  const { data: examRow, error: examError } = await supabase
    .from("examene")
    .select("id, nume_examen, prag_trecere, intrebari_simulare")
    .eq("id", examenId)
    .maybeSingle()

  if (examError) throw new Error(examError.message)
  const exam = (examRow ?? null) as ExamRuleRow | null
  const examName = exam?.nume_examen ?? `Examen ${examenId}`
  const pragTrecere = Number(exam?.prag_trecere) > 0 ? Number(exam?.prag_trecere) : 18
  const intrebariSimulare = Number(exam?.intrebari_simulare) > 0 ? Number(exam?.intrebari_simulare) : 25
  const pragTrecerePct = clampPct((pragTrecere / Math.max(1, intrebariSimulare)) * 100)

  const { count: totalQuestionsInPool, error: poolError } = await supabase
    .from("intrebari")
    .select("id", { count: "exact", head: true })
    .eq("examen_id", examenId)
  if (poolError) throw new Error(poolError.message)
  const poolSize = totalQuestionsInPool ?? 0

  const { attempted, everCorrect } = await analyzeAnswerHistory(supabase, userId, examenId)
  const uniqueQuestionsAttempted = attempted.size
  const distinctCorrectCount = everCorrect.size
  const masteryPct =
    poolSize > 0 ? clampPct((distinctCorrectCount / poolSize) * 100) : 0

  const { count: wrongQuestionsCount, error: wrongError } = await supabase
    .from("status_invatare")
    .select("id", { count: "exact", head: true })
    .eq("user_id", userId)
    .eq("examen_id", examenId)
    .eq("este_gresita", true)
  if (wrongError) throw new Error(wrongError.message)

  const { data: simRows, error: simError } = await supabase
    .from("sesiuni_simulare")
    .select(
      "id, finished_at, scor_procent, raspunsuri_corecte, total_intrebari, durata_secunde, timed_out"
    )
    .eq("user_id", userId)
    .eq("examen_id", examenId)
    .eq("finalizat", true)
    .order("finished_at", { ascending: false })
    .limit(20)
  if (simError) throw new Error(simError.message)

  const evolutionDesc = ((simRows ?? []) as SimulationRow[]).map((row) => ({
    id: Number(row.id),
    finishedAt: String(row.finished_at),
    scorePct: clampPct(Number(row.scor_procent)),
    correct: Number(row.raspunsuri_corecte ?? 0),
    total: Number(row.total_intrebari ?? 0),
    durationSec: Number(row.durata_secunde ?? 0),
    timedOut: Boolean(row.timed_out),
  }))
  const evolution = [...evolutionDesc].reverse()

  const [{ data: aggregateRows, error: aggregateError }, practiceSeconds] = await Promise.all([
    supabase
      .from("sesiuni_simulare")
      .select("durata_secunde, scor_procent")
      .eq("user_id", userId)
      .eq("examen_id", examenId)
      .eq("finalizat", true),
    sumPracticeDurationSeconds(supabase, userId, examenId),
  ])

  if (aggregateError) throw new Error(aggregateError.message)

  const aggregateList = (aggregateRows ?? []) as Array<{
    durata_secunde: number | null
    scor_procent: number | string | null
  }>
  const simulationSeconds = aggregateList.reduce((acc, row) => acc + Number(row.durata_secunde ?? 0), 0)
  const totalSimulations = aggregateList.length
  const passedSimulations = aggregateList.reduce(
    (acc, row) => acc + (Number(row.scor_procent ?? 0) >= pragTrecerePct ? 1 : 0),
    0
  )

  const totalTimeSpentSec = simulationSeconds + practiceSeconds

  const { data: profileRow, error: profileError } = await supabase
    .from("profiles")
    .select("streak_zile")
    .eq("id", userId)
    .maybeSingle()
  if (profileError) throw new Error(profileError.message)
  const longestStreakDays = Number(profileRow?.streak_zile ?? 0)

  const dateRange = {
    from: evolution[0]?.finishedAt ?? null,
    to: evolution[evolution.length - 1]?.finishedAt ?? null,
  }

  return {
    examName,
    pragTrecere,
    intrebariSimulare,
    pragTrecerePct,
    masteryPct,
    distinctCorrectCount,
    totalQuestionsInPool: poolSize,
    uniqueQuestionsAttempted,
    totalSimulations,
    passedSimulations,
    totalTimeSpentSec,
    longestStreakDays,
    wrongQuestionsCount: wrongQuestionsCount ?? 0,
    evolution,
    dateRange,
  }
}