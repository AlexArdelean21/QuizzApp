"use client"

import { useMemo } from "react"
import { usePathname, useRouter, useSearchParams } from "next/navigation"
import { formatDistanceToNow } from "date-fns"
import { ro } from "date-fns/locale"
import { CircleHelp } from "lucide-react"
import { DataTable, type Column } from "@/components/ui/data-table"
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip"
import { cn } from "@/lib/utils"
import type { StudentStatsRow } from "@/lib/student-stats/types"

type Props = {
  rows: StudentStatsRow[]
  totalCount: number
  page: number
  pageSize: number
  currentSort: string
  currentSearch: string
  examenId: number | null
  emptyState: { title: string; description?: string }
  examPassThresholdPct: number | null
}

function formatPercent(value: number | null) {
  if (value == null || !Number.isFinite(value)) return "—"
  return `${value.toFixed(1)}%`
}

function relativeTime(value: string | null) {
  if (!value) return "—"
  return formatDistanceToNow(new Date(value), { addSuffix: true, locale: ro })
}

function formatDuration(secs: number): string {
  if (!secs) return "—"
  if (secs < 60) return `${secs}s`
  if (secs < 3600) return `${Math.floor(secs / 60)} min`
  const h = Math.floor(secs / 3600)
  const m = Math.floor((secs % 3600) / 60)
  return m ? `${h}h ${m}m` : `${h}h`
}

export function StudentsTableClient({
  rows,
  totalCount,
  page,
  pageSize,
  currentSort,
  currentSearch,
  examenId,
  emptyState,
  examPassThresholdPct,
}: Props) {
  const router = useRouter()
  const pathname = usePathname()
  const searchParams = useSearchParams()

  const buildHref = ({
    page: nextPage,
    sort: nextSort,
    search,
  }: {
    page?: number
    sort?: string
    search?: string
  }) => {
    const params = new URLSearchParams(searchParams.toString())
    if (typeof nextPage === "number") params.set("page", String(nextPage))
    if (typeof nextSort !== "undefined") {
      if (nextSort) params.set("sort", nextSort)
      else params.delete("sort")
    }
    if (typeof search !== "undefined") {
      if (search) params.set("q", search)
      else params.delete("q")
    }
    const query = params.toString()
    return query ? `${pathname}?${query}` : pathname
  }

  const columns = useMemo<Column<StudentStatsRow>[]>(
    () => [
      {
        key: "nume",
        header: "Nume",
        sortable: true,
        sortKey: "nume_asc",
        render: (row) => (
          <div>
            <p className="font-medium text-foreground">{row.nume ?? "—"}</p>
            <p className="text-xs text-muted-foreground">{row.email ?? "—"}</p>
          </div>
        ),
      },
      {
        key: "scor",
        header: "Scor mediu",
        sortable: true,
        sortKey: "scor_desc",
        align: "right",
        render: (row) => <span className="tabular-nums">{formatPercent(row.scor_mediu)}</span>,
      },
      {
        key: "simulari",
        header: "Simulări finalizate",
        sortable: true,
        sortKey: "simulari_desc",
        align: "right",
        render: (row) => <span className="tabular-nums">{row.simulari_finalizate}</span>,
      },
      {
        key: "rata",
        header: "Rată trecere",
        align: "center",
        render: (row) => {
          if (row.rata_trecere_pct == null) {
            return (
              <span className="inline-flex rounded-full bg-muted px-2 py-0.5 text-xs text-muted-foreground">
                —
              </span>
            )
          }
          const isPassed =
            examPassThresholdPct == null
              ? row.rata_trecere_pct >= 50
              : row.rata_trecere_pct >= examPassThresholdPct
          return (
            <span
              className={cn(
                "inline-flex rounded-full px-2 py-0.5 text-xs font-medium",
                isPassed
                  ? "bg-emerald-500/15 text-emerald-700 dark:text-emerald-300"
                  : "bg-rose-500/15 text-rose-700 dark:text-rose-300",
              )}
            >
              {formatPercent(row.rata_trecere_pct)}
            </span>
          )
        },
      },
      {
        key: "pregatire",
        header: "Nivel pregătire",
        render: (row) => {
          const pct = row.nivel_pregatire_pct
          return (
            <div className="space-y-1">
              <p className="text-sm tabular-nums">{formatPercent(pct)}</p>
              <div className="h-1.5 w-full rounded-full bg-muted">
                <div
                  className="h-1.5 rounded-full bg-primary transition-all"
                  style={{ width: `${Math.max(0, Math.min(100, pct ?? 0))}%` }}
                />
              </div>
            </div>
          )
        },
      },
      {
        key: "examene",
        header: (
          <span className="inline-flex items-center gap-1">
            Activitate examene
            <Tooltip>
              <TooltipTrigger asChild>
                <span className="inline-flex text-muted-foreground hover:text-foreground">
                  <CircleHelp className="size-3.5" />
                </span>
              </TooltipTrigger>
              <TooltipContent>
                Examene participate / examene cu acces in aceasta organizatie.
              </TooltipContent>
            </Tooltip>
          </span>
        ),
        align: "center",
        render: (row) => (
          <span className="tabular-nums">
            {row.examene_participate} / {row.examene_acces}
          </span>
        ),
      },
      {
        key: "timp",
        header: "Timp dedicat",
        sortable: true,
        sortKey: "timp_desc",
        align: "right",
        render: (row) => <span className="tabular-nums">{formatDuration(row.timp_dedicat_secunde)}</span>,
      },
      {
        key: "ultima",
        header: "Ultima activitate",
        sortable: true,
        sortKey: "ultima_activitate_desc",
        render: (row) => <span className="text-sm text-muted-foreground">{relativeTime(row.ultima_activitate)}</span>,
      },
    ],
    [examPassThresholdPct],
  )

  return (
    <DataTable
      key={currentSearch}
      rows={rows}
      columns={columns}
      totalCount={totalCount}
      pageSize={pageSize}
      currentPage={page}
      currentSort={currentSort}
      currentSearch={currentSearch}
      emptyState={emptyState}
      availableSortKeys={[
        "nume_asc",
        "nume_desc",
        "scor_desc",
        "scor_asc",
        "simulari_desc",
        "timp_desc",
        "ultima_activitate_desc",
      ]}
      buildHref={buildHref}
      onRowClick={(row) => {
        if (!examenId) return
        router.push(`/dashboard/admin/elevi/${row.user_id}?examen_id=${examenId}`)
      }}
    />
  )
}
