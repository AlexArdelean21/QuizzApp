"use client"

import { useMemo, useState } from "react"
import { Search } from "lucide-react"
import { UsersTable } from "@/components/admin/UsersTable"
import type {
  AdminExamRow,
  AdminOrganizationRow,
  AdminUserRow,
} from "@/app/admin/actions"

type UserManagementProps = {
  profiles: AdminUserRow[]
  examene: AdminExamRow[]
  organizations: AdminOrganizationRow[]
  activeAccessByUser: Record<string, string[]>
  isSuperAdmin: boolean
  currentUserId: string
}

export function UserManagement({
  profiles,
  examene,
  organizations,
  activeAccessByUser,
  isSuperAdmin,
  currentUserId,
}: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState("")

  const filteredProfiles = useMemo(() => {
    const needle = searchTerm.trim().toLowerCase()
    if (!needle) return profiles
    return profiles.filter((profile) => {
      const haystack = `${profile.email ?? ""} ${profile.nume ?? ""} ${profile.org_nume ?? ""}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [profiles, searchTerm])

  return (
    <section
      id="utilizatori"
      className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900"
    >
      <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-slate-800">
        <div>
          <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
            User Management
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Administrează utilizatorii, rolurile și accesul la examene.
          </p>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {filteredProfiles.length} {filteredProfiles.length === 1 ? "utilizator" : "utilizatori"}
        </p>
      </div>

      <div className="mt-4 mb-3 relative">
        <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
        <input
          type="text"
          placeholder="Caută după email, nume sau organizație..."
          value={searchTerm}
          onChange={(event) => setSearchTerm(event.target.value)}
          className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
        />
      </div>

      <UsersTable
        profiles={filteredProfiles}
        examene={examene}
        organizations={organizations}
        activeAccessByUser={activeAccessByUser}
        isSuperAdmin={isSuperAdmin}
        currentUserId={currentUserId}
      />
    </section>
  )
}
