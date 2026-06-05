"use client"

import { Button } from "@/components/ui/button"
import { Bookmark } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuestionCardProps {
  questionNumber: number
  questionText: string
  isBookmarked: boolean
  onToggleBookmark: () => void
  /**
   * When true, renders a discreet hint that the question allows multiple
   * correct selections.
   */
  isMultipleChoice?: boolean
}

export function QuestionCard({
  questionNumber,
  questionText,
  isBookmarked,
  onToggleBookmark,
  isMultipleChoice = false,
}: QuestionCardProps) {
  return (
    <div className="question-surface w-full p-6 md:p-8">
      <div className="flex items-center justify-between gap-4 mb-5">
        <div className="flex min-w-0 items-center gap-3 md:gap-4">
          <span
            className="number-badge flex size-11 shrink-0 items-center justify-center rounded-xl text-lg md:size-12 md:text-xl"
            aria-label={`Întrebarea numărul ${questionNumber}`}
          >
            {questionNumber}
          </span>
          <div className="flex min-w-0 flex-col gap-0 leading-tight">
            <span className="section-label">Întrebare</span>
            {isMultipleChoice && (
              <span
                data-testid="multi-answer-notice"
                className="text-xs text-muted-foreground"
              >
                • Alegere multiplă
              </span>
            )}
          </div>
        </div>
        <Button
          variant="ghost"
          size="icon"
          onClick={onToggleBookmark}
          className={cn(
            "relative z-10 shrink-0 transition-colors",
            isBookmarked
              ? "text-amber-500 hover:text-amber-400"
              : "text-muted-foreground hover:text-foreground"
          )}
          aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
        >
          <Bookmark className={cn("size-5 transition-colors", isBookmarked && "fill-current")} />
        </Button>
      </div>
      <p className="text-pretty text-xl font-medium leading-relaxed text-foreground md:text-2xl">
        {questionText}
      </p>
    </div>
  )
}
