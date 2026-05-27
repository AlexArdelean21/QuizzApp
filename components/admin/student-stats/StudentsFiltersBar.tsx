"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import { Search } from "lucide-react"
import type { AppRole } from "@/lib/auth/roles"
import type { ExamOption, OrganizationOption } from "@/lib/student-stats/types"

type Props = {
  role: AppRole
  organizations: OrganizationOption[]
  exams: ExamOption[]
  selectedOrgId: string | null
  selectedExamId: number | null
  currentSearch: string
}

export function StudentsFiltersBar({
  role,
  organizations,
  exams,
  selectedOrgId,
  selectedExamId,
  currentSearch,
}: Props) {
  const router = useRouter()
  const searchParams = useSearchParams()
  const [searchValue, setSearchValue] = useState(currentSearch)

  const isSuperAdmin = role === "super_admin"
  const selectedExamValue = selectedExamId ? String(selectedExamId) : ""

  const baseParams = useMemo(() => new URLSearchParams(searchParams.toString()), [searchParams])

  const replaceParams = useCallback((mutator: (params: URLSearchParams) => void) => {
    const params = new URLSearchParams(baseParams.toString())
    mutator(params)
    const query = params.toString()
    router.replace(query ? `?${query}` : "?")
  }, [baseParams, router])

  useEffect(() => {
    const handle = window.setTimeout(() => {
      const normalized = searchValue.trim()
      const current = currentSearch.trim()
      if (normalized === current) return
      replaceParams((params) => {
        if (normalized) params.set("q", normalized)
        else params.delete("q")
        params.set("page", "1")
      })
    }, 300)
    return () => window.clearTimeout(handle)
  }, [currentSearch, replaceParams, searchValue])

  return (
    <div className="flex flex-col gap-3 md:flex-row md:items-center">
      {isSuperAdmin ? (
        <label className="flex w-full flex-col gap-1 text-sm md:max-w-xs">
          <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
            Organizație
          </span>
          <select
            value={selectedOrgId ?? ""}
            onChange={(event) => {
              const nextOrgId = event.target.value
              replaceParams((params) => {
                if (nextOrgId) params.set("org_id", nextOrgId)
                else params.delete("org_id")
                params.delete("examen_id")
                params.set("page", "1")
              })
            }}
            className="h-9 rounded-md border bg-background px-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          >
            <option value="">Selectează organizația</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.nume}
              </option>
            ))}
          </select>
        </label>
      ) : null}

      <label className="flex w-full flex-col gap-1 text-sm md:max-w-xs">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Examen
        </span>
        <select
          value={selectedExamValue}
          onChange={(event) => {
            const nextExamId = event.target.value
            replaceParams((params) => {
              if (nextExamId) params.set("examen_id", nextExamId)
              else params.delete("examen_id")
              params.set("page", "1")
            })
          }}
          disabled={exams.length === 0}
          className="h-9 rounded-md border bg-background px-3 text-sm outline-none transition disabled:cursor-not-allowed disabled:opacity-60 focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
        >
          {exams.length === 0 ? (
            <option value="">Fără examene</option>
          ) : (
            exams.map((exam) => (
              <option key={exam.id} value={exam.id}>
                {exam.nume_examen}
              </option>
            ))
          )}
        </select>
      </label>

      <label className="flex w-full flex-col gap-1 text-sm md:ml-auto md:max-w-md">
        <span className="text-xs font-medium uppercase tracking-[0.14em] text-muted-foreground">
          Căutare
        </span>
        <div className="relative">
          <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
          <input
            type="text"
            value={searchValue}
            onChange={(event) => setSearchValue(event.target.value)}
            placeholder="Caută după nume sau email..."
            className="h-9 w-full rounded-md border bg-background py-2 pl-9 pr-3 text-sm outline-none transition focus-visible:border-ring focus-visible:ring-ring/50 focus-visible:ring-[3px]"
          />
        </div>
      </label>
    </div>
  )
}
