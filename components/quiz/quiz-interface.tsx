"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { fetchRandomIntrebari } from "@/lib/quiz/fetch-random-intrebari"
import type { QuizQuestion } from "@/lib/quiz/types"
import { QuizHeader } from "./quiz-header"
import { QuestionCard } from "./question-card"
import { AnswerOptions } from "./answer-options"
import { QuizNavigation } from "./quiz-navigation"
import { QuizResults } from "./quiz-results"

const QUIZ_DURATION_SEC = 30 * 60
const QUESTION_COUNT = 20
const EXAM_NAME = "Examen"

type QuizStatus = "loading" | "quiz" | "results" | "error"

type ResultStats = {
  correct: number
  total: number
  elapsedMs: number
  timedOut: boolean
}

function formatClock(seconds: number) {
  const mins = Math.floor(seconds / 60)
  const secs = seconds % 60
  return `${mins.toString().padStart(2, "0")}:${secs.toString().padStart(2, "0")}`
}

function formatElapsed(ms: number) {
  const totalSec = Math.floor(ms / 1000)
  const m = Math.floor(totalSec / 60)
  const s = totalSec % 60
  return `${m}m ${s.toString().padStart(2, "0")}s`
}

export function QuizInterface() {
  const [status, setStatus] = useState<QuizStatus>("loading")
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Set<string>>(
    () => new Set()
  )
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeRemaining, setTimeRemaining] = useState(QUIZ_DURATION_SEC)
  const [resultStats, setResultStats] = useState<ResultStats | null>(null)

  const questionsRef = useRef(questions)
  const answersRef = useRef(answers)
  const startedAtRef = useRef<number>(0)
  const finishedRef = useRef(false)

  questionsRef.current = questions
  answersRef.current = answers

  const finalizeQuiz = useCallback((opts: { timedOut: boolean }) => {
    if (finishedRef.current) return
    finishedRef.current = true

    const qs = questionsRef.current
    const ans = answersRef.current
    const correct = qs.reduce(
      (acc, q) => acc + (ans[q.id] === q.correctAnswer ? 1 : 0),
      0
    )
    const elapsedMs = Date.now() - startedAtRef.current

    setResultStats({
      correct,
      total: qs.length,
      elapsedMs,
      timedOut: opts.timedOut,
    })
    setStatus("results")
  }, [])

  const loadQuiz = useCallback(async () => {
    finishedRef.current = false
    setErrorMessage(null)
    setStatus("loading")
    setResultStats(null)
    setQuestions([])
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setBookmarkedQuestions(new Set())
    setAnswers({})
    setTimeRemaining(QUIZ_DURATION_SEC)

    try {
      const supabase = getSupabaseBrowserClient()
      const qs = await fetchRandomIntrebari(supabase, QUESTION_COUNT)

      if (qs.length === 0) {
        setErrorMessage("Nu s-au găsit întrebări în tabel")
        setStatus("error")
        return
      }

      setQuestions(qs)
      startedAtRef.current = Date.now()
      setStatus("quiz")
    } catch (e) {
      setErrorMessage(
        e instanceof Error ? e.message : "Nu s-au putut încărca întrebările."
      )
      setStatus("error")
    }
  }, [])

  useEffect(() => {
    void loadQuiz()
  }, [loadQuiz])

  useEffect(() => {
    if (status !== "quiz") return

    const id = window.setInterval(() => {
      setTimeRemaining((prev) => (prev <= 0 ? 0 : prev - 1))
    }, 1000)

    return () => window.clearInterval(id)
  }, [status])

  useEffect(() => {
    if (status !== "quiz") return
    if (timeRemaining > 0) return
    finalizeQuiz({ timedOut: true })
  }, [status, timeRemaining, finalizeQuiz])

  const currentQuestion = questions[currentIndex]
  const totalQuestions = questions.length
  const isLastQuestion =
    totalQuestions > 0 && currentIndex === totalQuestions - 1

  useEffect(() => {
    if (!currentQuestion) {
      setSelectedAnswer(null)
      return
    }
    setSelectedAnswer(answers[currentQuestion.id] ?? null)
  }, [currentIndex, currentQuestion, answers])

  const handleSelectAnswer = (answerId: string) => {
    if (!currentQuestion || status !== "quiz") return
    setSelectedAnswer(answerId)
    setAnswers((prev) => ({
      ...prev,
      [currentQuestion.id]: answerId,
    }))
  }

  const handleToggleBookmark = () => {
    if (!currentQuestion) return
    setBookmarkedQuestions((prev) => {
      const next = new Set(prev)
      if (next.has(currentQuestion.id)) next.delete(currentQuestion.id)
      else next.add(currentQuestion.id)
      return next
    })
  }

  const handleNext = () => {
    if (!currentQuestion || status !== "quiz") return
    if (isLastQuestion) {
      finalizeQuiz({ timedOut: false })
    } else {
      setCurrentIndex((i) => i + 1)
    }
  }

  if (status === "loading") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-3 bg-background px-4">
        <div className="size-10 animate-pulse rounded-full bg-primary/25" />
        <p className="text-sm text-muted-foreground">Se încarcă întrebările…</p>
      </div>
    )
  }

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="max-w-md text-center text-sm text-destructive">
          {errorMessage}
        </p>
        <button
          type="button"
          onClick={() => void loadQuiz()}
          className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90"
        >
          Încearcă din nou
        </button>
      </div>
    )
  }

  if (status === "results" && resultStats) {
    return (
      <QuizResults
        correctCount={resultStats.correct}
        totalQuestions={resultStats.total}
        elapsedLabel={formatElapsed(resultStats.elapsedMs)}
        finishedByTimeout={resultStats.timedOut}
        onRestart={() => void loadQuiz()}
      />
    )
  }

  if (!currentQuestion) {
    return null
  }

  return (
    <div className="min-h-screen bg-background">
      <QuizHeader
        examName={EXAM_NAME}
        currentQuestion={currentIndex + 1}
        totalQuestions={totalQuestions}
        timeRemaining={formatClock(timeRemaining)}
      />

      <main className="container mx-auto max-w-3xl px-4 py-8 md:py-12">
        <div
          key={currentQuestion.id}
          className="flex flex-col gap-8 quiz-question-animate"
        >
          <QuestionCard
            questionNumber={currentIndex + 1}
            questionText={currentQuestion.text}
            isBookmarked={bookmarkedQuestions.has(currentQuestion.id)}
            onToggleBookmark={handleToggleBookmark}
          />

          <AnswerOptions
            options={currentQuestion.options}
            selectedAnswer={selectedAnswer}
            onSelectAnswer={handleSelectAnswer}
          />

          <QuizNavigation
            onNext={handleNext}
            isLastQuestion={isLastQuestion}
            hasSelectedAnswer={selectedAnswer !== null}
          />
        </div>
      </main>
    </div>
  )
}
