import type { SupabaseClient } from "@supabase/supabase-js"
import type { IntrebareRow, QuizQuestion, AnswerId } from "./types"

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

  return {
    id: String(row.id),
    text: String(row.intrebare_text ?? "").trim(),
    correctAnswer: correct,
    options: [
      { id: "a", label: "A", text: String(row.varianta_a ?? "").trim() },
      { id: "b", label: "B", text: String(row.varianta_b ?? "").trim() },
      { id: "c", label: "C", text: String(row.varianta_c ?? "").trim() },
    ],
  }
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

  shuffleInPlace(questions)
  return questions.slice(0, Math.min(count, questions.length))
}
