"use client"

import { useEffect, useRef, useState } from "react"
import { ChevronDown } from "lucide-react"
import type { ExamSummary } from "@/lib/quiz/types"

type Props = {
  exams: ExamSummary[]
  selectedId: number
  onChange: (id: number) => void
}

export function ExamSelector({ exams, selectedId, onChange }: Props) {
  const [open, setOpen] = useState(false)
  const containerRef = useRef<HTMLDivElement | null>(null)

  useEffect(() => {
    if (!open) return
    const handleClickOutside = (event: MouseEvent) => {
      const target = event.target as Node | null
      if (!target || !containerRef.current?.contains(target)) {
        setOpen(false)
      }
    }
    document.addEventListener("mousedown", handleClickOutside)
    return () => document.removeEventListener("mousedown", handleClickOutside)
  }, [open])

  const selectedExam = exams.find((option) => option.id === selectedId) ?? exams[0]

  if (exams.length <= 1) {
    return (
      <div className="rounded-xl border border-border/60 bg-secondary/40 px-4 py-2 text-sm text-muted-foreground">
        {selectedExam?.name ?? "Examen unic"}
      </div>
    )
  }

  return (
    <div ref={containerRef} className="relative z-[120] w-full sm:w-72">
      <button
        type="button"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-xl border border-border/60 bg-card/70 px-4 py-2.5 text-sm font-medium text-foreground shadow-sm backdrop-blur transition hover:border-primary/40 hover:bg-card focus:outline-none focus:ring-2 focus:ring-primary/40"
      >
        <span className="truncate">{selectedExam?.name ?? "Selectează examen"}</span>
        <ChevronDown className={`size-4 text-muted-foreground transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {open && (
        <div
          role="listbox"
          className="absolute right-0 z-[120] mt-2 w-full overflow-hidden rounded-xl border border-border/60 bg-popover/95 shadow-2xl backdrop-blur-md"
        >
          {exams.map((exam) => {
            const isActive = exam.id === selectedId
            return (
              <button
                key={exam.id}
                type="button"
                role="option"
                aria-selected={isActive}
                onClick={() => {
                  setOpen(false)
                  if (exam.id !== selectedId) onChange(exam.id)
                }}
                className={`flex w-full items-center justify-between px-4 py-2 text-left text-sm transition ${
                  isActive
                    ? "bg-primary/15 text-primary"
                    : "text-foreground hover:bg-secondary/60"
                }`}
              >
                <span className="truncate">{exam.name}</span>
                <span className="ml-3 shrink-0 text-xs text-muted-foreground">
                  {exam.intrebariSimulare} q
                </span>
              </button>
            )
          })}
        </div>
      )}
    </div>
  )
}
