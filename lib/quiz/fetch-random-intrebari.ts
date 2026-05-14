import type { SupabaseClient } from "@supabase/supabase-js"
import { isAdminRole, isSuperAdminRole, normalizeRole } from "@/lib/auth/roles"
import type {
  AnswerId,
  ExamSummary,
  IntrebareRow,
  PracticeSource,
  QuizQuestion,
} from "./types"

function normalizeCorrect(raw: string | null | undefined): AnswerId | null {
  if (raw == null) return null
  const t = String(raw).trim().toLowerCase()
  if (t === "a" || t === "b" || t === "c") return t
  return null
}

function shuffleInPlace<T>(items: T[]): void {
  for (let i = items.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1))
    ;[items[i], items[j]] = [items[j], items[i]]
  }
}

export function mapIntrebareRowToQuestion(row: IntrebareRow): QuizQuestion | null {
  const correct = normalizeCorrect(row.raspuns_corect)
  if (!correct) return null
  const examenId = Number(row.examen_id ?? 0)
  if (!Number.isFinite(examenId) || examenId <= 0) return null

  return {
    id: String(row.id),
    examenId,
    text: String(row.intrebare_text ?? "").trim(),
    correctAnswer: correct,
    options: [
      { id: "a", label: "A", text: String(row.varianta_a ?? "").trim() },
      { id: "b", label: "B", text: String(row.varianta_b ?? "").trim() },
      { id: "c", label: "C", text: String(row.varianta_c ?? "").trim() },
    ],
  }
}

function shuffleInPlaceAndLimit(items: QuizQuestion[], count: number) {
  shuffleInPlace(items)
  return items.slice(0, Math.min(count, items.length))
}

function isValidExamId(examenId: number) {
  return Number.isFinite(examenId) && examenId > 0
}

async function fetchQuestionIdsForSource(
  supabase: SupabaseClient,
  userId: string,
  examenId: number,
  source: PracticeSource
): Promise<string[]> {
  if (!userId || !isValidExamId(examenId)) return []

  if (source === "bookmarked") {
    const { data, error } = await supabase
      .from("bookmarks")
      .select("intrebare_id")
      .eq("user_id", userId)
      .eq("examen_id", examenId)

    if (error) throw new Error(error.message)
    return (data ?? []).map((item) => String(item.intrebare_id))
  }

  const { data, error } = await supabase
    .from("status_invatare")
    .select("intrebare_id")
    .eq("user_id", userId)
    .eq("examen_id", examenId)
    .eq("este_gresita", true)

  if (error) throw new Error(error.message)
  return (data ?? []).map((item) => String(item.intrebare_id))
}

export async function getAvailableQuestionCount(
  supabase: SupabaseClient,
  params: { examenId: number; source: PracticeSource; userId: string }
): Promise<number> {
  const { examenId, source, userId } = params
  if (!isValidExamId(examenId)) return 0
  if (source !== "all" && !userId) return 0
  if (source === "all") {
    const { count, error } = await supabase
      .from("intrebari")
      .select("id", { count: "exact", head: true })
      .eq("examen_id", examenId)
    if (error) throw new Error(error.message)
    return count ?? 0
  }

  const ids = await fetchQuestionIdsForSource(supabase, userId, examenId, source)
  return ids.length
}

export async function fetchQuestionsBySource(
  supabase: SupabaseClient,
  params: {
    count: number
    examenId: number
    source: PracticeSource
    userId: string
  }
): Promise<QuizQuestion[]> {
  const { count, examenId, source, userId } = params
  if (count <= 0) return []
  if (!isValidExamId(examenId)) return []
  if (source !== "all" && !userId) return []

  if (source === "all") {
    const { data, error } = await supabase
      .from("intrebari")
      .select("*")
      .eq("examen_id", examenId)
    if (error) throw new Error(error.message)
    const mapped = ((data ?? []) as IntrebareRow[])
      .map(mapIntrebareRowToQuestion)
      .filter((item): item is QuizQuestion => Boolean(item && item.text))
    return shuffleInPlaceAndLimit(mapped, count)
  }

  const ids = await fetchQuestionIdsForSource(supabase, userId, examenId, source)
  if (ids.length === 0) return []

  const { data, error } = await supabase
    .from("intrebari")
    .select("*")
    .eq("examen_id", examenId)
    .in("id", ids)

  if (error) throw new Error(error.message)
  const mapped = ((data ?? []) as IntrebareRow[])
    .map(mapIntrebareRowToQuestion)
    .filter((item): item is QuizQuestion => Boolean(item && item.text))
  return shuffleInPlaceAndLimit(mapped, count)
}

function isValidId(value: unknown): value is number {
  const n = Number(value)
  return Number.isFinite(n) && n > 0
}

function mapExamSummary(row: {
  id: unknown
  nume_examen?: unknown
  prag_trecere?: unknown
  intrebari_simulare?: unknown
  variante_raspuns?: unknown
  durata_minute?: unknown
  timp_alocat_minute?: unknown
}): ExamSummary | null {
  const id = Number(row.id)
  if (!Number.isFinite(id) || id <= 0) return null
  const fallbackDuration = Number(row.timp_alocat_minute)
  const durata = Number(row.durata_minute)
  return {
    id,
    name: String(row.nume_examen ?? `Examen ${id}`),
    pragTrecere: Number(row.prag_trecere) > 0 ? Number(row.prag_trecere) : 18,
    intrebariSimulare: Number(row.intrebari_simulare) > 0 ? Number(row.intrebari_simulare) : 25,
    varianteRaspuns: Number(row.variante_raspuns) > 0 ? Number(row.variante_raspuns) : 3,
    durataMinute: Number.isFinite(durata) && durata > 0
      ? durata
      : Number.isFinite(fallbackDuration) && fallbackDuration > 0
        ? fallbackDuration
        : 30,
  }
}

export async function fetchAccessibleExams(
  supabase: SupabaseClient,
  userId: string
): Promise<ExamSummary[]> {
  if (!userId) return []

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, org_id")
    .eq("id", userId)
    .maybeSingle()

  if (profileError) throw new Error(profileError.message)
  const role = normalizeRole(profile?.role)
  const orgId = profile?.org_id ? String(profile.org_id) : null

  const selectColumns =
    "id, nume_examen, prag_trecere, intrebari_simulare, variante_raspuns, durata_minute, timp_alocat_minute, org_id"

  const orderById = { ascending: true } as const

  const safeMap = (rows: Array<Record<string, unknown>>): ExamSummary[] =>
    rows
      .map((row) => mapExamSummary(row as Parameters<typeof mapExamSummary>[0]))
      .filter((value): value is ExamSummary => value !== null)
      // Deduplicate just in case the same exam appears twice via JOIN/in().
      .reduce<ExamSummary[]>((acc, current) => {
        if (!acc.some((exam) => exam.id === current.id)) acc.push(current)
        return acc
      }, [])
      .sort((a, b) => a.id - b.id)

  if (isSuperAdminRole(role)) {
    const { data, error } = await supabase
      .from("examene")
      .select(selectColumns)
      .order("id", orderById)
    if (error) throw new Error(error.message)
    return safeMap(((data ?? []) as Array<Record<string, unknown>>))
  }

  if (isAdminRole(role)) {
    let query = supabase.from("examene").select(selectColumns).order("id", orderById)
    if (orgId) query = query.eq("org_id", orgId)
    const { data, error } = await query
    if (error) throw new Error(error.message)
    return safeMap(((data ?? []) as Array<Record<string, unknown>>))
  }

  // Regular user — restricted to non-expired entries from `acces_examene`.
  const nowIso = new Date().toISOString()
  const { data: accessRows, error: accessError } = await supabase
    .from("acces_examene")
    .select("examen_id")
    .eq("user_id", userId)
    .gt("data_expirare", nowIso)

  if (accessError) throw new Error(accessError.message)
  const accessIds = [
    ...new Set((accessRows ?? []).map((row) => Number(row.examen_id)).filter(isValidId)),
  ]
  if (accessIds.length === 0) return []

  const { data, error } = await supabase
    .from("examene")
    .select(selectColumns)
    .in("id", accessIds)
    .order("id", orderById)

  if (error) throw new Error(error.message)
  return safeMap(((data ?? []) as Array<Record<string, unknown>>))
}

export async function fetchDistinctExamIds(
  supabase: SupabaseClient,
  userId: string
): Promise<number[]> {
  const exams = await fetchAccessibleExams(supabase, userId)
  return exams.map((exam) => exam.id)
}

export async function toggleBookmarkForQuestion(
  supabase: SupabaseClient,
  params: { userId: string; examenId: number; intrebareId: string; shouldBookmark: boolean }
) {
  const { userId, examenId, intrebareId, shouldBookmark } = params
  if (!userId || !isValidExamId(examenId) || !intrebareId) return
  if (shouldBookmark) {
    const { error } = await supabase.from("bookmarks").upsert(
      {
        user_id: userId,
        examen_id: examenId,
        intrebare_id: intrebareId,
      },
      { onConflict: "user_id,intrebare_id,examen_id" }
    )
    if (error) throw new Error(error.message)
    return
  }

  const { error } = await supabase
    .from("bookmarks")
    .delete()
    .eq("user_id", userId)
    .eq("examen_id", examenId)
    .eq("intrebare_id", intrebareId)
  if (error) throw new Error(error.message)
}

export async function recordAnswerHistory(
  supabase: SupabaseClient,
  params: {
    userId: string
    examenId: number
    intrebareId: string
    isCorrect: boolean
    mode: "simulation" | "practice"
  }
) {
  const { userId, examenId, intrebareId, isCorrect, mode } = params
  if (!userId || !isValidExamId(examenId) || !intrebareId) return
  const intrebareIdNum = Number(intrebareId)
  if (!Number.isFinite(intrebareIdNum) || intrebareIdNum <= 0) return

  // We append a row per attempt rather than upserting so the table doubles as
  // a time series. Statistics derive "last attempt" with DISTINCT ON / window
  // functions on (user_id, intrebare_id) ordered by data_raspuns DESC.
  const { error } = await supabase.from("istoric_raspunsuri").insert({
    user_id: userId,
    examen_id: examenId,
    intrebare_id: intrebareIdNum,
    corect: isCorrect,
    mod: mode === "simulation" ? "simulare" : "practica",
  })
  if (error) throw new Error(error.message)
}

export async function recordSimulationSession(
  supabase: SupabaseClient,
  params: {
    userId: string
    examenId: number
    startedAt: Date
    finishedAt: Date
    correctCount: number
    totalQuestions: number
    timedOut: boolean
  }
) {
  const { userId, examenId, startedAt, finishedAt, correctCount, totalQuestions, timedOut } = params
  if (!userId || !isValidExamId(examenId)) return

  const safeTotal = Math.max(0, totalQuestions)
  const safeCorrect = Math.max(0, Math.min(correctCount, safeTotal))
  const durataSec = Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000))
  const scorProcent = safeTotal > 0 ? Math.round((safeCorrect / safeTotal) * 10000) / 100 : 0

  const { error } = await supabase.from("sesiuni_simulare").insert({
    user_id: userId,
    examen_id: examenId,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    durata_secunde: durataSec,
    raspunsuri_corecte: safeCorrect,
    total_intrebari: safeTotal,
    scor_procent: scorProcent,
    finalizat: true,
    timed_out: timedOut,
  })
  if (error) throw new Error(error.message)
}

export async function recordPracticeSession(
  supabase: SupabaseClient,
  params: {
    userId: string
    examenId: number
    startedAt: Date
    finishedAt: Date
    correctCount: number
    totalQuestions: number
  }
) {
  const { userId, examenId, startedAt, finishedAt, correctCount, totalQuestions } = params
  if (!userId || !isValidExamId(examenId)) return

  const safeTotal = Math.max(0, totalQuestions)
  const safeCorrect = Math.max(0, Math.min(correctCount, safeTotal))
  const durataSec = Math.max(0, Math.round((finishedAt.getTime() - startedAt.getTime()) / 1000))

  const { error } = await supabase.from("sesiuni_practica").insert({
    user_id: userId,
    examen_id: examenId,
    started_at: startedAt.toISOString(),
    finished_at: finishedAt.toISOString(),
    durata_secunde: durataSec,
    raspunsuri_corecte: safeCorrect,
    total_intrebari: safeTotal,
    finalizat: true,
  })
  if (error) throw new Error(error.message)
}

export async function updateLearningStatus(
  supabase: SupabaseClient,
  params: { userId: string; examenId: number; intrebareId: string; isCorrect: boolean }
) {
  const { userId, examenId, intrebareId, isCorrect } = params
  if (!userId || !isValidExamId(examenId) || !intrebareId) return

  if (!isCorrect) {
    // Keep only wrong answers in the "wrong questions" pool.
    const { error } = await supabase.from("status_invatare").upsert(
      {
        user_id: userId,
        examen_id: examenId,
        intrebare_id: intrebareId,
        este_gresita: true,
        raspunsuri_corecte_consecutive: 0,
      },
      { onConflict: "user_id,intrebare_id,examen_id" }
    )
    if (error) throw new Error(error.message)
    return
  }

  // A correct answer means the user has learned the question:
  // remove it from the wrong pool if it exists.
  const { error } = await supabase
    .from("status_invatare")
    .delete()
    .eq("user_id", userId)
    .eq("examen_id", examenId)
    .eq("intrebare_id", intrebareId)

  if (error) throw new Error(error.message)
}

/**
 * Încarcă întrebări din `intrebari`, amestecă aleatoriu și returnează până la `count`.
 * Pentru tabele foarte mari, preferă un RPC SQL `ORDER BY random() LIMIT n`.
 */
export async function fetchRandomIntrebari(
  supabase: SupabaseClient,
  count = 20
): Promise<QuizQuestion[]> {
  console.log("Incep fetch-ul...")
  console.log("URL găsit:", Boolean(process.env.NEXT_PUBLIC_SUPABASE_URL))
  console.log("Cheie ANON găsită:", Boolean(process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY))

  const { data, error } = await supabase
    .from("intrebari")
    .select("*")
    .eq("examen_id", 1)

  if (error) {
    console.error("Eroare Supabase:", error.message)
    throw new Error(error.message)
  }

  if (!data || data.length === 0) {
    return []
  }

  const rows = data as IntrebareRow[]
  const questions: QuizQuestion[] = []

  for (const row of rows) {
    const q = mapIntrebareRowToQuestion(row)
    if (q && q.text) questions.push(q)
  }

  return shuffleInPlaceAndLimit(questions, count)
}
