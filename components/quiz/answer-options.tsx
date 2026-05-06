"use client"

import { cn } from "@/lib/utils"

interface AnswerOption {
  id: string
  label: string
  text: string
}

interface AnswerOptionsProps {
  options: AnswerOption[]
  selectedAnswer: string | null
  correctAnswer: string
  showImmediateFeedback: boolean
  isLocked: boolean
  onSelectAnswer: (answerId: string) => void
}

export function AnswerOptions({
  options,
  selectedAnswer,
  correctAnswer,
  showImmediateFeedback,
  isLocked,
  onSelectAnswer,
}: AnswerOptionsProps) {
  return (
    <div className="flex w-full flex-col gap-3 md:gap-4">
      {options.map((option) => {
        const isSelected = selectedAnswer === option.id
        const isCorrectOption = option.id === correctAnswer
        const isWrongSelected = showImmediateFeedback && isSelected && !isCorrectOption
        const isCorrectShown =
          showImmediateFeedback && (isCorrectOption || (isSelected && isCorrectOption))

        return (
          <button
            key={option.id}
            onClick={() => onSelectAnswer(option.id)}
            disabled={isLocked}
            className={cn(
              "group relative flex w-full min-w-0 items-center gap-4 rounded-xl border-2 p-5 text-left transition-all duration-200 md:gap-5 md:p-6",
              !isLocked && "hover:border-primary hover:bg-primary/5 shadow-sm hover:shadow-md",
              isLocked && "cursor-not-allowed",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              showImmediateFeedback
                ? isCorrectShown
                  ? "border-emerald-500 bg-emerald-500/10"
                  : isWrongSelected
                    ? "border-rose-500 bg-rose-500/10"
                    : "border-border bg-card"
                : isSelected
                  ? "border-primary bg-primary/10"
                  : "border-border bg-card"
            )}
            aria-pressed={isSelected}
          >
            {/* Option Label Circle */}
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200 md:size-11 md:text-base",
                showImmediateFeedback
                  ? isCorrectShown
                    ? "bg-emerald-500 text-white"
                    : isWrongSelected
                      ? "bg-rose-500 text-white"
                      : "bg-secondary text-muted-foreground"
                  : isSelected
                    ? "bg-primary text-primary-foreground"
                    : "bg-secondary text-muted-foreground group-hover:bg-primary/15 group-hover:text-foreground"
              )}
            >
              {option.label}
            </span>

            {/* Option Text */}
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

            {/* Selected Indicator */}
            <span
              className={cn(
                "size-5 rounded-full border-2 transition-all duration-200",
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
