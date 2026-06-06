"use client"

import { useCallback, useEffect, useState } from "react"
import useEmblaCarousel from "embla-carousel-react"
import Autoplay from "embla-carousel-autoplay"
import { Building2, Check, Users, X } from "lucide-react"

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
  const allItems = [
    ...orgs.map((org) => ({ type: "org" as const, org })),
    ...(unassignedCount > 0 ? [{ type: "lobby" as const }] : []),
  ]

  const [emblaRef, embla] = useEmblaCarousel(
    { loop: allItems.length > 3, align: "start", dragFree: false },
    [Autoplay({ delay: 3500, stopOnInteraction: true })]
  )
  const [selectedSnap, setSelectedSnap] = useState(0)
  const [snapCount, setSnapCount] = useState(0)

  const onSelect = useCallback(() => {
    if (!embla) return
    setSelectedSnap(embla.selectedScrollSnap())
  }, [embla])

  useEffect(() => {
    if (!embla) return
    setSnapCount(embla.scrollSnapList().length)
    embla.on("select", onSelect)
    onSelect()
    return () => { embla.off("select", onSelect) }
  }, [embla, onSelect])

  if (allItems.length === 0) return null

  const hasSelection = selectedOrgId !== null

  const cardBase =
    "group relative w-full overflow-hidden rounded-2xl border bg-white p-4 shadow-sm " +
    "transition-all duration-150 hover:-translate-y-0.5 hover:shadow-md active:scale-[0.99] " +
    "dark:bg-slate-900 cursor-pointer text-left"

  const cardSelected = "border-blue-500/50 ring-2 ring-blue-500/30"
  const cardDefault  = "border-slate-200/80 dark:border-slate-800"

  return (
    <section className="flex flex-col gap-4">
      {/* Header */}
      <div className="flex flex-wrap items-end justify-between gap-3">
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Organizații
          </p>
          <h2 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Sumar per organizație
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Click pe un card pentru a filtra dashboard-ul.
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

      {/* Carousel viewport */}
      <div className="overflow-hidden" ref={emblaRef}>
        <div className="flex gap-3">
          {allItems.map((item) => {
            if (item.type === "org") {
              const { org } = item
              const isSelected = selectedOrgId === org.orgId
              return (
                <button
                  key={org.orgId}
                  type="button"
                  onClick={() => onSelectOrg(isSelected ? null : org.orgId)}
                  style={{ flex: "0 0 calc(33.333% - 8px)", minWidth: 0 }}
                  className={`${cardBase} ${isSelected ? cardSelected : cardDefault}`}
                >
                  <div className="flex items-start justify-between gap-2">
                    <div className="min-w-0">
                      <p className="truncate text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                        {org.orgNume}
                      </p>
                      <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">
                        {org.userCount}
                      </p>
                      <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                        {org.userCount === 1 ? "utilizator" : "utilizatori"}
                        {" · "}
                        {org.examCount}{" "}
                        {org.examCount === 1 ? "examen" : "examene"}
                        {org.orgAdminCount > 0 && (
                          <>
                            {" · "}
                            {org.orgAdminCount}{" "}
                            {org.orgAdminCount === 1 ? "admin" : "admini"}
                          </>
                        )}
                      </p>
                    </div>
                    <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                      <Building2 className="size-5 text-slate-600 dark:text-slate-300" />
                    </div>
                  </div>
                  {isSelected && (
                    <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                      <Check className="size-3.5 text-blue-500" />
                      <span className="text-[11px] text-slate-500 dark:text-slate-400">
                        Filtrat după această organizație
                      </span>
                    </div>
                  )}
                </button>
              )
            }

            // Lobby card
            const isSelected = selectedOrgId === LOBBY_KEY
            return (
              <button
                key="lobby"
                type="button"
                onClick={() => onSelectOrg(isSelected ? null : LOBBY_KEY)}
                style={{ flex: "0 0 calc(33.333% - 8px)", minWidth: 0 }}
                className={`${cardBase} ${isSelected ? cardSelected : cardDefault}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div className="min-w-0">
                    <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
                      Lobby
                    </p>
                    <p className="mt-3 text-3xl font-semibold tabular-nums text-slate-900 dark:text-white">
                      {unassignedCount}
                    </p>
                    <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
                      {unassignedCount === 1 ? "utilizator neasignat" : "utilizatori neasignați"}
                    </p>
                  </div>
                  <div className="inline-flex size-10 shrink-0 items-center justify-center rounded-xl bg-slate-100 dark:bg-slate-800">
                    <Users className="size-5 text-slate-600 dark:text-slate-300" />
                  </div>
                </div>
                {isSelected && (
                  <div className="mt-3 flex items-center gap-1.5 border-t border-slate-100 pt-3 dark:border-slate-800">
                    <Check className="size-3.5 text-blue-500" />
                    <span className="text-[11px] text-slate-500 dark:text-slate-400">
                      Filtrat după lobby
                    </span>
                  </div>
                )}
              </button>
            )
          })}
        </div>
      </div>

      {/* Dot indicators — only if more than 3 items */}
      {snapCount > 1 && (
        <div className="flex justify-center gap-1.5">
          {Array.from({ length: snapCount }).map((_, i) => (
            <button
              key={i}
              type="button"
              aria-label={`Slide ${i + 1}`}
              onClick={() => embla?.scrollTo(i)}
              className={`h-1.5 rounded-full transition-all duration-200 ${
                i === selectedSnap
                  ? "w-5 bg-slate-600 dark:bg-slate-300"
                  : "w-1.5 bg-slate-300 dark:bg-slate-600"
              }`}
            />
          ))}
        </div>
      )}
    </section>
  )
}
