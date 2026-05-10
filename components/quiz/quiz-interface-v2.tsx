"use client"

import { useCallback, useEffect, useRef, useState } from "react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { ChevronDown } from "lucide-react"
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
const EXAM_DISPLAY_NAME = "ANRE grad III-IVAB"

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
  const [isPracticeSourceOpen, setIsPracticeSourceOpen] = useState(false)
  const [selectedExamId, setSelectedExamId] = useState(1)
  const [examOptions, setExamOptions] = useState<number[]>([])
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
  const practiceSourceDropdownRef = useRef<HTMLDivElement | null>(null)

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
      const { data: userData } = await supabase.auth.getUser()
      const activeUserId = userData.user?.id ?? null
      setUserId(activeUserId)
      if (!activeUserId) {
        setExamOptions([])
        setAvailabilityMessage("Nu ai acces la niciun examen momentan. Contactează administratorul.")
        return
      }

      const examIds = await fetchDistinctExamIds(supabase, activeUserId)
      setExamOptions(examIds)

      if (examIds.length === 0) {
        setAvailabilityMessage("Nu ai acces la niciun examen momentan. Contactează administratorul.")
        setAvailablePracticeCount(0)
        return
      }

      const nextExamId = examIds[0]
      setSelectedExamId(nextExamId)
      await refreshAvailablePracticeCount(practiceSource, nextExamId, activeUserId)
    }
    void bootstrap().catch((error) => {
      console.error("Failed to load available exams:", error)
      setAvailabilityMessage("Nu ai acces la niciun examen momentan. Contactează administratorul.")
      setExamOptions([])
      setAvailablePracticeCount(0)
    })
  }, [supabase, refreshAvailablePracticeCount, practiceSource])

  useEffect(() => {
    if (!isPracticeMode || examOptions.length === 0) return
    void refreshAvailablePracticeCount(practiceSource, selectedExamId, userId)
  }, [isPracticeMode, practiceSource, selectedExamId, userId, refreshAvailablePracticeCount, examOptions.length])

  useEffect(() => {
    if (!isPracticeMode) return
    const dynamicMax = Math.max(0, Math.min(MAX_PRACTICE_QUESTIONS, availablePracticeCount))
    if (dynamicMax === 0) {
      setQuestionCount(0)
      return
    }
    setQuestionCount(Math.min(DEFAULT_QUESTION_COUNT, dynamicMax))
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
    if (examOptions.length === 0) {
      setAvailabilityMessage("Nu ai acces la niciun examen momentan. Contactează administratorul.")
      return
    }
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

  useEffect(() => {
    if (!isPracticeSourceOpen) return

    const handleOutsideClick = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target) return
      if (!practiceSourceDropdownRef.current?.contains(target)) {
        setIsPracticeSourceOpen(false)
      }
    }

    document.addEventListener("mousedown", handleOutsideClick)
    return () => document.removeEventListener("mousedown", handleOutsideClick)
  }, [isPracticeSourceOpen])

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
    const dynamicMax = Math.max(0, Math.min(MAX_PRACTICE_QUESTIONS, availablePracticeCount))
    const sliderMax = Math.max(1, dynamicMax)
    const sliderValue = Math.max(1, Math.min(questionCount, sliderMax))
    const hasSingleExamOption = examOptions.length === 1
    const noExamAccess = examOptions.length === 0
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
                {noExamAccess ? (
                  <p className="mt-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300">
                    Nu ai acces la niciun examen momentan. Contactează administratorul.
                  </p>
                ) : hasSingleExamOption ? (
                  <p className="mt-2 rounded-lg border border-border/70 bg-card/60 px-3 py-2 text-sm text-muted-foreground">
                    Examen selectat: {EXAM_DISPLAY_NAME}
                  </p>
                ) : (
                  <div className="relative mt-2">
                    <select
                      id="exam-id"
                      value={selectedExamId}
                      onChange={(e) => setSelectedExamId(Number(e.target.value))}
                      className="w-full appearance-none rounded-lg border border-border bg-card px-4 py-2.5 pr-10 text-sm text-foreground shadow-sm outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                    >
                      {examOptions.map((examId) => (
                        <option key={examId} value={examId}>
                          {EXAM_DISPLAY_NAME} (ID {examId})
                        </option>
                      ))}
                    </select>
                    <svg
                      aria-hidden="true"
                      viewBox="0 0 20 20"
                      className="pointer-events-none absolute right-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground"
                    >
                      <path d="m5 7 5 6 5-6" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" />
                    </svg>
                  </div>
                )}
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
                  <div className="relative mt-2" ref={practiceSourceDropdownRef}>
                    <button
                      id="practice-source"
                      type="button"
                      aria-haspopup="listbox"
                      aria-expanded={isPracticeSourceOpen}
                      onClick={() => setIsPracticeSourceOpen((prev) => !prev)}
                      className="flex w-full items-center justify-between rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-white transition-colors hover:border-slate-600 focus:outline-none focus:ring-2 focus:ring-primary/40"
                    >
                      <span>{sourceLabelMap[practiceSource].charAt(0).toUpperCase() + sourceLabelMap[practiceSource].slice(1)}</span>
                      <ChevronDown
                        className={`size-4 text-slate-400 transition-transform ${isPracticeSourceOpen ? "rotate-180" : ""}`}
                      />
                    </button>

                    {isPracticeSourceOpen && (
                      <div
                        role="listbox"
                        aria-labelledby="practice-source"
                        className="absolute z-50 mt-1 w-full overflow-hidden rounded-md border border-slate-700 bg-slate-900 shadow-xl"
                      >
                        {([
                          { value: "all", label: "Toate" },
                          { value: "bookmarked", label: "Salvate" },
                          { value: "wrong", label: "Greșite anterior" },
                        ] as const).map((option) => (
                          <button
                            key={option.value}
                            type="button"
                            onClick={() => {
                              setPracticeSource(option.value)
                              setIsPracticeSourceOpen(false)
                            }}
                            className={`w-full px-3 py-2 text-left text-sm transition-colors ${
                              practiceSource === option.value
                                ? "bg-slate-800 text-white"
                                : "text-slate-300 hover:bg-slate-800 hover:text-white"
                            }`}
                          >
                            {option.label}
                          </button>
                        ))}
                      </div>
                    )}
                  </div>
                  <p className="mt-4 text-sm font-medium text-foreground">Număr întrebări: {dynamicMax === 0 ? 0 : sliderValue}</p>
                  <input type="range" min={1} max={sliderMax} value={dynamicMax === 0 ? 1 : sliderValue} onChange={(e) => setQuestionCount(Number(e.target.value))} className="mt-2 w-full accent-primary" disabled={availablePracticeCount === 0 || isAvailabilityLoading} />
                  <p className="mt-2 text-xs text-muted-foreground">Disponibile: {availablePracticeCount} întrebări</p>
                  {availabilityMessage && <p className="mt-2 text-xs text-amber-600 dark:text-amber-400">{availabilityMessage}</p>}
                </div>
              )}
              <Button type="button" data-testid="quiz-start" onClick={handleStartQuiz} disabled={noExamAccess || (isPracticeMode && availablePracticeCount === 0) || isAvailabilityLoading} className="w-full rounded-xl bg-white px-8 py-6 text-base font-medium text-black shadow-sm hover:bg-white/90 disabled:opacity-60">
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
