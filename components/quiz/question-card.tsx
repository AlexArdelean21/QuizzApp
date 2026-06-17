"use client"

import { useState } from "react"
import Image from "next/image"
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
  /** URL public imagine atașată. Null/undefined = fără imagine. */
  imageUrl?: string | null
}

export function QuestionCard({
  questionNumber,
  questionText,
  isBookmarked,
  onToggleBookmark,
  isMultipleChoice = false,
  imageUrl,
}: QuestionCardProps) {
  const [lightboxOpen, setLightboxOpen] = useState(false)
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
      {questionText ? (
        <p className="text-pretty text-xl font-medium leading-relaxed text-foreground md:text-2xl">
          {questionText}
        </p>
      ) : imageUrl ? null : (
        <p className="text-sm italic text-muted-foreground">Fără text</p>
      )}

      {imageUrl && (
        <>
          <div className="mt-5">
            <button
              type="button"
              onClick={() => setLightboxOpen(true)}
              className="group relative block w-full overflow-hidden rounded-xl border border-border/60 bg-muted/30 transition hover:border-border"
              aria-label="Mărește imaginea"
            >
              <Image
                src={imageUrl}
                alt="Imagine ilustrativă pentru întrebare"
                width={800}
                height={450}
                className="max-h-72 w-full object-contain transition group-hover:scale-[1.02]"
              />
              <div className="absolute inset-0 flex items-center justify-center opacity-0 transition group-hover:opacity-100">
                <span className="rounded-full bg-black/50 px-3 py-1 text-xs text-white backdrop-blur-sm">
                  Click pentru mărire
                </span>
              </div>
            </button>
          </div>

          {lightboxOpen && (
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center bg-black/80 p-4 backdrop-blur-sm"
              onClick={() => setLightboxOpen(false)}
            >
              <button
                type="button"
                className="absolute right-4 top-4 rounded-full bg-white/10 p-2 text-white hover:bg-white/20"
                onClick={() => setLightboxOpen(false)}
                aria-label="Închide"
              >
                <svg
                  className="size-5"
                  viewBox="0 0 24 24"
                  fill="none"
                  stroke="currentColor"
                  strokeWidth="2"
                >
                  <path d="M18 6 6 18M6 6l12 12" />
                </svg>
              </button>
              <Image
                src={imageUrl}
                alt="Imagine mărită"
                width={1200}
                height={900}
                className="max-h-[90vh] max-w-[90vw] rounded-xl object-contain shadow-2xl"
                onClick={(e) => e.stopPropagation()}
              />
            </div>
          )}
        </>
      )}
    </div>
  )
}
