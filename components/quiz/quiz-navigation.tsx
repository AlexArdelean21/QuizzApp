"use client"

import { Button } from "@/components/ui/button"
import { CheckCircle2, ChevronRight } from "lucide-react"

interface QuizNavigationProps {
  onNext: () => void
  isLastQuestion: boolean
  hasSelectedAnswer: boolean
  /**
   * When provided, an extra "Verify" button is shown that commits the
   * user's current multi-select selection. Used in practice mode for
   * multi-correct questions, since a single click cannot disambiguate
   * whether the user is still adding to their selection.
   */
  onVerify?: () => void
  /** Whether the practice-mode verify control should appear. */
  showVerify?: boolean
  /** Disable the verify control (e.g. nothing selected yet). */
  verifyDisabled?: boolean
}

export function QuizNavigation({
  onNext,
  isLastQuestion,
  hasSelectedAnswer,
  onVerify,
  showVerify = false,
  verifyDisabled = false,
}: QuizNavigationProps) {
  return (
    <div className="flex w-full flex-wrap items-center justify-end gap-3 pt-2">
      {showVerify && onVerify ? (
        <Button
          type="button"
          onClick={onVerify}
          disabled={verifyDisabled}
          size="lg"
          variant="secondary"
          className="gap-2 rounded-xl px-6"
          data-testid="quiz-verify"
        >
          <CheckCircle2 className="size-4" />
          Verifică răspunsul
        </Button>
      ) : null}
      <Button
        onClick={onNext}
        disabled={!hasSelectedAnswer}
        size="lg"
        className="gap-2 rounded-xl bg-white px-8 text-black shadow-sm hover:bg-white/90"
        data-testid="quiz-next"
      >
        {isLastQuestion ? "Finish Quiz" : "Next Question"}
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
