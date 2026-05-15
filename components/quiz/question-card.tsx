"use client"

import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Button } from "@/components/ui/button"
import { Bookmark, Info } from "lucide-react"
import { cn } from "@/lib/utils"

interface QuestionCardProps {
  questionNumber: number
  questionText: string
  isBookmarked: boolean
  onToggleBookmark: () => void
  /**
   * When true, the card renders a clearly visible hint telling the user
   * that the current question has several correct variants.
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
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-4">
            <span
              className={cn(
                "flex size-14 shrink-0 items-center justify-center rounded-xl text-2xl font-bold leading-none shadow-lg ring-2 ring-primary/40",
                "bg-primary text-primary-foreground md:size-16 md:text-3xl"
              )}
              aria-label={`Întrebarea numărul ${questionNumber}`}
            >
              {questionNumber}
            </span>
            <span className="text-[0.7rem] font-semibold uppercase tracking-[0.2em] text-muted-foreground">
              Întrebare
            </span>
          </div>
          <Button
            variant="ghost"
            size="icon"
            onClick={onToggleBookmark}
            className={cn(
              "transition-colors",
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
      <CardContent>
        <p className="text-pretty text-xl font-medium leading-relaxed text-foreground md:text-2xl lg:text-[1.65rem] lg:leading-snug">
          {questionText}
        </p>
        {isMultipleChoice ? (
          <div
            data-testid="multi-answer-notice"
            className="mt-4 flex items-start gap-2 rounded-lg border border-amber-500/30 bg-amber-500/10 px-3 py-2 text-sm text-amber-700 dark:text-amber-300"
          >
            <Info className="mt-0.5 size-4 shrink-0" />
            <span>
              Această întrebare are mai multe răspunsuri corecte. Selectează toate variantele
              valabile.
            </span>
          </div>
        ) : null}
      </CardContent>
    </Card>
  )
}
