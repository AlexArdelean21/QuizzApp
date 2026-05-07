"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import {
  fetchDistinctExamIds,
  fetchQuestionsBySource,
  getAvailableQuestionCount,
  toggleBookmarkForQuestion,
  updateLearningStatus,
} from "@/lib/quiz/fetch-random-intrebari"
import type { PracticeSource, QuizQuestion } from "@/lib/quiz/types"
import { QuizHeader } from "./quiz-header"
import { QuestionCard } from "./question-card"
import { AnswerOptions } from "./answer-options"
import { QuizNavigation } from "./quiz-navigation"
import { QuizResults } from "./quiz-results"

const QUIZ_DURATION_SEC = 30 * 60
const DEFAULT_QUESTION_COUNT = 25
const MIN_PRACTICE_QUESTIONS = 5
const MAX_PRACTICE_QUESTIONS = 100
const SIMULATION_PASS_THRESHOLD = 18

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
  const supabase = getSupabaseBrowserClient()
  const [status, setStatus] = useState<QuizStatus>("setup")
  const [mode, setMode] = useState<QuizMode>("simulation")
  const [practiceSource, setPracticeSource] = useState<PracticeSource>("all")
  const [selectedExamId, setSelectedExamId] = useState(1)
  const [examOptions, setExamOptions] = useState<number[]>([1])
  const [availablePracticeCount, setAvailablePracticeCount] = useState(0)
  const [questionCount, setQuestionCount] = useState(DEFAULT_QUESTION_COUNT)
  const [isAvailabilityLoading, setIsAvailabilityLoading] = useState(false)
  const [availabilityMessage, setAvailabilityMessage] = useState<string | null>(null)
  const [userId, setUserId] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [questions, setQuestions] = useState<QuizQuestion[]>([])
  const [currentIndex, setCurrentIndex] = useState(0)
  const [selectedAnswer, setSelectedAnswer] = useState<string | null>(null)
  const [bookmarkedQuestions, setBookmarkedQuestions] = useState<Set<string>>(() => new Set())
  const [answers, setAnswers] = useState<Record<string, string>>({})
  const [timeRemaining, setTimeRemaining] = useState(QUIZ_DURATION_SEC)
  const [resultStats, setResultStats] = useState<ResultStats | null>(null)
  const [isExitModalOpen, setIsExitModalOpen] = useState(false)

  const questionsRef = useRef(questions)
  const answersRef = useRef(answers)
  const modeRef = useRef(mode)
  const startedAtRef = useRef<number>(0)
  const finishedRef = useRef(false)

  questionsRef.current = questions
  answersRef.current = answers
  modeRef.current = mode

  const isPracticeMode = mode === "practice"
  const hasAnsweredCurrent = selectedAnswer !== null
  const sourceLabelMap: Record<PracticeSource, string> = {
    all: "toate",
    bookmarked: "salvate",
    wrong: "greșite anterior",
  }

  const finalizeQuiz = useCallback((opts: { timedOut: boolean }) => {
    if (finishedRef.current) return
    finishedRef.current = true
    const qs = questionsRef.current
    const ans = answersRef.current
    const currentMode = modeRef.current
    const correct = qs.reduce((acc, q) => acc + (ans[q.id] === q.correctAnswer ? 1 : 0), 0)
    const wrong = Math.max(0, qs.length - correct)
    const elapsedMs = Date.now() - startedAtRef.current
    setResultStats({ mode: currentMode, correct, wrong, total: qs.length, elapsedMs, timedOut: opts.timedOut })
    setStatus("results")
  }, [])

  const refreshAvailablePracticeCount = useCallback(async (nextSource: PracticeSource, nextExamId: number, nextUserId: string | null) => {
    if (!nextUserId) {
      setAvailablePracticeCount(0)
      setAvailabilityMessage("Nu ai sesiune activă.")
      return
    }
    setIsAvailabilityLoading(true)
    try {
      const count = await getAvailableQuestionCount(supabase, { examenId: nextExamId, source: nextSource, userId: nextUserId })
      setAvailablePracticeCount(count)
      setAvailabilityMessage(count === 0 ? `Nu ai întrebări ${sourceLabelMap[nextSource]} în acest pool` : null)
    } catch (e) {
      setAvailabilityMessage(e instanceof Error ? e.message : "Nu s-a putut calcula numărul de întrebări.")
    } finally {
      setIsAvailabilityLoading(false)
    }
  }, [supabase])

  useEffect(() => {
    const bootstrap = async () => {
      const [{ data: userData }, examIds] = await Promise.all([supabase.auth.getUser(), fetchDistinctExamIds(supabase)])
      const activeUserId = userData.user?.id ?? null
      setUserId(activeUserId)
      const normalizedExams = examIds.length > 0 ? examIds : [1]
      setExamOptions(normalizedExams)
      setSelectedExamId(normalizedExams[0])
      await refreshAvailablePracticeCount(practiceSource, normalizedExams[0], activeUserId)
    }
    void bootstrap()
  }, [supabase, refreshAvailablePracticeCount, practiceSource])

  useEffect(() => {
    if (!isPracticeMode) return
    void refreshAvailablePracticeCount(practiceSource, selectedExamId, userId)
  }, [isPracticeMode, practiceSource, selectedExamId, userId, refreshAvailablePracticeCount])

  useEffect(() => {
    if (!isPracticeMode) return
    const dynamicMax = Math.max(0, Math.min(MAX_PRACTICE_QUESTIONS, availablePracticeCount))
    if (dynamicMax === 0) return setQuestionCount(0)
    const fallback = Math.min(dynamicMax, MIN_PRACTICE_QUESTIONS)
    setQuestionCount((prev) => (prev <= 0 ? fallback : Math.min(prev, dynamicMax)))
  }, [isPracticeMode, availablePracticeCount])

  const loadQuiz = useCallback(async (selectedMode: QuizMode, selectedCount: number, examenId: number, source: PracticeSource, currentUserId: string | null) => {
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
      const qs = await fetchQuestionsBySource(supabase, { count: selectedCount, examenId, source: selectedMode === "practice" ? source : "all", userId: currentUserId ?? "" })
      if (qs.length === 0) {
        setErrorMessage(selectedMode === "practice" ? "Nu există întrebări disponibile pentru filtrul selectat." : "Nu s-au găsit întrebări în tabel")
        setStatus("error")
        return
      }
      if (currentUserId) {
        const ids = qs.map((q) => q.id)
        const { data: bookmarkRows } = await supabase.from("bookmarks").select("intrebare_id").eq("user_id", currentUserId).eq("examen_id", examenId).in("intrebare_id", ids)
        setBookmarkedQuestions(new Set((bookmarkRows ?? []).map((item) => String(item.intrebare_id))))
      }
      setQuestions(qs)
      startedAtRef.current = Date.now()
      setStatus("quiz")
    } catch (e) {
      setErrorMessage(e instanceof Error ? e.message : "Nu s-au putut încărca întrebările.")
      setStatus("error")
    }
  }, [supabase])

  useEffect(() => {
    if (status !== "quiz") return
    const id = window.setInterval(() => setTimeRemaining((prev) => (prev <= 0 ? 0 : prev - 1)), 1000)
    return () => window.clearInterval(id)
  }, [status])

  useEffect(() => {
    if (status !== "quiz" || timeRemaining > 0) return
    finalizeQuiz({ timedOut: true })
  }, [status, timeRemaining, finalizeQuiz])

  const currentQuestion = questions[currentIndex]
  const totalQuestions = questions.length
  const isLastQuestion = totalQuestions > 0 && currentIndex === totalQuestions - 1

  useEffect(() => {
    if (!currentQuestion) return setSelectedAnswer(null)
    setSelectedAnswer(answers[currentQuestion.id] ?? null)
  }, [currentIndex, currentQuestion, answers])

  const handleSelectAnswer = (answerId: string) => {
    if (!currentQuestion || status !== "quiz") return
    if (isPracticeMode && selectedAnswer) return
    setSelectedAnswer(answerId)
    setAnswers((prev) => ({ ...prev, [currentQuestion.id]: answerId }))
    if (userId) {
      void updateLearningStatus(supabase, { userId, examenId: selectedExamId, intrebareId: currentQuestion.id, isCorrect: answerId === currentQuestion.correctAnswer })
    }
  }

  const handleToggleBookmark = () => {
    if (!currentQuestion || !userId) return
    const shouldBookmark = !bookmarkedQuestions.has(currentQuestion.id)
    setBookmarkedQuestions((prev) => {
      const next = new Set(prev)
      if (shouldBookmark) next.add(currentQuestion.id)
      else next.delete(currentQuestion.id)
      return next
    })
    void toggleBookmarkForQuestion(supabase, { userId, examenId: selectedExamId, intrebareId: currentQuestion.id, shouldBookmark })
  }

  const handleNext = () => {
    if (!currentQuestion || status !== "quiz") return
    if (isLastQuestion) finalizeQuiz({ timedOut: false })
    else setCurrentIndex((i) => i + 1)
  }

  const handleStartQuiz = () => {
    if (isPracticeMode && availablePracticeCount === 0) return
    const selectedCount = mode === "simulation" ? DEFAULT_QUESTION_COUNT : Math.min(Math.max(1, availablePracticeCount), Math.min(MAX_PRACTICE_QUESTIONS, Math.max(1, questionCount)))
    void loadQuiz(mode, selectedCount, selectedExamId, practiceSource, userId)
  }

  const resetToSetup = () => {
    finishedRef.current = false
    setQuestions([])
    setCurrentIndex(0)
    setSelectedAnswer(null)
    setBookmarkedQuestions(new Set())
    setAnswers({})
    setTimeRemaining(QUIZ_DURATION_SEC)
    setResultStats(null)
    setErrorMessage(null)
    setStatus("setup")
  }

  const handleExitQuiz = () => {
    resetToSetup()
    setIsExitModalOpen(false)
  }

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("quiz-active-change", { detail: status === "quiz" }))
  }, [status])

  useEffect(() => {
    const openExitModal = () => {
      if (status === "quiz") setIsExitModalOpen(true)
    }
    window.addEventListener("quiz-exit-request", openExitModal)
    return () => window.removeEventListener("quiz-exit-request", openExitModal)
  }, [status])

  if (status === "loading") return <div className="flex min-h-screen items-center justify-center text-sm text-muted-foreground">Se încarcă întrebările…</div>

  if (status === "error") {
    return (
      <div className="flex min-h-screen flex-col items-center justify-center gap-4 bg-background px-4">
        <p className="max-w-md text-center text-sm text-destructive">{errorMessage}</p>
        <button type="button" onClick={handleStartQuiz} className="rounded-xl bg-primary px-6 py-3 text-sm font-medium text-primary-foreground hover:bg-primary/90">Încearcă din nou</button>
      </div>
    )
  }

  if (status === "results" && resultStats) {
    return <QuizResults mode={resultStats.mode} correctCount={resultStats.correct} totalQuestions={resultStats.total} passThreshold={SIMULATION_PASS_THRESHOLD} elapsedLabel={formatElapsed(resultStats.elapsedMs)} finishedByTimeout={resultStats.timedOut} onRestart={() => setStatus("setup")} />
  }

  if (status === "setup") {
    const dynamicMax = Math.max(1, Math.min(MAX_PRACTICE_QUESTIONS, availablePracticeCount))
    return (
      <div className="min-h-screen bg-background">
        <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 md:py-16 lg:px-8 lg:py-20">
          <Card className="w-full border-2 border-border/90 bg-card shadow-xl shadow-primary/10 ring-1 ring-primary/15 quiz-question-animate">
            <CardHeader className="pb-2">
              <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">Setup</p>
              <h1 className="text-2xl font-semibold text-foreground md:text-3xl" data-testid="quiz-setup-title">Alege modul de quiz</h1>
            </CardHeader>
            <CardContent className="flex flex-col gap-6 pt-2">
              <div className="rounded-xl border border-border bg-secondary/30 p-5">
                <label htmlFor="exam-id" className="text-sm font-medium text-foreground">Examen</label>
                <select id="exam-id" value={selectedExamId} onChange={(e) => setSelectedExamId(Number(e.target.value))} className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none">
                  {examOptions.map((examId) => (
                    <option key={examId} value={examId}>Examen #{examId}</option>
                  ))}
                </select>
              </div>
              <div className="grid gap-4 md:grid-cols-2">
                <button type="button" data-testid="quiz-mode-simulation" onClick={() => setMode("simulation")} className={`rounded-xl border-2 p-5 text-left transition ${mode === "simulation" ? "border-primary bg-primary/10" : "border-border bg-secondary/30 hover:border-primary/40"}`}>
                  <p className="text-lg font-semibold text-foreground">Simulare Examen</p>
                </button>
                <button type="button" data-testid="quiz-mode-practice" onClick={() => setMode("practice")} className={`rounded-xl border-2 p-5 text-left transition ${mode === "practice" ? "border-primary bg-primary/10" : "border-border bg-secondary/30 hover:border-primary/40"}`}>
                  <p className="text-lg font-semibold text-foreground">Mod Practică</p>
                </button>
              </div>
              {mode === "practice" && (
                <div className="rounded-xl border border-border bg-secondary/30 p-5">
                  <label htmlFor="practice-source" className="text-sm font-medium text-foreground">Sursă întrebări</label>
                  <select id="practice-source" value={practiceSource} onChange={(e) => setPracticeSource(e.target.value as PracticeSource)} className="mt-2 w-full rounded-lg border border-border bg-card px-3 py-2 text-sm text-foreground outline-none">
                    <option value="all">Toate</option>
                    <option value="bookmarked">Salvate</option>
                    <option value="wrong">Greșite anterior</option>
                  </select>
                  <input type="range" min={1} max={dynamicMax} value={Math.max(1, questionCount)} onChange={(e) => setQuestionCount(Number(e.target.value))} className="mt-4 w-full accent-primary" disabled={availablePracticeCount === 0 || isAvailabilityLoading} />
                  <p className="mt-2 text-xs text-muted-foreground">Disponibile: {availablePracticeCount} întrebări</p>
                  {availabilityMessage && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{availabilityMessage}</p>}
                </div>
              )}
              <Button type="button" data-testid="quiz-start" onClick={handleStartQuiz} disabled={(isPracticeMode && availablePracticeCount === 0) || isAvailabilityLoading} className="w-full rounded-xl bg-white px-8 py-6 text-base font-medium text-black shadow-sm hover:bg-white/90 disabled:opacity-60">
                {isAvailabilityLoading ? "Se verifică întrebările..." : "Începe quiz-ul"}
              </Button>
            </CardContent>
          </Card>
        </main>
      </div>
    )
  }

  if (!currentQuestion) return null

  return (
    <div className="min-h-screen bg-background">
      <QuizHeader currentQuestion={currentIndex + 1} totalQuestions={totalQuestions} timeRemaining={formatClock(timeRemaining)} />
      <main className="mx-auto w-full max-w-5xl px-4 py-12 sm:px-6 md:py-16 lg:px-8 lg:py-20">
        <div key={currentQuestion.id} className="flex w-full flex-col gap-8 md:gap-10 quiz-question-animate">
          <QuestionCard questionNumber={currentIndex + 1} questionText={currentQuestion.text} isBookmarked={bookmarkedQuestions.has(currentQuestion.id)} onToggleBookmark={handleToggleBookmark} />
          <AnswerOptions options={currentQuestion.options} selectedAnswer={selectedAnswer} correctAnswer={currentQuestion.correctAnswer} showImmediateFeedback={isPracticeMode && hasAnsweredCurrent} isLocked={isPracticeMode && hasAnsweredCurrent} onSelectAnswer={handleSelectAnswer} />
          {(mode === "simulation" || hasAnsweredCurrent) && <QuizNavigation onNext={handleNext} isLastQuestion={isLastQuestion} hasSelectedAnswer={selectedAnswer !== null} />}
        </div>
      </main>
      {isExitModalOpen && (
        <div data-testid="exit-modal" className="fixed inset-0 z-[80] flex items-center justify-center p-4 modal-backdrop-animate">
          <button type="button" aria-label="Închide" onClick={() => setIsExitModalOpen(false)} className="absolute inset-0 bg-black/45 backdrop-blur-sm" />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-border bg-slate-950/95 p-6 shadow-2xl ring-1 ring-primary/20 modal-card-animate">
            <h2 className="text-lg font-semibold text-white">Confirmare ieșire</h2>
            <p className="mt-2 text-sm text-slate-300">Ești sigur că vrei să părăsești quiz-ul? Progresul actual va fi pierdut.</p>
            <div className="mt-6 flex items-center justify-end gap-3">
              <button type="button" data-testid="exit-modal-stay" onClick={() => setIsExitModalOpen(false)} className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-white transition hover:bg-primary/90">Rămân</button>
              <button type="button" data-testid="exit-modal-confirm" onClick={handleExitQuiz} className="rounded-lg bg-rose-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-rose-500">Renunță</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
