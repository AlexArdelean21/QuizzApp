"use client"

import { useMemo, useState } from "react"
import { ChevronDown } from "lucide-react"
import { UsersTable, type ExamOption, type UserProfileRow } from "@/components/admin/UsersTable"

type UserManagementProps = {
  profiles: UserProfileRow[]
  examene: ExamOption[]
  activeAccessByUser: Record<string, string[]>
}

export function UserManagement({
  profiles,
  examene,
  activeAccessByUser,
}: UserManagementProps) {
  const [isExpanded, setIsExpanded] = useState(true)
  const [searchTerm, setSearchTerm] = useState("")

  const filteredProfiles = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase()
    if (!needle) return profiles
    return profiles.filter((profile) => (profile.email ?? "").toLowerCase().includes(needle))
  }, [profiles, searchTerm])

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-900/70"
      >
        <div>
          <h2 className="text-xl font-semibold text-foreground">User Management</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Administrează utilizatorii și acordă acces pe examen.
          </p>
        </div>
        <ChevronDown
          className={`size-5 text-muted-foreground transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`grid transition-all duration-300 ${isExpanded ? "mt-4 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <input
            type="text"
            placeholder="Caută după email..."
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            className="w-full rounded-md border border-slate-200 bg-transparent p-2 text-sm text-foreground outline-none transition-colors focus:border-primary/60 dark:border-slate-800"
          />
          <UsersTable
            profiles={filteredProfiles}
            examene={examene}
            activeAccessByUser={activeAccessByUser}
          />
        </div>
      </div>
    </section>
  )
}
