import type { SupabaseClient } from "@supabase/supabase-js"
import type { IntrebareRow, QuizQuestion, AnswerId, PracticeSource } from "./types"

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

async function fetchQuestionIdsForSource(
  supabase: SupabaseClient,
  userId: string,
  examenId: number,
  source: PracticeSource
): Promise<string[]> {
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

export async function fetchDistinctExamIds(supabase: SupabaseClient): Promise<number[]> {
  const { data, error } = await supabase.from("intrebari").select("examen_id")
  if (error) throw new Error(error.message)
  const distinct = new Set<number>()
  for (const row of data ?? []) {
    const examenId = Number(row.examen_id ?? 0)
    if (Number.isFinite(examenId) && examenId > 0) {
      distinct.add(examenId)
    }
  }
  return [...distinct].sort((a, b) => a - b)
}

export async function toggleBookmarkForQuestion(
  supabase: SupabaseClient,
  params: { userId: string; examenId: number; intrebareId: string; shouldBookmark: boolean }
) {
  const { userId, examenId, intrebareId, shouldBookmark } = params
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

export async function updateLearningStatus(
  supabase: SupabaseClient,
  params: { userId: string; examenId: number; intrebareId: string; isCorrect: boolean }
) {
  const { userId, examenId, intrebareId, isCorrect } = params

  const { data: existing, error: readError } = await supabase
    .from("status_invatare")
    .select("raspunsuri_corecte_consecutive")
    .eq("user_id", userId)
    .eq("examen_id", examenId)
    .eq("intrebare_id", intrebareId)
    .maybeSingle()

  if (readError) throw new Error(readError.message)

  if (!isCorrect) {
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

  const current = Number(existing?.raspunsuri_corecte_consecutive ?? 0)
  const nextConsecutive = current + 1
  const { error } = await supabase.from("status_invatare").upsert(
    {
      user_id: userId,
      examen_id: examenId,
      intrebare_id: intrebareId,
      este_gresita: nextConsecutive < 2,
      raspunsuri_corecte_consecutive: nextConsecutive,
    },
    { onConflict: "user_id,intrebare_id,examen_id" }
  )
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
