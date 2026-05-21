// Bento-shaped skeleton matching `StatisticsBento`. Rendered as the Suspense
// fallback so the user sees the rough shape of the dashboard the moment the
// route paints, instead of staring at an empty card while the DB aggregates.
//
// Color palette mirrors the rest of the app: slate-200 in light mode and
// slate-800 in dark mode, both behind a single `animate-pulse` ancestor.

const tileBase =
  "rounded-2xl border border-slate-200/70 bg-slate-200/60 dark:border-slate-800/70 dark:bg-slate-800/50"

function Block({ className }: { className?: string }) {
  return (
    <div className={`rounded-md bg-slate-300/70 dark:bg-slate-700/70 ${className ?? ""}`} />
  )
}

export function StatisticsSkeleton() {
  return (
    <div aria-hidden className="animate-pulse" role="status" aria-label="Se încarcă statisticile">
      <div className="-mt-2 mb-6 flex items-center">
        <Block className="h-4 w-56" />
      </div>

      <section className="grid grid-cols-1 gap-5 md:grid-cols-6 lg:grid-cols-12">
        {/* Mastery ring */}
        <div className={`${tileBase} flex h-72 flex-col items-center justify-center gap-4 p-6 md:col-span-6 lg:col-span-4 lg:row-span-2`}>
          <Block className="size-36 rounded-full" />
          <Block className="h-3 w-32" />
          <Block className="h-3 w-24" />
        </div>

        {/* Evolution chart */}
        <div className={`${tileBase} flex h-72 flex-col gap-3 p-6 md:col-span-6 lg:col-span-8 lg:row-span-2`}>
          <Block className="h-4 w-40" />
          <Block className="h-3 w-24" />
          <div className="mt-2 flex flex-1 items-end gap-2">
            <Block className="h-1/2 flex-1" />
            <Block className="h-3/4 flex-1" />
            <Block className="h-2/5 flex-1" />
            <Block className="h-5/6 flex-1" />
            <Block className="h-1/3 flex-1" />
            <Block className="h-2/3 flex-1" />
            <Block className="h-3/5 flex-1" />
            <Block className="h-4/5 flex-1" />
          </div>
        </div>

        {/* Mini tiles */}
        {[0, 1, 2].map((index) => (
          <div
            key={index}
            className={`${tileBase} flex h-32 flex-col justify-between p-5 md:col-span-2 lg:col-span-4`}
          >
            <Block className="h-3 w-24" />
            <Block className="h-7 w-20" />
            <Block className="h-3 w-32" />
          </div>
        ))}
      </section>
    </div>
  )
}
