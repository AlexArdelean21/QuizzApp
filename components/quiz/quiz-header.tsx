"use client"

import { Progress } from "@/components/ui/progress"
import { Clock } from "lucide-react"

interface QuizHeaderProps {
  currentQuestion: number
  totalQuestions: number
  timeRemaining: string
}

export function QuizHeader({
  currentQuestion,
  totalQuestions,
  timeRemaining,
}: QuizHeaderProps) {
  const progressValue = (currentQuestion / totalQuestions) * 100

  return (
    <div className="w-full bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex h-10 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center justify-center gap-3 md:gap-4">
          <span className="hidden shrink-0 text-xs text-muted-foreground md:block whitespace-nowrap">
            Question {currentQuestion} of {totalQuestions}
          </span>
          <div className="min-w-0 w-full max-w-md">
            <Progress value={progressValue} className="h-2" />
          </div>
          <span className="shrink-0 text-xs text-muted-foreground md:hidden">
            {currentQuestion}/{totalQuestions}
          </span>
        </div>

        <div className="flex shrink-0 items-center gap-2 rounded-md bg-secondary/70 px-2.5 py-1">
          <Clock className="size-3.5 text-muted-foreground" />
          <span className="font-mono text-xs font-medium text-foreground">
            {timeRemaining}
          </span>
        </div>
      </div>
    </div>
  )
}
