"use client"

import { useEffect, useRef, useState } from "react"
import Link from "next/link"
import { ArrowRight, CheckCircle2, RotateCcw } from "lucide-react"
import { cn } from "@/lib/utils"

type Question = {
  text: string
  options: { id: string; text: string }[]
  correctId: string
}

const QUESTIONS: Question[] = [
  {
    text: "Pentru cine este QuizHub?",
    options: [
      { id: "a", text: "Doar pentru elevi" },
      { id: "b", text: "Doar pentru studenți" },
      { id: "c", text: "Toată lumea care vrea să dea un examen" },
      { id: "d", text: "Doar pentru profesori" },
    ],
    correctId: "c",
  },
  {
    text: "De ce să folosești QuizHub?",
    options: [
      { id: "a", text: "Pregătire eficientă cu simulări reale" },
      { id: "b", text: "Doar pentru distracție" },
      { id: "c", text: "Ca să pierzi timpul" },
      { id: "d", text: "Nu știu" },
    ],
    correctId: "a",
  },
  {
    text: "Câte cunoștințe tehnice trebuie să ai?",
    options: [
      { id: "a", text: "Programare avansată" },
      { id: "b", text: "Cunoștințe de SQL" },
      { id: "c", text: "Curs Microsoft Office" },
      { id: "d", text: "Zero — interfața e user-friendly" },
    ],
    correctId: "d",
  },
  {
    text: "Vrei să-ți adaugi propriile examene?",
    options: [
      { id: "a", text: "Nu se poate" },
      { id: "b", text: "Doar prin programatori" },
      { id: "c", text: "Îți faci organizație și încarci Excel cu întrebări" },
      { id: "d", text: "Trebuie să plătești abonament" },
    ],
    correctId: "c",
  },
  {
    text: "Ce primești când treci un examen?",
    options: [
      { id: "a", text: "Nimic" },
      { id: "b", text: "Un certificat fizic" },
      { id: "c", text: "Statistici detaliate și satisfacția unui job bine făcut" },
      { id: "d", text: "O notă bună automat" },
    ],
    correctId: "c",
  },
]

export function HeroQuiz() {
  const [currentIdx, setCurrentIdx] = useState(0)
  const [selectedId, setSelectedId] = useState<string | null>(null)
  const [wrongId, setWrongId] = useState<string | null>(null)
  const [locked, setLocked] = useState(false)
  const [finished, setFinished] = useState(false)
  const timerRef = useRef<NodeJS.Timeout | null>(null)

  const question = QUESTIONS[currentIdx]
  const progress = ((currentIdx + (finished ? 1 : 0)) / QUESTIONS.length) * 100

  useEffect(() => {
    if (!finished) return
    let cancelled = false
    void import("canvas-confetti").then(({ default: confetti }) => {
      if (cancelled) return
      confetti({
        particleCount: 80,
        spread: 70,
        origin: { y: 0.7 },
        colors: ["#3b82f6", "#8b5cf6", "#06b6d4", "#10b981"],
      })
    })
    return () => {
      cancelled = true
    }
  }, [finished])

  useEffect(() => {
    return () => {
      if (timerRef.current) clearTimeout(timerRef.current)
    }
  }, [])

  function handleClick(optionId: string) {
    if (locked) return
    setLocked(true)
    setSelectedId(optionId)

    const isCorrect = optionId === question.correctId
    if (!isCorrect) setWrongId(optionId)

    if (timerRef.current) clearTimeout(timerRef.current)
    timerRef.current = setTimeout(() => {
      if (currentIdx === QUESTIONS.length - 1) {
        setFinished(true)
      } else {
        setCurrentIdx((i) => i + 1)
        setSelectedId(null)
        setWrongId(null)
        setLocked(false)
      }
    }, 1400)
  }

  function restart() {
    setCurrentIdx(0)
    setSelectedId(null)
    setWrongId(null)
    setLocked(false)
    setFinished(false)
  }

  if (finished) {
    return (
      <div className="card-surface flex flex-col items-center gap-5 p-8 text-center">
        <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/15">
          <CheckCircle2 className="size-9 text-emerald-500" />
        </div>
        <div>
          <h3 className="text-2xl font-bold text-foreground">Felicitări! 🎉</h3>
          <p className="mt-2 text-sm text-muted-foreground">
            Așa arată o sesiune reală: feedback instant, progres vizibil,
            statistici clare. Vrei să încerci cu examene adevărate?
          </p>
        </div>
        <div className="flex w-full flex-col gap-2">
          <Link
            href="/login?tab=signup"
            className="btn-primary flex w-full items-center justify-center gap-2 rounded-xl px-6 py-3 text-base"
          >
            Creează cont gratuit
            <ArrowRight className="size-4" />
          </Link>
          <button
            onClick={restart}
            className="flex items-center justify-center gap-2 rounded-xl px-4 py-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <RotateCcw className="size-3.5" />
            Răspunde din nou
          </button>
        </div>
      </div>
    )
  }

  return (
    <div className="flex flex-col gap-3">
      <div className="question-surface p-5 sm:p-6">
        <div className="mb-3 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <span className="number-badge flex size-9 shrink-0 items-center justify-center rounded-xl text-sm font-bold">
              {currentIdx + 1}
            </span>
            <div>
              <span className="section-label text-[10px]">
                Demo · {currentIdx + 1}/{QUESTIONS.length}
              </span>
            </div>
          </div>
          <div className="h-1.5 w-20 overflow-hidden rounded-full bg-muted">
            <div
              className="progress-smooth progress-gradient h-full rounded-full"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
        <p className="text-base font-medium leading-snug text-foreground sm:text-lg">
          {question.text}
        </p>
      </div>

      <div className="mt-3 flex flex-col gap-2">
        {question.options.map((opt) => {
          const isSelected = selectedId === opt.id
          const isWrong = wrongId === opt.id
          const showCorrect = locked && opt.id === question.correctId

          return (
            <button
              key={opt.id}
              type="button"
              disabled={locked}
              onClick={() => handleClick(opt.id)}
              data-selected={isSelected && !locked}
              data-correct={showCorrect}
              data-wrong={isWrong}
              className={cn(
                "answer-option group flex items-center gap-3 p-3.5 text-left text-sm",
                isWrong && "shake-x",
                locked && "cursor-not-allowed"
              )}
            >
              <span
                className={cn(
                  "flex size-9 shrink-0 items-center justify-center rounded-full text-xs font-semibold transition-all",
                  showCorrect
                    ? "bg-emerald-500 text-white"
                    : isWrong
                      ? "bg-rose-500 text-white"
                      : isSelected
                        ? "number-badge"
                        : "bg-muted text-muted-foreground group-hover:bg-primary/15 group-hover:text-foreground"
                )}
              >
                {opt.id.toUpperCase()}
              </span>
              <span className="text-foreground">
                {opt.text}
              </span>
            </button>
          )
        })}
      </div>
    </div>
  )
}
