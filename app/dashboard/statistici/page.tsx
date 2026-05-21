import { Suspense } from "react"
import { redirect } from "next/navigation"
import Link from "next/link"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { fetchAccessibleExams } from "@/lib/quiz/fetch-random-intrebari"
import { StatisticsHeader } from "@/components/statistici/statistics-header"
import { StatisticsData } from "@/components/statistici/statistics-data"
import { StatisticsSkeleton } from "@/components/statistici/statistics-skeleton"

// The dashboard is dynamic per-request because it depends on:
//   - the signed-in user (auth.getUser),
//   - the `examen` query param (the active exam in the sidebar context).
// `searchParams` already opts the page into request-time rendering.
//
// FCP optimization: only the cheap "who is this user / which exams can they
// see" work happens before we return JSX. The heavy aggregation lives in
// <StatisticsData />, which streams in under a Suspense boundary so the
// header and skeleton paint immediately.
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

  return (
    <main className="relative mx-auto w-full max-w-6xl px-4 py-10 sm:px-6 lg:px-8 lg:py-14">
      <StatisticsHeader exams={exams} selectedExam={selectedExam} />

      {/* `key` on the boundary forces the skeleton to reappear whenever the
          user picks a different exam, instead of showing stale data + spinner. */}
      <Suspense key={selectedExam.id} fallback={<StatisticsSkeleton />}>
        <StatisticsData userId={user.id} examenId={selectedExam.id} />
      </Suspense>
    </main>
  )
}
