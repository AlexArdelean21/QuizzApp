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
  onSelectAnswer: (answerId: string) => void
}

export function AnswerOptions({
  options,
  selectedAnswer,
  onSelectAnswer,
}: AnswerOptionsProps) {
  return (
    <div className="flex flex-col gap-3">
      {options.map((option) => {
        const isSelected = selectedAnswer === option.id

        return (
          <button
            key={option.id}
            onClick={() => onSelectAnswer(option.id)}
            className={cn(
              "group relative flex w-full items-center gap-4 rounded-xl border-2 p-4 text-left transition-all duration-200 md:p-5",
              "hover:border-primary/40 hover:bg-secondary/50",
              "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background",
              isSelected
                ? "border-primary bg-primary/10"
                : "border-border bg-card"
            )}
            aria-pressed={isSelected}
          >
            {/* Option Label Circle */}
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-full text-sm font-semibold transition-all duration-200",
                isSelected
                  ? "bg-primary text-primary-foreground"
                  : "bg-secondary text-muted-foreground group-hover:bg-primary/15 group-hover:text-foreground"
              )}
            >
              {option.label}
            </span>

            {/* Option Text */}
            <span
              className={cn(
                "flex-1 text-base font-medium transition-colors duration-200 md:text-lg",
                isSelected
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
                isSelected
                  ? "border-primary bg-primary"
                  : "border-muted-foreground/30 group-hover:border-primary/50"
              )}
            >
              {isSelected && (
                <svg
                  className="size-full text-primary-foreground"
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
