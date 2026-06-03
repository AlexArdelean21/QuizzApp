"use client"

import { useMemo, useState } from "react"
import { ChevronDown, Search } from "lucide-react"
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
  scopedOrgId?: string | null
}

export function UserManagement({
  profiles,
  examene,
  organizations,
  activeAccessByUser,
  isSuperAdmin,
  currentUserId,
  scopedOrgId,
}: UserManagementProps) {
  const [searchTerm, setSearchTerm] = useState("")
  const [collapsed, setCollapsed] = useState(false)

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
      <div
        className="flex cursor-pointer select-none flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-slate-800"
        onClick={() => setCollapsed((prev) => !prev)}
      >
        <div>
          <h2 className="flex items-center gap-2 text-lg font-semibold text-slate-900 dark:text-white">
            User Management
            <ChevronDown
              className={`size-4 text-slate-400 transition-transform duration-200 ${collapsed ? "-rotate-90" : ""}`}
            />
          </h2>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Administrează utilizatorii și accesul la examene.
            {!isSuperAdmin && " Modificările de rol se fac din panoul Super Admin."}
          </p>
        </div>
        <p className="text-xs text-slate-500 dark:text-slate-400">
          {filteredProfiles.length} {filteredProfiles.length === 1 ? "utilizator" : "utilizatori"}
        </p>
      </div>

      {!collapsed && (
        <>
          <div className="relative mb-3 mt-4">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              type="text"
              placeholder="Caută după email sau nume..."
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
            orgFilter={scopedOrgId}
          />
        </>
      )}
    </section>
  )
}
