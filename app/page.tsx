import { QuizInterface } from "@/components/quiz/quiz-interface-v2"
import { Homepage } from "@/components/homepage/Homepage"
import { AppChrome } from "@/components/app-chrome"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getPublicStats } from "@/lib/public-stats"

export const dynamic = "force-dynamic"

export default async function Page() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (user) {
    return (
      <AppChrome>
        <QuizInterface />
      </AppChrome>
    )
  }

  const stats = await getPublicStats()
  return <Homepage stats={stats} />
}
