"use client"

import { Progress } from "@/components/ui/progress"
import { Clock } from "lucide-react"

interface QuizHeaderProps {
  examName: string
  currentQuestion: number
  totalQuestions: number
  timeRemaining: string
  onLogout?: () => void
}

export function QuizHeader({
  examName,
  currentQuestion,
  totalQuestions,
  timeRemaining,
  onLogout,
}: QuizHeaderProps) {
  const progressValue = (currentQuestion / totalQuestions) * 100

  return (
    <header className="sticky top-0 z-50 w-full border-b border-border bg-background/95 backdrop-blur supports-[backdrop-filter]:bg-background/60">
      <div className="mx-auto flex h-16 w-full max-w-5xl items-center justify-between gap-3 px-4 sm:px-6 lg:px-8">
        {/* Exam Name */}
        <div className="flex min-w-0 shrink-0 items-center gap-2">
          <h1 className="truncate text-sm font-semibold text-foreground md:text-base md:max-w-none">
            {examName}
          </h1>
        </div>

        {/* Progress Section */}
        <div className="flex min-w-0 flex-1 items-center justify-center gap-3 md:gap-4">
          <span className="hidden shrink-0 text-xs text-muted-foreground md:block whitespace-nowrap">
            Question {currentQuestion} of {totalQuestions}
          </span>
          <div className="min-w-0 w-full max-w-md">
            <Progress value={progressValue} className="h-2.5" />
          </div>
          <span className="shrink-0 text-xs text-muted-foreground md:hidden">
            {currentQuestion}/{totalQuestions}
          </span>
        </div>

        {/* Timer + Logout */}
        <div className="flex shrink-0 items-center gap-2">
          {onLogout && (
            <button
              type="button"
              onClick={onLogout}
              className="rounded-md border border-border bg-card px-2.5 py-1.5 text-xs font-medium text-muted-foreground transition hover:border-primary/40 hover:text-foreground"
            >
              Logout
            </button>
          )}
          <div className="flex items-center gap-2 rounded-lg bg-secondary px-3 py-1.5">
          <Clock className="size-4 text-muted-foreground" />
          <span className="font-mono text-sm font-medium text-foreground">
            {timeRemaining}
          </span>
        </div>
        </div>
      </div>
    </header>
  )
}
