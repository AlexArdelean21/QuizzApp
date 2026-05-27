import Link from "next/link"
import { notFound, redirect } from "next/navigation"
import { ArrowLeft } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { normalizeRole } from "@/lib/auth/roles"
import { MasteryRing } from "@/components/statistici/mastery-ring"
import { EvolutionChart } from "@/components/statistici/evolution-chart"
import { StatTile } from "@/components/statistici/mini-tiles"
import { StudentDetailExamSelect } from "@/components/admin/student-stats/StudentDetailExamSelect"
import { formatDurationLabel, type SimulationPoint } from "@/lib/quiz/statistics"
import type { ExamOption, StudentDetailHistoryPoint, StudentDetailStats } from "@/lib/student-stats/types"

type Props = {
  params: Promise<{ user_id: string }>
  searchParams: Promise<{ examen_id?: string }>
}

function parseExamId(value: string | undefined) {
  const id = Number(value)
  if (!Number.isFinite(id) || id <= 0) return null
  return Math.floor(id)
}

function mapHistoryPoints(input: StudentDetailHistoryPoint[] | null): SimulationPoint[] {
  if (!Array.isArray(input)) return []
  return input
    .map((point) => {
      const finishedAt = point.finished_at ?? point.started_at
      if (!finishedAt) return null
      return {
        id: Number(point.id ?? 0),
        finishedAt,
        scorePct: Number(point.scor_procent ?? 0),
        correct: Number(point.raspunsuri_corecte ?? 0),
        total: Number(point.total_intrebari ?? 0),
        durationSec: Number(point.durata_secunde ?? 0),
        timedOut: Boolean(point.timed_out),
      }
    })
    .filter((point): point is SimulationPoint => Boolean(point))
    .sort((a, b) => new Date(a.finishedAt).getTime() - new Date(b.finishedAt).getTime())
}

export default async function StudentDetailPage({ params, searchParams }: Props) {
  const { user_id: userId } = await params
  const { examen_id: examenIdParam } = await searchParams
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) notFound()

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  const role = normalizeRole(profile?.role)
  if (role !== "super_admin" && role !== "org_admin") {
    notFound()
  }

  const { data: targetProfile } = await supabase
    .from("profiles")
    .select("id, nume, email, org_id, role, organizatii(nume)")
    .eq("id", userId)
    .maybeSingle()

  if (!targetProfile?.id) {
    notFound()
  }

  const targetRole = normalizeRole(targetProfile.role as string | null | undefined)
  const targetOrgId = targetProfile.org_id ? String(targetProfile.org_id) : null

  if (!targetOrgId) {
    notFound()
  }

  const { data: canViewOrg } = await supabase.rpc("can_view_org_stats", {
    p_org_id: targetOrgId,
  })
  if (!canViewOrg) {
    notFound()
  }

  const nowIso = new Date().toISOString()
  let exams: ExamOption[] = []

  if (targetRole === "org_admin" || targetRole === "super_admin") {
    const { data: examRows, error: examsError } = await supabase
      .from("examene")
      .select("id, nume_examen, intrebari_simulare")
      .eq("org_id", targetOrgId)
      .order("nume_examen", { ascending: true })
    if (examsError) throw new Error(examsError.message)

    exams = (examRows ?? []).map((exam) => ({
      id: Number(exam.id),
      nume_examen: String(exam.nume_examen ?? `Examen ${exam.id}`),
      intrebari_simulare: exam.intrebari_simulare ?? null,
    }))
  } else {
    const { data: examRows, error: examsError } = await supabase
      .from("acces_examene")
      .select("data_expirare, examen_id, examene!inner(id, nume_examen, intrebari_simulare)")
      .eq("user_id", userId)
    if (examsError) throw new Error(examsError.message)

    exams = ((examRows ?? []) as Array<{
      data_expirare: string | null
      examen_id: number
      examene: { id: number; nume_examen: string | null; intrebari_simulare: number | null } | null
    }>)
      .filter((row) => !row.data_expirare || new Date(row.data_expirare).getTime() > new Date(nowIso).getTime())
      .map((row) => ({
        id: Number(row.examene?.id ?? row.examen_id),
        nume_examen: String(row.examene?.nume_examen ?? `Examen ${row.examen_id}`),
        intrebari_simulare: row.examene?.intrebari_simulare ?? null,
      }))
  }

  exams = exams
    .filter((exam) => Number.isFinite(exam.id) && exam.id > 0)
    .sort((a, b) => a.nume_examen.localeCompare(b.nume_examen, "ro"))
    .filter((exam, idx, arr) => arr.findIndex((candidate) => candidate.id === exam.id) === idx)

  if (exams.length === 0) {
    return (
      <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="space-y-6">
          <div className="rounded-xl border bg-card p-6">
            <Link
              href="/dashboard/admin/elevi"
              className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
            >
              <ArrowLeft className="size-4" />
              Înapoi la lista de elevi
            </Link>
            <h1 className="mt-4 text-2xl font-semibold text-foreground">
              {String(targetProfile.nume ?? "Elev")}
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              {String(targetProfile.email ?? "—")} · Organizație:{" "}
              {String((targetProfile.organizatii as { nume?: string } | null)?.nume ?? "—")}
            </p>
          </div>
          <div className="rounded-xl border bg-card p-12 text-center">
            <p className="text-base font-medium text-foreground">
              Acest utilizator nu are acces la niciun examen din această organizație.
            </p>
          </div>
        </div>
      </main>
    )
  }

  const requestedExamId = parseExamId(examenIdParam)
  const selectedExamId =
    requestedExamId && exams.some((exam) => exam.id === requestedExamId) ? requestedExamId : exams[0].id

  if (!requestedExamId || requestedExamId !== selectedExamId) {
    redirect(`/dashboard/admin/elevi/${userId}?examen_id=${selectedExamId}`)
  }

  const { data, error } = await supabase.rpc("get_student_detail_stats", {
    p_user_id: userId,
    p_examen_id: selectedExamId,
    p_history_n: 20,
  })

  if (error) throw new Error(error.message)
  if (data == null) notFound()

  const row = ((data ?? []) as StudentDetailStats[])[0]
  const fallbackRow: StudentDetailStats = {
    user_id: String(targetProfile.id),
    nume: (targetProfile.nume as string | null) ?? null,
    email: (targetProfile.email as string | null) ?? null,
    org_id: String(targetProfile.org_id ?? ""),
    org_nume: (targetProfile.organizatii as { nume?: string } | null)?.nume ?? null,
    examen_nume: exams.find((exam) => exam.id === selectedExamId)?.nume_examen ?? null,
    prag_trecere: 0,
    intrebari_simulare: Number(exams.find((exam) => exam.id === selectedExamId)?.intrebari_simulare ?? 25),
    simulari_finalizate: 0,
    scor_mediu: null,
    rata_trecere_pct: null,
    ultima_activitate: null,
    nivel_pregatire_pct: 0,
    timp_total_secunde: 0,
    istoric_simulari: [],
  }
  const safeRow = row ?? fallbackRow

  const selectedExam: ExamOption | undefined = exams.find((exam) => exam.id === selectedExamId)
  const chartData = mapHistoryPoints(safeRow.istoric_simulari)
  const intrebariSimulare = Number(
    safeRow.intrebari_simulare ?? selectedExam?.intrebari_simulare ?? 25,
  )
  const pragCount = Number(safeRow.prag_trecere ?? 0)
  const pragPct =
    intrebariSimulare > 0 ? (pragCount / intrebariSimulare) * 100 : 0
  const passRate =
    safeRow.rata_trecere_pct == null ? "—" : `${Number(safeRow.rata_trecere_pct).toFixed(1)}%`
  const scoreAverage =
    safeRow.scor_mediu == null ? "—" : `${Number(safeRow.scor_mediu).toFixed(1)}%`
  const masteryPct = Number(safeRow.nivel_pregatire_pct ?? 0)
  const distinctCorrect = Math.round((masteryPct / 100) * intrebariSimulare)

  return (
    <main className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="space-y-6">
        <div className="rounded-xl border bg-card p-6">
          <Link
            href="/dashboard/admin/elevi"
            className="inline-flex items-center gap-2 text-sm text-muted-foreground transition hover:text-foreground"
          >
            <ArrowLeft className="size-4" />
            Înapoi la lista de elevi
          </Link>

          <h1 className="mt-4 text-2xl font-semibold text-foreground">{safeRow.nume ?? "Elev"}</h1>
          <p className="mt-1 text-sm text-muted-foreground">
            {safeRow.email ?? "—"} · Organizație: {safeRow.org_nume ?? "—"}
          </p>

          <div className="mt-4">
            <StudentDetailExamSelect exams={exams} selectedExamId={selectedExamId} />
          </div>
        </div>

        <section className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          <MasteryRing
            masteryPct={masteryPct}
            distinctCorrectCount={distinctCorrect}
            totalQuestions={intrebariSimulare}
            className="lg:col-span-4"
          />
          <EvolutionChart
            data={chartData}
            pragTrecerePct={pragPct}
            pragTrecere={pragCount}
            intrebariSimulare={intrebariSimulare}
            className="lg:col-span-8"
          />
        </section>

        <section className="grid grid-cols-1 gap-4 md:grid-cols-2 xl:grid-cols-4">
          <StatTile
            title="Timp dedicat"
            value={safeRow.timp_total_secunde > 0 ? formatDurationLabel(safeRow.timp_total_secunde) : "—"}
            description="Simulare + practică pentru examenul selectat."
            tone="primary"
          />
          <StatTile
            title="Simulări finalizate"
            value={safeRow.simulari_finalizate}
            description={`Scor mediu: ${scoreAverage}`}
            tone="emerald"
          />
          <StatTile
            title="Prag trecere"
            value={`${pragCount} / ${intrebariSimulare}`}
            description={`${pragPct.toFixed(0)}% minim pe simulare.`}
            tone="rose"
          />
          <StatTile
            title="Rată trecere"
            value={passRate}
            description="Procentul simulărilor care au atins pragul."
            tone="amber"
          />
        </section>
      </div>
    </main>
  )
}
