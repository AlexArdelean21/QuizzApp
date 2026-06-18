// Skeleton fallback for /admin/global. Mirrors the two stacked cards rendered
// by OrganizationManagement — the "Organizații" panel and the "Lobby
// utilizatori" table — using the same calm single-pulse rhythm and slate tones
// as AdminDashboardSkeleton (rounded-2xl cards, slate borders, animate-pulse
// bars).

function Bar({ className }: { className?: string }) {
  return (
    <div className={`rounded-md bg-slate-300/70 dark:bg-slate-700/70 ${className ?? ""}`} />
  )
}

const cardBase =
  "rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"

export function OrganizationManagementSkeleton() {
  return (
    <div
      className="flex animate-pulse flex-col gap-6"
      aria-hidden
      role="status"
      aria-label="Se încarcă organizațiile"
    >
      {/* Organizații card */}
      <section className={cardBase}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-slate-800">
          <div className="flex flex-col gap-2">
            <Bar className="h-5 w-40" />
            <Bar className="h-3 w-64" />
          </div>
          <Bar className="h-9 w-44" />
        </div>
        <div className="mt-4 flex flex-col gap-2">
          {[0, 1, 2, 3].map((index) => (
            <Bar key={index} className="h-12 w-full" />
          ))}
        </div>
      </section>

      {/* Lobby utilizatori card */}
      <section className={cardBase}>
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-slate-800">
          <div className="flex flex-col gap-2">
            <Bar className="h-5 w-48" />
            <Bar className="h-3 w-80" />
          </div>
          <Bar className="h-7 w-28 rounded-full" />
        </div>
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <Bar className="h-9 w-56" />
          <Bar className="h-9 w-full max-w-sm" />
        </div>
        <div className="mt-3 flex flex-col gap-2">
          {[0, 1, 2, 3, 4, 5].map((index) => (
            <Bar key={index} className="h-10 w-full" />
          ))}
        </div>
      </section>
    </div>
  )
}
