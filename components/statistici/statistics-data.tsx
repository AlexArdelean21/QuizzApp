import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getExamStatistics } from "@/lib/quiz/statistics"
import { StatisticsBento } from "./statistics-bento"

type Props = {
  userId: string
  examenId: number
}

// Async server component that owns the slow statistics query so the rest of
// the route (header, layout chrome) can stream to the browser immediately and
// a Suspense skeleton fills this slot until the data resolves.
export async function StatisticsData({ userId, examenId }: Props) {
  const supabase = await createSupabaseServerClient()
  const stats = await getExamStatistics(supabase, userId, examenId)
  return <StatisticsBento stats={stats} />
}
