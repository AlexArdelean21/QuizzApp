"use client"

import { useRouter, useSearchParams } from "next/navigation"
import type { ExamOption } from "@/lib/student-stats/types"

type Props = {
  exams: ExamOption[]
  selectedExamId: number
}

export function StudentDetailExamSelect({ exams, selectedExamId }: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()

  return (
    <label className="flex w-full max-w-sm flex-col gap-1 text-sm">
      <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
        Examen
      </span>
      <select
        value={selectedExamId}
        onChange={(event) => {
          const params = new URLSearchParams(searchParams.toString())
          params.set("examen_id", event.target.value)
          router.replace(`?${params.toString()}`)
        }}
        className="h-9 rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
      >
        {exams.map((exam) => (
          <option key={exam.id} value={exam.id}>
            {exam.nume_examen}
          </option>
        ))}
      </select>
    </label>
  )
}
