"use client"

import { useEffect, useRef, useState } from "react"
import { cn } from "@/lib/utils"

interface AnswerOption {
  id: string
  label: string
  text: string
}

interface AnswerOptionsProps {
  options: AnswerOption[]
  selectedAnswers: string[]
  correctAnswers: string[]
  showImmediateFeedback: boolean
  isLocked: boolean
  multiple: boolean
  onToggleAnswer: (answerId: string) => void
}

export function AnswerOptions({
  options,
  selectedAnswers,
  correctAnswers,
  showImmediateFeedback,
  isLocked,
  multiple,
  onToggleAnswer,
}: AnswerOptionsProps) {
  const [pulsedId, setPulsedId] = useState<string | null>(null)
  const prevSelectedRef = useRef<Set<string>>(new Set())
  const selectedSet = new Set(selectedAnswers)
  const correctSet = new Set(correctAnswers)

  useEffect(() => {
    const currentSet = new Set(selectedAnswers)
    const justAdded = [...currentSet].find((id) => !prevSelectedRef.current.has(id))
    if (justAdded) {
      setPulsedId(justAdded)
      const t = setTimeout(() => setPulsedId(null), 500)
      prevSelectedRef.current = currentSet
      return () => clearTimeout(t)
    }
    prevSelectedRef.current = currentSet
  }, [selectedAnswers])

  return (
    <div
      role={multiple ? "group" : "radiogroup"}
      aria-label="Variante de răspuns"
      className="flex w-full flex-col gap-3 md:gap-4"
    >
      {options.map((option) => {
        const isSelected = selectedSet.has(option.id)
        const isCorrectOption = correctSet.has(option.id)
        const isWrongSelected = showImmediateFeedback && isSelected && !isCorrectOption
        const isMissedCorrect = showImmediateFeedback && !isSelected && isCorrectOption
        const isCorrectShown = showImmediateFeedback && (isCorrectOption || isMissedCorrect)

        return (
          <button
            key={option.id}
            type="button"
            role={multiple ? "checkbox" : "radio"}
            aria-checked={isSelected}
            onClick={() => onToggleAnswer(option.id)}
            disabled={isLocked}
            data-testid={`answer-option-${option.id}`}
            data-selected={isSelected && !showImmediateFeedback}
            data-correct={showImmediateFeedback && isCorrectShown}
            data-wrong={showImmediateFeedback && isWrongSelected}
            className={cn(
              "answer-option group relative flex w-full min-w-0 items-center gap-4 p-5 text-left md:gap-5 md:p-6",
              isLocked && "cursor-not-allowed",
              pulsedId === option.id && "answer-pulse"
            )}
          >
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center text-sm font-semibold transition-all duration-200 md:size-11 md:text-base",
                multiple ? "rounded-lg" : "rounded-full",
                showImmediateFeedback
                  ? isCorrectShown
                    ? "bg-emerald-500 text-white"
                    : isWrongSelected
                      ? "bg-rose-500 text-white"
                      : "bg-muted text-muted-foreground"
                  : isSelected
                    ? "number-badge"
                    : "bg-muted text-muted-foreground group-hover:bg-primary/15 group-hover:text-foreground"
              )}
            >
              {option.label}
            </span>

            <span
              className={cn(
                "min-w-0 flex-1 text-lg font-medium transition-colors duration-200 md:text-xl",
                showImmediateFeedback
                  ? isCorrectShown
                    ? "text-emerald-600 dark:text-emerald-400"
                    : isWrongSelected
                      ? "text-rose-600 dark:text-rose-400"
                      : "text-muted-foreground"
                  : isSelected
                    ? "text-foreground"
                    : "text-muted-foreground group-hover:text-foreground"
              )}
            >
              {option.text}
            </span>

            {/*
              The selected/correct indicator is rendered as a circle for
              single-choice questions (radio) and as a square for
              multi-correct (checkbox) so the visual affordance matches the
              underlying input semantics.
            */}
            <span
              className={cn(
                "flex size-5 items-center justify-center border-2 transition-all duration-200",
                multiple ? "rounded-md" : "rounded-full",
                showImmediateFeedback
                  ? isCorrectShown
                    ? "border-emerald-500 bg-emerald-500"
                    : isWrongSelected
                      ? "border-rose-500 bg-rose-500"
                      : "border-muted-foreground/30"
                  : isSelected
                    ? "border-primary bg-primary"
                    : "border-muted-foreground/30 group-hover:border-primary/50"
              )}
            >
              {(isCorrectShown || (!showImmediateFeedback && isSelected)) && (
                <svg
                  className="size-full text-white"
                  viewBox="0 0 20 20"
                  fill="currentColor"
                >
                  <path
                    fillRule="evenodd"
                    d="M16.707 5.293a1 1 0 010 1.414l-8 8a1 1 0 01-1.414 0l-4-4a1 1 0 011.414-1.414L8 12.586l7.293-7.293a1 1 0 011.414 0z"
                    clipRule="evenodd"
                  />
                </svg>
              )}
            </span>
          </button>
        )
      })}
    </div>
  )
}
