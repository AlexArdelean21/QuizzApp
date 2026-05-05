"use client"

import { Progress } from "@/components/ui/progress"
import { Clock } from "lucide-react"

interface QuizHeaderProps {
  examName: string
  currentQuestion: number
  totalQuestions: number
  timeRemaining: string
}

export function QuizHeader({
  examName,
  currentQuestion,
  totalQuestions,
  timeRemaining,
}: QuizHeaderProps) {
  const progressValue = (currentQuestion / totalQuestions) * 100

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="container flex h-16 items-center justify-between px-4 md:px-6">
        {/* Exam Name */}
        <div className="flex items-center gap-2">
          <h1 className="text-sm font-semibold text-foreground md:text-base truncate max-w-[120px] md:max-w-none">
            {examName}
          </h1>
        </div>

        {/* Progress Section */}
        <div className="flex flex-1 items-center justify-center gap-3 px-4 md:px-8">
          <span className="hidden text-xs text-muted-foreground md:block whitespace-nowrap">
            Question {currentQuestion} of {totalQuestions}
          </span>
          <div className="w-24 md:w-48">
            <Progress value={progressValue} className="h-2" />
          </div>
          <span className="text-xs text-muted-foreground md:hidden">
            {currentQuestion}/{totalQuestions}
          </span>
        </div>

        {/* Timer */}
        <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5">
          <Clock className="size-4 text-muted-foreground" />
          <span className="font-mono text-sm font-medium text-foreground">
            {timeRemaining}
          </span>
        </div>
      </div>
    </header>
  )
}
