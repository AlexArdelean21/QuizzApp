import { Activity, BookOpen, HelpCircle, Users } from "lucide-react"
import { getAdminStats } from "@/app/admin/actions"
import { AdminRefreshButton } from "@/components/admin/AdminRefreshButton"
import { AnimatedNumber } from "@/components/admin/AnimatedNumber"
import { StatsCarousel } from "@/components/ui/stats-carousel"

const cards = [
  {
    key: "totalExamene",
    title: "Total Examene",
    description: "Examene active în platformă",
    icon: BookOpen,
    accent: "from-blue-500/15 to-blue-500/0 text-blue-600 dark:text-blue-300",
    iconBg: "bg-blue-500/15",
  },
  {
    key: "utilizatoriActivi7Zile",
    title: "Active Users (7 zile)",
    description: "Utilizatori activi în ultima săptămână",
    icon: Activity,
    accent: "from-emerald-500/15 to-emerald-500/0 text-emerald-600 dark:text-emerald-300",
    iconBg: "bg-emerald-500/15",
  },
  {
    key: "totalIntrebari",
    title: "Total Întrebări",
    description: "Întrebări gestionate",
    icon: HelpCircle,
    accent: "from-amber-500/15 to-amber-500/0 text-amber-600 dark:text-amber-300",
    iconBg: "bg-amber-500/15",
  },
  {
    key: "totalUtilizatori",
    title: "Total Utilizatori",
    description: "Toți utilizatorii înregistrați",
    icon: Users,
    accent: "from-violet-500/15 to-violet-500/0 text-violet-600 dark:text-violet-300",
    iconBg: "bg-violet-500/15",
  },
] as const

type StatsCardKey = (typeof cards)[number]["key"]

export async function AnalyticsOverview({
  scopeLabel,
}: {
  scopeLabel?: string
}) {
  const result = await getAdminStats()
    .then((stats) => ({ stats, error: null as string | null }))
    .catch((error: unknown) => ({
      stats: null,
      error: error instanceof Error ? error.message : "Nu s-au putut încărca statisticile.",
    }))

  if (result.error || !result.stats) {
    return (
      <section className="rounded-xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-300">
        {result.error}
      </section>
    )
  }

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Dashboard
          </p>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Statistici generale
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            {scopeLabel ?? "Indicatori rapizi pentru utilizatori, examene și activitate recentă."}
          </p>
        </div>
        <AdminRefreshButton />
      </div>

      {/* Mobile carousel */}
      <div className="md:hidden">
        <StatsCarousel>
          {cards.map((card) => {
            const Icon = card.icon
            const value = result.stats[card.key as StatsCardKey]
            return (
              <article
                key={card.key}
                className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
              >
                <div
                  className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent} opacity-60`}
                  aria-hidden="true"
                />
                <div className="relative flex items-start justify-between gap-2">
                  <div>
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      {card.title}
                    </p>
                    <p className="mt-3 text-3xl font-semibold text-slate-900 dark:text-white">
                      <AnimatedNumber value={value} />
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.description}</p>
                  </div>
                  <div className={`inline-flex size-10 items-center justify-center rounded-xl ${card.iconBg}`}>
                    <Icon className="size-5 text-slate-700 dark:text-white" />
                  </div>
                </div>
              </article>
            )
          })}
        </StatsCarousel>
      </div>

      {/* Desktop grid */}
      <div className="hidden grid-cols-2 gap-3 md:grid xl:grid-cols-4">
        {cards.map((card, idx) => {
          const Icon = card.icon
          const value = result.stats[card.key as StatsCardKey]
          return (
            <article
              key={card.key}
              style={{ animationDelay: `${idx * 60}ms` }}
              className="stagger-in group relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-4 shadow-sm transition-all hover:-translate-y-0.5 hover:shadow-md dark:border-slate-800 dark:bg-slate-900"
            >
              <div
                className={`pointer-events-none absolute inset-0 bg-gradient-to-br ${card.accent} opacity-60 transition-opacity group-hover:opacity-100`}
                aria-hidden="true"
              />
              <div className="relative flex items-start justify-between gap-2">
                <div>
                  <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                    {card.title}
                  </p>
                  <p className="mt-3 text-2xl font-semibold text-slate-900 sm:text-3xl dark:text-white">
                    <AnimatedNumber value={value} />
                  </p>
                  <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">{card.description}</p>
                </div>
                <div className={`inline-flex size-8 items-center justify-center rounded-xl sm:size-10 ${card.iconBg}`}>
                  <Icon className="size-4 text-slate-700 dark:text-white sm:size-5" />
                </div>
              </div>
            </article>
          )
        })}
      </div>
    </section>
  )
}
