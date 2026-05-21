// Skeleton fallbacks for the /admin route. Two pieces:
//   * `AnalyticsOverviewSkeleton` — the four KPI cards at the top.
//   * `AdminDashboardSkeleton`    — the lower bento (org breakdown for super
//                                  admins, plus exam + user management blocks).
//
// All elements share a single `animate-pulse` ancestor so the rhythm reads as
// one calm pulse, not a chaotic light show. Tones follow the rest of the app:
// slate-200 / slate-800.

const tileBase =
  "rounded-2xl border border-slate-200/70 bg-slate-200/60 dark:border-slate-800/70 dark:bg-slate-800/50"

function Bar({ className }: { className?: string }) {
  return (
    <div className={`rounded-md bg-slate-300/70 dark:bg-slate-700/70 ${className ?? ""}`} />
  )
}

export function AnalyticsOverviewSkeleton() {
  return (
    <section className="flex animate-pulse flex-col gap-4" aria-hidden role="status" aria-label="Se încarcă statisticile">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div className="flex flex-col gap-2">
          <Bar className="h-3 w-20" />
          <Bar className="h-6 w-56" />
          <Bar className="h-3 w-72" />
        </div>
        <Bar className="h-9 w-28" />
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        {[0, 1, 2, 3].map((index) => (
          <article
            key={index}
            className="relative overflow-hidden rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
          >
            <div className="flex items-start justify-between gap-2">
              <div className="flex flex-col gap-3">
                <Bar className="h-3 w-24" />
                <Bar className="h-8 w-20" />
                <Bar className="h-3 w-32" />
              </div>
              <Bar className="size-10 rounded-xl" />
            </div>
          </article>
        ))}
      </div>
    </section>
  )
}

type AdminDashboardSkeletonProps = {
  isSuperAdmin: boolean
}

export function AdminDashboardSkeleton({ isSuperAdmin }: AdminDashboardSkeletonProps) {
  return (
    <div className="flex animate-pulse flex-col gap-6" aria-hidden role="status" aria-label="Se încarcă datele admin">
      {isSuperAdmin && (
        <section className="flex flex-col gap-4">
          <div className="flex flex-wrap items-end justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Bar className="h-3 w-24" />
              <Bar className="h-5 w-56" />
              <Bar className="h-3 w-80" />
            </div>
          </div>
          <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-3">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <div key={index} className={`${tileBase} h-32 p-5`}>
                <div className="flex h-full flex-col justify-between">
                  <Bar className="h-3 w-32" />
                  <Bar className="h-6 w-24" />
                  <Bar className="h-3 w-40" />
                </div>
              </div>
            ))}
          </div>
        </section>
      )}

      {/* Exam management block */}
      <section className={`${tileBase} p-6`}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Bar className="h-5 w-40" />
              <Bar className="h-3 w-64" />
            </div>
            <Bar className="h-9 w-36" />
          </div>
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3].map((index) => (
              <Bar key={index} className="h-12 w-full" />
            ))}
          </div>
        </div>
      </section>

      {/* User management block */}
      <section className={`${tileBase} p-6`}>
        <div className="flex flex-col gap-4">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <div className="flex flex-col gap-2">
              <Bar className="h-5 w-44" />
              <Bar className="h-3 w-72" />
            </div>
            <Bar className="h-9 w-40" />
          </div>
          <div className="flex flex-col gap-2">
            {[0, 1, 2, 3, 4, 5].map((index) => (
              <Bar key={index} className="h-10 w-full" />
            ))}
          </div>
        </div>
      </section>
    </div>
  )
}
