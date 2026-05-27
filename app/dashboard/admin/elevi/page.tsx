import { Suspense } from "react"
import { notFound } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { normalizeRole } from "@/lib/auth/roles"
import { StudentsFiltersBar } from "@/components/admin/student-stats/StudentsFiltersBar"
import { StudentsTableClient } from "@/components/admin/student-stats/StudentsTableClient"
import type { ExamOption, OrganizationOption, StudentStatsRow } from "@/lib/student-stats/types"

const PAGE_SIZE = 25

type RawSearchParams = {
  org_id?: string
  examen_id?: string
  q?: string
  sort?: string
  page?: string
}

type Props = {
  searchParams: Promise<RawSearchParams>
}

function normalizePage(value: string | undefined) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed < 1) return 1
  return Math.floor(parsed)
}

function normalizeExamId(value: string | undefined) {
  const parsed = Number(value)
  if (!Number.isFinite(parsed) || parsed <= 0) return null
  return Math.floor(parsed)
}

function TableSkeleton() {
  return (
    <div className="rounded-xl border bg-card p-4">
      <div className="space-y-3">
        {Array.from({ length: 5 }).map((_, idx) => (
          <div key={idx} className="h-10 animate-pulse rounded bg-muted" />
        ))}
      </div>
    </div>
  )
}

async function StudentsTableSection({
  orgId,
  examenId,
  search,
  sort,
  page,
  examPassThresholdPct,
}: {
  orgId: string
  examenId: number
  search: string
  sort: string
  page: number
  examPassThresholdPct: number | null
}) {
  const supabase = await createSupabaseServerClient()
  const offset = (page - 1) * PAGE_SIZE

  const { data, error } = await supabase.rpc("get_org_students_stats", {
    p_org_id: orgId,
    p_examen_id: examenId,
    p_search: search || null,
    p_sort: sort || "nume_asc",
    p_limit: PAGE_SIZE,
    p_offset: offset,
  })

  if (error) {
    throw new Error(error.message)
  }

  const rows = (data ?? []) as StudentStatsRow[]
  const totalCount = rows[0]?.total_count ?? 0

  const emptyState = search
    ? {
        title: `Niciun utilizator nu corespunde căutării «${search}».`,
      }
    : {
        title: "Nu există utilizatori în această organizație.",
      }

  return (
    <StudentsTableClient
      rows={rows}
      totalCount={totalCount}
      page={page}
      pageSize={PAGE_SIZE}
      currentSort={sort}
      currentSearch={search}
      examenId={examenId}
      emptyState={emptyState}
      examPassThresholdPct={examPassThresholdPct}
    />
  )
}

export default async function AdminStudentsPage({ searchParams }: Props) {
  const params = await searchParams
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, org_id")
    .eq("id", user.id)
    .maybeSingle()

  const role = normalizeRole(profile?.role)
  if (role !== "super_admin" && role !== "org_admin") {
    notFound()
  }

  const page = normalizePage(params.page)
  const search = (params.q ?? "").trim()
  const sort = params.sort?.trim() || "nume_asc"

  const isSuperAdmin = role === "super_admin"
  const profileOrgId = profile?.org_id ? String(profile.org_id) : null
  const requestedOrgId = params.org_id?.trim() || null

  let organizations: OrganizationOption[] = []
  if (isSuperAdmin) {
    const { data } = await supabase
      .from("organizatii")
      .select("id, nume")
      .order("nume", { ascending: true })
    organizations = (data ?? []).map((org) => ({
      id: String(org.id),
      nume: String(org.nume ?? "Organizație"),
    }))
  }

  const validSuperAdminOrgId =
    isSuperAdmin && requestedOrgId && organizations.some((org) => org.id === requestedOrgId)
      ? requestedOrgId
      : null

  const resolvedOrgId = isSuperAdmin ? validSuperAdminOrgId : profileOrgId
  const requiresOrgPick = isSuperAdmin && !resolvedOrgId

  let exams: ExamOption[] = []
  if (resolvedOrgId) {
    const { data } = await supabase
      .from("examene")
      .select("id, nume_examen, intrebari_simulare")
      .eq("org_id", resolvedOrgId)
      .order("nume_examen", { ascending: true })
    exams = (data ?? []).map((exam) => ({
      id: Number(exam.id),
      nume_examen: String(exam.nume_examen ?? `Examen ${exam.id}`),
      intrebari_simulare: exam.intrebari_simulare,
    }))
  }

  const requestedExamId = normalizeExamId(params.examen_id)
  const resolvedExamId =
    requestedExamId && exams.some((exam) => exam.id === requestedExamId)
      ? requestedExamId
      : exams[0]?.id ?? null

  const selectedExam = exams.find((exam) => exam.id === resolvedExamId) ?? null
  let examPassThresholdPct: number | null = null
  if (resolvedExamId) {
    const { data } = await supabase
      .from("examene")
      .select("prag_trecere, intrebari_simulare")
      .eq("id", resolvedExamId)
      .maybeSingle()
    if (data?.prag_trecere != null && data?.intrebari_simulare) {
      const prag = Number(data.prag_trecere)
      const total = Number(data.intrebari_simulare)
      if (Number.isFinite(prag) && Number.isFinite(total) && total > 0) {
        examPassThresholdPct = (prag / total) * 100
      }
    }
  }

  const noExamsForOrg = Boolean(resolvedOrgId) && exams.length === 0

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <header className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <p className="text-xs font-medium uppercase tracking-[0.18em] text-slate-500 dark:text-slate-400">
            Statistici generale
          </p>
          <h1 className="mt-2 text-lg font-semibold text-slate-900 dark:text-white">
            Statistici utilizatori
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Monitorizează progresul elevilor pe examen, rata de trecere și nivelul de pregătire.
          </p>
          {requiresOrgPick ? (
            <p className="mt-3 text-sm text-slate-500 dark:text-slate-400">
              Alege o organizație pentru a vedea elevii.
            </p>
          ) : null}
        </header>

        <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
          <div className="border-b border-slate-200/70 pb-4 dark:border-slate-800">
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Lista elevi pe examen
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Filtrează după organizație, examen și căutare pentru a analiza progresul elevilor.
            </p>
          </div>

          <div className="mt-4 space-y-4">
            <StudentsFiltersBar
              key={`${resolvedOrgId ?? "no-org"}:${resolvedExamId ?? "no-exam"}:${search}`}
              role={role}
              organizations={organizations}
              exams={exams}
              selectedOrgId={resolvedOrgId}
              selectedExamId={resolvedExamId}
              currentSearch={search}
            />

            {requiresOrgPick ? (
              <div className="rounded-xl border bg-card p-12 text-center">
                <p className="text-base font-medium text-foreground">
                  Alege o organizație din meniul de sus.
                </p>
              </div>
            ) : noExamsForOrg ? (
              <div className="rounded-xl border bg-card p-12 text-center">
                <p className="text-base font-medium text-foreground">
                  Această organizație nu are examene configurate.
                </p>
              </div>
            ) : resolvedOrgId && resolvedExamId ? (
              <Suspense
                key={`${resolvedOrgId}:${resolvedExamId}:${search}:${sort}:${page}`}
                fallback={<TableSkeleton />}
              >
                <StudentsTableSection
                  orgId={resolvedOrgId}
                  examenId={resolvedExamId}
                  search={search}
                  sort={sort}
                  page={page}
                  examPassThresholdPct={examPassThresholdPct}
                />
              </Suspense>
            ) : (
              <div className="rounded-xl border bg-card p-12 text-center">
                <p className="text-base font-medium text-foreground">
                  Selectează un examen pentru a afișa statistici.
                </p>
                {selectedExam ? null : (
                  <p className="mt-2 text-sm text-muted-foreground">
                    Organizația selectată nu are examene accesibile momentan.
                  </p>
                )}
              </div>
            )}
          </div>
        </section>
      </div>
    </main>
  )
}
