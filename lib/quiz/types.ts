export type AnswerId = "a" | "b" | "c"

export type QuizOption = {
  id: AnswerId
  label: string
  text: string
}

export type QuizQuestion = {
  id: string
  examenId: number
  text: string
  options: QuizOption[]
  correctAnswer: AnswerId
}

/** Rând din tabelul `intrebari` (coloane ca în import CSV). */
export type IntrebareRow = {
  id: string | number
  examen_id?: number | null
  intrebare_text: string
  varianta_a: string
  varianta_b: string
  varianta_c: string
  raspuns_corect: string
}

export type PracticeSource = "all" | "bookmarked" | "wrong"

export type ExamSummary = {
  id: number
  name: string
  pragTrecere: number
  intrebariSimulare: number
  varianteRaspuns: number
  durataMinute: number
}
