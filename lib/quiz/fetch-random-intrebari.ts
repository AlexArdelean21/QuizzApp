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

export async function fetchDistinctExamIds(
  supabase: SupabaseClient,
  userId: string
): Promise<number[]> {
  const normalizeExamIds = (rows: Array<{ id?: unknown; examen_id?: unknown }>) =>
    rows
      .map((row) => Number(row.id ?? row.examen_id))
      .filter((id) => Number.isFinite(id) && id > 0)

  const fetchAllExamIds = async () => {
    const { data: examRows, error: examError } = await supabase
      .from("examene")
      .select("id")
      .order("id", { ascending: true })

    if (!examError) {
      const ids = normalizeExamIds((examRows ?? []) as Array<{ id?: unknown }>)
      if (ids.length === 0) {
        console.error(
          "Exam fetch returned empty. Check RLS policies on 'examene' and 'acces_examene' tables."
        )
      }
      return ids
    }

    // Fallback when `examene` is blocked by RLS for clients.
    const { data: questionRows, error: questionError } = await supabase
      .from("intrebari")
      .select("examen_id")

    if (questionError) throw new Error(examError.message)
    return [...new Set(normalizeExamIds((questionRows ?? []) as Array<{ examen_id?: unknown }>))]
      .sort((a, b) => a - b)
  }

  const fetchExamIdsFromAllowed = async (allowedIds: number[]) => {
    if (allowedIds.length === 0) return []
    const { data: examRows, error: examError } = await supabase
      .from("examene")
      .select("id")
      .in("id", allowedIds)
      .order("id", { ascending: true })

    if (!examError) {
      const ids = normalizeExamIds((examRows ?? []) as Array<{ id?: unknown }>)
      if (ids.length === 0) {
        console.error(
          "Exam fetch returned empty. Check RLS policies on 'examene' and 'acces_examene' tables."
        )
      }
      return ids
    }

    // Fallback when `examene` is blocked by RLS for clients.
    const { data: questionRows, error: questionError } = await supabase
      .from("intrebari")
      .select("examen_id")
      .in("examen_id", allowedIds)

    if (questionError) throw new Error(examError.message)
    return [...new Set(normalizeExamIds((questionRows ?? []) as Array<{ examen_id?: unknown }>))]
      .sort((a, b) => a - b)
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle()

  if (profileError) throw new Error(profileError.message)
  const normalizedRole = String(profile?.role ?? "")
    .trim()
    .toLowerCase()

  if (normalizedRole === "admin") {
    return fetchAllExamIds()
  }

  if (normalizedRole !== "user") {
    return []
  }

  const nowIso = new Date().toISOString()
  const { data: accessRows, error: accessError } = await supabase
    .from("acces_examene")
    .select("examen_id")
    .eq("user_id", userId)
    .gt("data_expirare", nowIso)

  if (accessError) throw new Error(accessError.message)

  const accessIds = [...new Set((accessRows ?? []).map((row) => Number(row.examen_id)))]
    .filter((id) => Number.isFinite(id) && id > 0)

  if (accessIds.length === 0) {
    return []
  }

  return fetchExamIdsFromAllowed(accessIds)
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

export async function updateLearningStatus(
  supabase: SupabaseClient,
  params: { userId: string; examenId: number; intrebareId: string; isCorrect: boolean }
) {
  const { userId, examenId, intrebareId, isCorrect } = params
  if (!userId || !isValidExamId(examenId) || !intrebareId) return

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
