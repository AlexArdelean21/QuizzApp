"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { fetchRandomIntrebari } from "@/lib/quiz/fetch-random-intrebari"
import type { QuizQuestion } from "@/lib/quiz/types"
import { QuizHeader } from "./quiz-header"
import { QuestionCard } from "./question-card"
import { AnswerOptions } from "./answer-options"
import { QuizNavigation } from "./quiz-navigation"
import { QuizResults } from "./quiz-results"

const QUIZ_DURATION_SEC = 30 * 60
const DEFAULT_QUESTION_COUNT = 25
const MIN_PRACTICE_QUESTIONS = 10
const MAX_PRACTICE_QUESTIONS = 100
const SIMULATION_PASS_THRESHOLD = 18
const EXAM_NAME = "Examen"

type QuizMode = "simulation" | "practice"
type QuizStatus = "setup" | "loading" | "quiz" | "results" | "error"

type ResultStats = {
  mode: QuizMode
  correct: number
  wrong: number
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
  const router = useRouter()
  const [status, setStatus] = useState<QuizStatus>("setup")
  const [mode, setMode] = useState<QuizMode>("simulation")
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT)
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
  const modeRef = useRef(mode)
  const startedAtRef = useRef<number>(0)
  const finishedRef = useRef(false)

  questionsRef.current = questions
  answersRef.current = answers
  modeRef.current = mode

  const finalizeQuiz = useCallback((opts: { timedOut: boolean }) => {
    if (finishedRef.current) return
    finishedRef.current = true

    const qs = questionsRef.current
    const ans = answersRef.current
    const currentMode = modeRef.current
    const correct = qs.reduce(
      (acc, q) => acc + (ans[q.id] === q.correctAnswer ? 1 : 0),
      0
    )
    const wrong = Math.max(0, qs.length - correct)
    const elapsedMs = Date.now() - startedAtRef.current

    setResultStats({
      mode: currentMode,
      correct,
      wrong,
      total: qs.length,
      elapsedMs,
      timedOut: opts.timedOut,
    })
    setStatus("results")
  }, [])

  const loadQuiz = useCallback(async (selectedMode: QuizMode, selectedCount: number) => {
    finishedRef.current = false
    modeRef.current = selectedMode
    setMode(selectedMode)
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
      const qs = await fetchRandomIntrebari(supabase, selectedCount)

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
  const isPracticeMode = mode === "practice"
  const hasAnsweredCurrent = selectedAnswer !== null

  useEffect(() => {
    if (!currentQuestion) {
      setSelectedAnswer(null)
      return
    }
    setSelectedAnswer(answers[currentQuestion.id] ?? null)
  }, [currentIndex, currentQuestion, answers])

  const handleSelectAnswer = (answerId: string) => {
    if (!currentQuestion || status !== "quiz") return
    if (isPracticeMode && selectedAnswer) return
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

  const handleStartQuiz = () => {
    const targetCount =
      mode === "simulation"
        ? DEFAULT_QUESTION_COUNT
        : Math.min(MAX_PRACTICE_QUESTIONS, Math.max(MIN_PRACTICE_QUESTIONS, questionCount))
    void loadQuiz(mode, targetCount)
  }

  const handleLogout = async () => {
    try {
      const supabase = getSupabaseBrowserClient()
      await supabase.auth.signOut()
    } finally {
      router.replace("/login")
      router.refresh()
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
          onClick={handleStartQuiz}
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
        mode={resultStats.mode}
        correctCount={resultStats.correct}
        totalQuestions={resultStats.total}
        passThreshold={SIMULATION_PASS_THRESHOLD}
        elapsedLabel={formatElapsed(resultStats.elapsedMs)}
        finishedByTimeout={resultStats.timedOut}
        onRestart={() => setStatus("setup")}
      />
    )
  }

  if (status === "setup") {
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 md:py-16 lg:px-8 lg:py-20">
          <Card className="w-full border-2 border-border/90 bg-card shadow-xl shadow-primary/10 ring-1 ring-primary/15 quiz-question-animate">
            <CardHeader className="pb-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
                Setup
              </p>
              <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
                Alege modul de quiz
              </h1>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 pt-2">
              <div className="grid gap-4 md:grid-cols-2">
                <button
                  type="button"
                  onClick={() => setMode("simulation")}
                  className={`rounded-xl border-2 p-5 text-left transition ${
                    mode === "simulation"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/30 hover:border-primary/40"
                  }`}
                >
                  <p className="text-lg font-semibold text-foreground">Simulare Examen</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    25 întrebări fixe, prag de trecere 18, fără feedback imediat.
                  </p>
                </button>
                <button
                  type="button"
                  onClick={() => setMode("practice")}
                  className={`rounded-xl border-2 p-5 text-left transition ${
                    mode === "practice"
                      ? "border-primary bg-primary/10"
                      : "border-border bg-secondary/30 hover:border-primary/40"
                  }`}
                >
                  <p className="text-lg font-semibold text-foreground">Mod Practică</p>
                  <p className="mt-2 text-sm text-muted-foreground">
                    Număr întrebări configurabil, feedback imediat la fiecare răspuns.
                  </p>
                </button>
              </div>

              {mode === "practice" && (
                <div className="rounded-xl border border-border bg-secondary/30 p-5">
                  <div className="flex items-center justify-between gap-3">
                    <label htmlFor="question-count" className="text-sm font-medium text-foreground">
                      Număr întrebări
                    </label>
                    <input
                      id="question-count"
                      type="number"
                      min={MIN_PRACTICE_QUESTIONS}
                      max={MAX_PRACTICE_QUESTIONS}
                      value={questionCount}
                      onChange={(e) =>
                        setQuestionCount(
                          Number.isNaN(Number(e.target.value))
                            ? DEFAULT_QUESTION_COUNT
                            : Number(e.target.value)
                        )
                      }
                      className="w-20 rounded-lg border border-border bg-card px-3 py-1.5 text-right text-sm text-foreground"
                    />
                  </div>
                  <input
                    type="range"
                    min={MIN_PRACTICE_QUESTIONS}
                    max={MAX_PRACTICE_QUESTIONS}
                    value={questionCount}
                    onChange={(e) => setQuestionCount(Number(e.target.value))}
                    className="mt-4 w-full accent-primary"
                  />
                  <p className="mt-2 text-xs text-muted-foreground">
                    Interval permis: {MIN_PRACTICE_QUESTIONS} - {MAX_PRACTICE_QUESTIONS}
                  </p>
                </div>
              )}

              <Button
                type="button"
                onClick={handleStartQuiz}
                className="w-full rounded-xl bg-white px-8 py-6 text-base font-medium text-black shadow-sm hover:bg-white/90"
              >
                Începe quiz-ul
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
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
        onLogout={handleLogout}
      />

      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 md:py-16 lg:px-8 lg:py-20">
        <div
          key={currentQuestion.id}
          className="flex w-full flex-col gap-8 md:gap-10 quiz-question-animate"
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
            correctAnswer={currentQuestion.correctAnswer}
            showImmediateFeedback={isPracticeMode && hasAnsweredCurrent}
            isLocked={isPracticeMode && hasAnsweredCurrent}
            onSelectAnswer={handleSelectAnswer}
          />

          {isPracticeMode && hasAnsweredCurrent && (
            <p className="text-sm font-medium text-muted-foreground">
              {selectedAnswer === currentQuestion.correctAnswer
                ? "Corect! Poți trece la următoarea întrebare."
                : `Răspuns greșit. Varianta corectă este ${currentQuestion.correctAnswer.toUpperCase()}.`}
            </p>
          )}

          {(mode === "simulation" || hasAnsweredCurrent) && (
            <QuizNavigation
              onNext={handleNext}
              isLastQuestion={isLastQuestion}
              hasSelectedAnswer={selectedAnswer !== null}
            />
          )}
        </div>
      </main>
    </div>
  )
}
