import { Activity, BookOpen, HelpCircle, Users } from "lucide-react"
import { getAdminStats } from "@/app/admin/actions"
import { AdminRefreshButton } from "@/components/admin/AdminRefreshButton"

const cards = [
  {
    key: "totalUtilizatori",
    title: "Total Utilizatori",
    icon: Users,
    accent: "text-blue-500",
  },
  {
    key: "totalExamene",
    title: "Total Examene",
    icon: BookOpen,
    accent: "text-violet-500",
  },
  {
    key: "totalIntrebari",
    title: "Total Întrebări",
    icon: HelpCircle,
    accent: "text-amber-500",
  },
  {
    key: "utilizatoriActivi7Zile",
    title: "Utilizatori Activi (7 zile)",
    icon: Activity,
    accent: "text-emerald-500",
  },
] as const

export async function AnalyticsOverview() {
  const result = await getAdminStats()
    .then((stats) => ({ stats, error: null as string | null }))
    .catch((error: unknown) => ({
      stats: null,
      error: error instanceof Error ? error.message : "Nu s-au putut încărca statisticile.",
    }))

  if (result.error || !result.stats) {
    return (
      <section className="rounded-xl border border-destructive/40 bg-destructive/10 p-4 text-sm text-destructive">
        {result.error}
      </section>
    )
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <div className="mb-4 flex items-start justify-between gap-3">
        <div>
          <h2 className="text-lg font-semibold text-foreground">Analytics Overview</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Indicatori rapizi pentru utilizatori, examene și activitate recentă.
          </p>
        </div>
        <AdminRefreshButton />
      </div>

      <div className="grid grid-cols-2 gap-3 md:grid-cols-4">
        {cards.map((card) => {
          const Icon = card.icon
          const value = result.stats[card.key]

          return (
            <div
              key={card.key}
              className="rounded-lg border border-border bg-background/60 p-4 transition-colors hover:bg-background"
            >
              <div className="flex items-center justify-between">
                <p className="text-xs font-medium text-muted-foreground">{card.title}</p>
                <Icon className={`size-4 ${card.accent}`} />
              </div>
              <p className="mt-3 text-2xl font-semibold text-foreground">{value}</p>
            </div>
          )
        })}
      </div>
    </section>
  )
}
