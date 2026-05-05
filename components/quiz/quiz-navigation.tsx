"use client"

import { Button } from "@/components/ui/button"
import { ChevronRight } from "lucide-react"

interface QuizNavigationProps {
  onNext: () => void
  isLastQuestion: boolean
  hasSelectedAnswer: boolean
}

export function QuizNavigation({
  onNext,
  isLastQuestion,
  hasSelectedAnswer,
}: QuizNavigationProps) {
  return (
    <div className="flex w-full items-center justify-end pt-2">
      <Button
        onClick={onNext}
        disabled={!hasSelectedAnswer}
        size="lg"
        className="gap-2 rounded-xl bg-white px-8 text-black shadow-sm hover:bg-white/90"
      >
        {isLastQuestion ? "Finish Quiz" : "Next Question"}
        <ChevronRight className="size-4" />
      </Button>
    </div>
  )
}
