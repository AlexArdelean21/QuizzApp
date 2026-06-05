"use client"

import { BookOpen, Building2, Check, Users, X } from "lucide-react"

export type OrgStat = {
  orgId: string
  orgNume: string
  userCount: number
  examCount: number
  orgAdminCount: number
}

export const LOBBY_KEY = "__lobby__"

type OrgBreakdownProps = {
  orgs: OrgStat[]
  unassignedCount: number
  selectedOrgId: string | null
  onSelectOrg: (id: string | null) => void
}

export function OrgBreakdown({
  orgs,
  unassignedCount,
  selectedOrgId,
  onSelectOrg,
}: OrgBreakdownProps) {
  if (orgs.length === 0 && unassignedCount === 0) return null

  const hasSelection = selectedOrgId !== null

  return (
    <section className="flex flex-col gap-4">
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Organizații
          </p>
          <h2 className="text-xl font-semibold text-slate-900 dark:text-white">
            Sumar per organizație
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Click pe un card pentru a filtra dashboard-ul. Utilizatori și examene grupate per
            organizație.
          </p>
        </div>

        {hasSelection && (
          <button
            type="button"
            onClick={() => onSelectOrg(null)}
            className="inline-flex items-center gap-1.5 rounded-full border border-slate-200 bg-white px-3 py-1.5 text-xs font-medium text-slate-600 shadow-sm transition hover:bg-slate-50 active:scale-95 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300 dark:hover:bg-slate-800"
          >
            <X className="size-3" />
            Arată tot
          </button>
        )}
      </div>

      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-3">
        {orgs.map((org, idx) => {
          const isSelected = selectedOrgId === org.orgId
          return (
            <button
              key={org.orgId}
              type="button"
              style={{ animationDelay: `${idx * 50}ms` }}
              onClick={() => onSelectOrg(isSelected ? null : org.orgId)}
              className={[
                "stagger-in group relative w-full cursor-pointer overflow-hidden rounded-2xl border p-5 text-left shadow-sm",
                "transition-all duration-150 hover:-translate-y-1 hover:shadow-md active:scale-[0.98]",
                isSelected
                  ? "border-blue-500 bg-blue-50/60 ring-2 ring-blue-500/30 dark:bg-blue-900/20 dark:ring-blue-500/20"
                  : "border-slate-200/80 bg-white dark:border-slate-800 dark:bg-slate-900",
              ].join(" ")}
            >
              {/* Gradient overlay */}
              <div
                className={[
                  "pointer-events-none absolute inset-0 bg-gradient-to-br from-blue-500/10 to-blue-500/0 transition-opacity",
                  isSelected ? "opacity-100" : "opacity-60 group-hover:opacity-100",
                ].join(" ")}
                aria-hidden="true"
              />

              <div className="relative">
                {/* Header */}
                <div className="flex items-start gap-3">
                  <div
                    className={[
                      "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                      isSelected ? "bg-blue-500/30" : "bg-blue-500/15",
                    ].join(" ")}
                  >
                    <Building2
                      className={[
                        "size-5 transition-colors",
                        isSelected
                          ? "text-blue-700 dark:text-blue-200"
                          : "text-blue-600 dark:text-blue-300",
                      ].join(" ")}
                    />
                  </div>
                  <div className="min-w-0 flex-1">
                    <p className="truncate font-semibold text-slate-900 dark:text-white">
                      {org.orgNume}
                    </p>
                    {org.orgAdminCount > 0 && (
                      <p className="text-[11px] text-slate-500 dark:text-slate-400">
                        {org.orgAdminCount} org {org.orgAdminCount === 1 ? "admin" : "admini"}
                      </p>
                    )}
                  </div>
                  {isSelected && (
                    <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-blue-500 text-white">
                      <Check className="size-3" />
                    </span>
                  )}
                </div>

                {/* Stats row */}
                <div className="mt-4 flex items-center gap-4 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <div className="flex items-center gap-1.5">
                    <Users className="size-3.5 text-slate-400" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">Utilizatori</span>
                    <span className="ml-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                      {org.userCount}
                    </span>
                  </div>
                  <div className="h-4 w-px bg-slate-200 dark:bg-slate-700" />
                  <div className="flex items-center gap-1.5">
                    <BookOpen className="size-3.5 text-slate-400" />
                    <span className="text-xs text-slate-500 dark:text-slate-400">Examene</span>
                    <span className="ml-1 text-sm font-semibold tabular-nums text-slate-900 dark:text-white">
                      {org.examCount}
                    </span>
                  </div>
                </div>
              </div>
            </button>
          )
        })}

        {/* Lobby card */}
        {unassignedCount > 0 && (() => {
          const isSelected = selectedOrgId === LOBBY_KEY
          return (
            <button
              type="button"
              style={{ animationDelay: `${orgs.length * 50}ms` }}
              onClick={() => onSelectOrg(isSelected ? null : LOBBY_KEY)}
              className={[
                "stagger-in group relative w-full cursor-pointer overflow-hidden rounded-2xl border p-5 text-left shadow-sm",
                "transition-all duration-150 hover:-translate-y-1 hover:shadow-md active:scale-[0.98]",
                isSelected
                  ? "border-amber-500 bg-amber-50/60 ring-2 ring-amber-500/30 dark:bg-amber-900/20 dark:ring-amber-500/20"
                  : "border-amber-200/80 bg-white dark:border-amber-800/60 dark:bg-slate-900",
              ].join(" ")}
            >
              <div
                className={[
                  "pointer-events-none absolute inset-0 bg-gradient-to-br from-amber-500/10 to-amber-500/0 transition-opacity",
                  isSelected ? "opacity-100" : "opacity-60 group-hover:opacity-100",
                ].join(" ")}
                aria-hidden="true"
              />
              <div className="relative">
                <div className="flex items-start gap-3">
                  <div
                    className={[
                      "flex size-10 shrink-0 items-center justify-center rounded-xl transition-colors",
                      isSelected ? "bg-amber-500/30" : "bg-amber-500/15",
                    ].join(" ")}
                  >
                    <Users
                      className={[
                        "size-5 transition-colors",
                        isSelected
                          ? "text-amber-700 dark:text-amber-200"
                          : "text-amber-600 dark:text-amber-300",
                      ].join(" ")}
                    />
                  </div>
                  <div className="flex-1">
                    <p className="font-semibold text-slate-900 dark:text-white">Lobby</p>
                    <p className="text-[11px] text-slate-500 dark:text-slate-400">
                      Utilizatori neașignați
                    </p>
                  </div>
                  {isSelected && (
                    <span className="inline-flex size-5 shrink-0 items-center justify-center rounded-full bg-amber-500 text-white">
                      <Check className="size-3" />
                    </span>
                  )}
                </div>
                <div className="mt-4 flex items-center gap-1.5 border-t border-slate-100 pt-4 dark:border-slate-800">
                  <Users className="size-3.5 text-slate-400" />
                  <span className="text-xs text-slate-500 dark:text-slate-400">În așteptare</span>
                  <span className="ml-1 text-sm font-semibold tabular-nums text-amber-700 dark:text-amber-300">
                    {unassignedCount}
                  </span>
                </div>
              </div>
            </button>
          )
        })()}
      </div>
    </section>
  )
}
