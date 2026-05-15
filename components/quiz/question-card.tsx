"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
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
    <Card className="w-full border-2 border-border/90 bg-card shadow-xl shadow-primary/10 ring-1 ring-primary/15">
      <CardHeader className="pb-5">
        <div className="flex items-center justify-between gap-4">
          <div className="flex min-w-0 items-center gap-3 md:gap-4">
            <span
              className={cn(
                "flex size-10 shrink-0 items-center justify-center rounded-xl font-bold leading-none shadow-md ring-2 ring-primary/40",
                "bg-primary text-primary-foreground text-lg md:size-12 md:text-xl"
              )}
              aria-label={`Întrebarea numărul ${questionNumber}`}
            >
              {questionNumber}
            </span>
            <div className="flex min-w-0 flex-col gap-0 leading-tight">
              <span className="text-xs font-semibold uppercase tracking-[0.18em] text-muted-foreground sm:text-sm">
                Întrebare
              </span>
              {isMultipleChoice ? (
                <span
                  data-testid="multi-answer-notice"
                  className="text-xs font-normal text-slate-500 dark:text-slate-400 sm:text-sm"
                >
                  • Alegere multiplă
                </span>
              ) : null}
            </div>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleBookmark}
            className={cn(
              "relative z-10 shrink-0 transition-colors",
              isBookmarked
                ? "text-primary hover:text-primary/80"
                : "text-muted-foreground hover:text-foreground"
            )}
            aria-label={isBookmarked ? "Remove bookmark" : "Add bookmark"}
          >
            <Bookmark
              className={cn("size-5", isBookmarked && "fill-current")}
            />
          </Button>
        </div>
      </CardHeader>
      <CardContent className="pt-0">
        <p className="text-pretty text-xl font-medium leading-relaxed text-foreground md:text-2xl lg:text-[1.65rem] lg:leading-snug">
          {questionText}
        </p>
      </CardContent>
    </Card>
  )
}
