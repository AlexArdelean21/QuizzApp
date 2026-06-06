import { QuizInterface } from "@/components/quiz/quiz-interface-v2"
import { Homepage } from "@/components/homepage/Homepage"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getPublicStats } from "@/lib/public-stats"

export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    return <QuizInterface />
  }

  const stats = await getPublicStats()
  return <Homepage stats={stats} />
}
