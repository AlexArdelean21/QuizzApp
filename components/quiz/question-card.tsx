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
}

export function QuestionCard({
  questionNumber,
  questionText,
  isBookmarked,
  onToggleBookmark,
}: QuestionCardProps) {
  return (
    <Card className="border-border bg-card">
      <CardHeader className="pb-4">
        <div className="flex items-start justify-between gap-4">
          <div className="flex items-center gap-3">
            <span className="flex size-8 items-center justify-center rounded-lg bg-primary/15 text-sm font-semibold text-primary">
              {questionNumber}
            </span>
            <span className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Question
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
        <p className="text-lg font-medium leading-relaxed text-foreground md:text-xl text-pretty">
          {questionText}
        </p>
      </CardContent>
    </Card>
  )
}
