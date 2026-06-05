"use client"

import { Clock, Flame } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuizHeaderProps {
  currentQuestion: number
  totalQuestions: number
  timeRemaining: string
  /**
   * Raw seconds left, used to detect the final-minute urgency. Pass only when
   * a countdown actually applies (i.e. simulation mode) so practice never
   * pulses. Omit it to disable the urgency animation entirely.
   */
  secondsLeft?: number
  /** When false, the timer chip is hidden (e.g. untimed practice mode). */
  hasTimer?: boolean
  streak?: number
  streakBump?: boolean
}

export function QuizHeader({
  currentQuestion,
  totalQuestions,
  timeRemaining,
  secondsLeft,
  hasTimer = true,
  streak = 0,
  streakBump = false,
}: QuizHeaderProps) {
  const progressPercent = (currentQuestion / totalQuestions) * 100
  const isUrgent = typeof secondsLeft === "number" && secondsLeft > 0 && secondsLeft <= 60

  return (
    <div className="w-full bg-background/85 backdrop-blur-md">
      <div className="mx-auto flex min-h-10 w-full max-w-5xl items-center justify-between gap-3 px-4 py-1.5 sm:px-6 lg:px-8">
        <div className="flex min-w-0 flex-1 items-center justify-center gap-3 md:gap-4">
          <span className="hidden shrink-0 text-xs text-muted-foreground md:block whitespace-nowrap">
            Question {currentQuestion} of {totalQuestions}
          </span>
          <div className="relative h-2 min-w-0 w-full max-w-md overflow-hidden rounded-full bg-primary/20">
            <div
              className="progress-smooth progress-gradient h-full rounded-full"
              style={{ width: `${progressPercent}%` }}
            />
          </div>
          <span className="shrink-0 text-xs text-muted-foreground md:hidden">
            {currentQuestion}/{totalQuestions}
          </span>
        </div>

        {/* Right column — timer + streak stacked, right-aligned */}
        <div className="flex shrink-0 flex-col items-end gap-1.5">
          {hasTimer && (
            <div
              className={cn(
                "flex items-center gap-2 rounded-md bg-secondary/70 px-2.5 py-1 tabular-nums",
                isUrgent && "timer-urgent border border-red-500/50 text-red-600"
              )}
            >
              <Clock className={cn("size-3.5 text-muted-foreground", isUrgent && "text-current")} />
              <span className={cn("font-mono text-xs font-medium", isUrgent ? "text-current" : "text-foreground")}>
                {timeRemaining}
              </span>
            </div>
          )}

          {streak >= 2 && (
            <div
              className={cn(
                "flex items-center gap-1 rounded-full border border-orange-500/30 bg-orange-500/15 px-2 py-0.5",
                "text-xs font-semibold text-orange-600 dark:text-orange-400",
                "streak-appear"
              )}
            >
              <Flame
                className={cn(
                  "size-3 fill-orange-500 text-orange-500",
                  streakBump && "streak-bump"
                )}
              />
              <span className={streakBump ? "streak-bump inline-block" : "inline-block"}>
                {streak} la rând
              </span>
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
