import { redirect } from "next/navigation"
import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { fetchAccessibleExams } from "@/lib/quiz/fetch-random-intrebari"
import { getExamStatistics } from "@/lib/quiz/statistics"
import { StatisticsDashboard } from "@/components/statistici/statistics-dashboard"

// The dashboard is dynamic per-request because it depends on:
//   - the signed-in user (auth.getUser),
//   - the `examen` query param (the active exam in the sidebar context).
// `searchParams` already opts the page into request-time rendering.
export default async function StatisticsPage({
  searchParams,
}: {
  searchParams: Promise<{ examen?: string }>
}) {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()
  if (!user) {
    redirect("/login?next=/dashboard/statistici")
  }

  const exams = await fetchAccessibleExams(supabase, user.id)

  if (exams.length === 0) {
    return (
      <main className="mx-auto flex w-full max-w-5xl flex-col items-center justify-center gap-4 px-4 py-24 text-center">
        <h1 className="text-2xl font-semibold text-foreground">Nicio statistică disponibilă</h1>
        <p className="max-w-md text-sm text-muted-foreground">
          Nu ai acces la niciun examen momentan. Contactează administratorul pentru a deschide acces și revino aici după prima simulare.
        </p>
        <Link
          href="/"
          className="rounded-lg bg-primary px-4 py-2 text-sm font-medium text-primary-foreground transition hover:bg-primary/90"
        >
          Înapoi la quiz
        </Link>
      </main>
    )
  }

  const { examen } = await searchParams
  const requestedId = Number(examen)
  const selectedExam =
    (Number.isFinite(requestedId) && requestedId > 0
      ? exams.find((option) => option.id === requestedId)
      : null) ?? exams[0]

  const stats = await getExamStatistics(supabase, user.id, selectedExam.id)

  return (
    <StatisticsDashboard
      exams={exams}
      selectedExam={selectedExam}
      stats={stats}
    />
  )
}
