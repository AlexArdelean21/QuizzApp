"use client"

import { useMemo, useState, useTransition } from "react"
import { ShieldCheck } from "lucide-react"
import { Button } from "@/components/ui/button"
import { deleteUser, grantExamAccess, updateUserRole } from "@/app/admin/actions"
import type {
  AdminExamRow,
  AdminOrganizationRow,
  AdminUserRow,
} from "@/app/admin/actions"
import type { AppRole } from "@/lib/auth/roles"

export type UsersTableProps = {
  profiles: AdminUserRow[]
  examene: AdminExamRow[]
  organizations: AdminOrganizationRow[]
  activeAccessByUser: Record<string, string[]>
  isSuperAdmin: boolean
  currentUserId: string
  orgFilter?: string | null
}

type PendingAction = {
  type: "grant" | "delete" | "role"
  userId: string
} | null

const ROLE_ORDER: Record<AppRole, number> = {
  super_admin: 0,
  org_admin: 1,
  user: 2,
}

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  org_admin: "Org Admin",
  user: "User",
}

const ROLE_BADGE: Record<AppRole, string> = {
  super_admin: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  org_admin: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  user: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
}

const UNASSIGNED_KEY = "__unassigned__"

export function UsersTable({
  profiles,
  examene,
  organizations,
  activeAccessByUser,
  isSuperAdmin,
  currentUserId,
  orgFilter,
}: UsersTableProps) {
  const [isPending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [selectedExamByUser, setSelectedExamByUser] = useState<Record<string, number>>({})
  const [daysByUser, setDaysByUser] = useState<Record<string, number>>({})
  const [selectedOrg, setSelectedOrg] = useState<string>("")

  const defaultExamId = examene[0]?.id ?? null
  const orgNameById = new Map<string, string>(
    organizations.map((org) => [org.id, org.nume])
  )

  // Apply org filter then sort by role rank, then email
  const displayedProfiles = useMemo(() => {
    let base = profiles
    if (isSuperAdmin) {
      if (selectedOrg === UNASSIGNED_KEY) {
        base = base.filter((p) => !p.org_id)
      } else if (selectedOrg) {
        base = base.filter((p) => p.org_id === selectedOrg)
      }
    } else if (orgFilter) {
      base = base.filter((p) => p.org_id === orgFilter)
    }
    return [...base].sort((a, b) => {
      const rankDiff = ROLE_ORDER[a.role] - ROLE_ORDER[b.role]
      if (rankDiff !== 0) return rankDiff
      return (a.email ?? "").localeCompare(b.email ?? "")
    })
  }, [profiles, isSuperAdmin, selectedOrg, orgFilter])

  const colSpan = isSuperAdmin ? 6 : 5

  const handleGrantAccess = (userId: string) => {
    const selectedExamId = selectedExamByUser[userId] ?? defaultExamId
    const selectedDays = Math.max(1, Number(daysByUser[userId] ?? 30))

    if (!selectedExamId) {
      window.alert("Nu există examene disponibile.")
      return
    }

    setPendingAction({ type: "grant", userId })
    startTransition(() => {
      void (async () => {
        try {
          await grantExamAccess(userId, selectedExamId, selectedDays)
        } catch (error) {
          console.error("Failed to grant exam access:", error)
          window.alert(error instanceof Error ? error.message : "Nu s-a putut acorda accesul.")
        } finally {
          setPendingAction(null)
        }
      })()
    })
  }

  const handleDeleteUser = (userId: string, userEmail: string | null) => {
    const confirmed = window.confirm(
      `Sigur vrei să ștergi utilizatorul ${userEmail ?? userId}?`
    )
    if (!confirmed) return

    setPendingAction({ type: "delete", userId })
    startTransition(() => {
      void (async () => {
        try {
          await deleteUser(userId)
        } catch (error) {
          console.error("Failed to delete user:", error)
          window.alert(error instanceof Error ? error.message : "Nu s-a putut șterge utilizatorul.")
        } finally {
          setPendingAction(null)
        }
      })()
    })
  }

  const handleChangeRole = (userId: string, role: AppRole) => {
    setPendingAction({ type: "role", userId })
    startTransition(() => {
      void (async () => {
        try {
          await updateUserRole({ userId, role })
        } catch (error) {
          console.error("Failed to update role:", error)
          window.alert(error instanceof Error ? error.message : "Nu s-a putut schimba rolul.")
        } finally {
          setPendingAction(null)
        }
      })()
    })
  }

  return (
    <div className="space-y-3">
      {/* Org filter — super_admin only */}
      {isSuperAdmin && organizations.length > 0 && (
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-slate-500 dark:text-slate-400">Filtrează organizație:</span>
          <select
            value={selectedOrg}
            onChange={(e) => setSelectedOrg(e.target.value)}
            className="rounded-lg border border-slate-200 bg-white px-3 py-1.5 text-xs text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-slate-100"
          >
            <option value="">Toate organizațiile</option>
            <option value={UNASSIGNED_KEY}>— Fără org (Lobby) —</option>
            {organizations.map((org) => (
              <option key={org.id} value={org.id}>
                {org.nume}
              </option>
            ))}
          </select>
          <span className="text-xs text-slate-400 dark:text-slate-500">
            {displayedProfiles.length} {displayedProfiles.length === 1 ? "utilizator" : "utilizatori"}
          </span>
        </div>
      )}

      <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800">
        <table className="min-w-full divide-y divide-slate-200/70 text-sm dark:divide-slate-800">
          <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:bg-slate-950 dark:text-slate-400">
            <tr>
              <th className="px-4 py-3">Email</th>
              <th className="px-4 py-3">Nume</th>
              <th className="px-4 py-3">Rol</th>
              {isSuperAdmin && <th className="px-4 py-3">Organizație</th>}
              <th className="px-4 py-3">Acces activ</th>
              <th className="px-4 py-3 text-right">Acțiuni</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-slate-200/70 bg-white dark:divide-slate-800 dark:bg-slate-900">
            {displayedProfiles.length === 0 ? (
              <tr>
                <td
                  colSpan={colSpan}
                  className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400"
                >
                  Nu am găsit utilizatori.
                </td>
              </tr>
            ) : (
              displayedProfiles.map((profile) => {
                const isCurrentUser = profile.id === currentUserId
                const role = profile.role
                const isAdminRole = role === "super_admin" || role === "org_admin"
                const orgName =
                  profile.org_nume ??
                  (profile.org_id ? orgNameById.get(profile.org_id) ?? null : null)
                const isOrgAdminPeer = !isSuperAdmin && role === "org_admin"
                // Role editing: super_admin only, never yourself, never another super_admin.
                // Protecting super_admin rows prevents accidental demotion / lockout.
                const canEditRole = isSuperAdmin && !isCurrentUser && role !== "super_admin"
                const canDelete = !isCurrentUser && !isOrgAdminPeer

                return (
                  <tr
                    key={profile.id}
                    className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-950/60"
                  >
                    {/* Email */}
                    <td className="whitespace-nowrap px-4 py-3 text-slate-900 dark:text-white">
                      {profile.email ?? "-"}
                      {isCurrentUser && (
                        <span className="ml-2 inline-flex rounded-full bg-blue-100 px-2 py-0.5 text-[10px] font-medium text-blue-700 dark:bg-blue-500/15 dark:text-blue-300">
                          TU
                        </span>
                      )}
                    </td>

                    {/* Nume */}
                    <td className="whitespace-nowrap px-4 py-3 text-slate-700 dark:text-slate-200">
                      {profile.nume ?? "—"}
                    </td>

                    {/* Rol */}
                    <td className="px-4 py-3">
                      {canEditRole ? (
                        <select
                          value={role}
                          onChange={(event) =>
                            handleChangeRole(profile.id, event.target.value as AppRole)
                          }
                          disabled={isPending && pendingAction?.userId === profile.id}
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                        >
                          <option value="user">User</option>
                          <option value="org_admin">Org Admin</option>
                          <option value="super_admin">Super Admin</option>
                        </select>
                      ) : (
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[role]}`}
                        >
                          {ROLE_LABELS[role]}
                        </span>
                      )}
                    </td>

                    {/* Organizație (super_admin only) */}
                    {isSuperAdmin && (
                      <td className="px-4 py-3 text-xs">
                        <span className="inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs font-medium text-slate-700 dark:bg-slate-800 dark:text-slate-200">
                          {orgName ?? "—"}
                        </span>
                      </td>
                    )}

                    {/* Acces activ */}
                    <td className="px-4 py-3">
                      {isAdminRole ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-violet-500/15 px-2 py-0.5 text-[11px] font-medium text-violet-700 dark:text-violet-300">
                          <ShieldCheck className="size-3" />
                          Acces Admin
                        </span>
                      ) : (activeAccessByUser[profile.id] ?? []).length > 0 ? (
                        <div className="flex max-w-[180px] flex-col gap-1">
                          {(activeAccessByUser[profile.id] ?? []).slice(0, 3).map((examName) => (
                            <span
                              key={`${profile.id}-${examName}`}
                              title={examName}
                              className="block truncate rounded-md bg-emerald-500/10 px-2 py-0.5 text-[11px] font-medium text-emerald-700 dark:text-emerald-300"
                            >
                              {examName}
                            </span>
                          ))}
                          {(activeAccessByUser[profile.id] ?? []).length > 3 && (
                            <span className="pl-1 text-[11px] text-slate-400 dark:text-slate-500">
                              +{(activeAccessByUser[profile.id] ?? []).length - 3} mai multe
                            </span>
                          )}
                        </div>
                      ) : (
                        <span className="rounded-full bg-slate-200 px-2 py-0.5 text-[11px] text-slate-600 dark:bg-slate-800 dark:text-slate-300">
                          Fără acces
                        </span>
                      )}
                    </td>

                    {/* Acțiuni */}
                    <td className="px-4 py-3">
                      <div className="flex flex-wrap items-center justify-end gap-1.5">
                        {/* Grant access controls — hidden for admin roles */}
                        {!isAdminRole && (
                          <>
                            <select
                              value={selectedExamByUser[profile.id] ?? defaultExamId ?? ""}
                              onChange={(event) =>
                                setSelectedExamByUser((prev) => ({
                                  ...prev,
                                  [profile.id]: Number(event.target.value),
                                }))
                              }
                              disabled={isPending || examene.length === 0}
                              className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 transition focus:border-blue-500 focus:outline-none dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            >
                              {examene.length === 0 ? (
                                <option value="">No exams</option>
                              ) : (
                                examene.map((exam) => (
                                  <option key={exam.id} value={exam.id}>
                                    {exam.nume_examen}
                                  </option>
                                ))
                              )}
                            </select>
                            <input
                              type="number"
                              min={1}
                              value={daysByUser[profile.id] ?? 30}
                              onChange={(event) =>
                                setDaysByUser((prev) => ({
                                  ...prev,
                                  [profile.id]: Number(event.target.value),
                                }))
                              }
                              disabled={isPending}
                              className="w-20 rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100"
                            />
                            <Button
                              type="button"
                              size="sm"
                              variant="outline"
                              disabled={isPending || examene.length === 0}
                              onClick={() => handleGrantAccess(profile.id)}
                            >
                              {pendingAction?.type === "grant" && pendingAction.userId === profile.id
                                ? "Granting..."
                                : "Acordă acces"}
                            </Button>
                          </>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          disabled={isPending || !canDelete}
                          title={
                            isOrgAdminPeer
                              ? "Doar super admin poate șterge un org admin"
                              : undefined
                          }
                          onClick={() => handleDeleteUser(profile.id, profile.email)}
                        >
                          {pendingAction?.type === "delete" && pendingAction.userId === profile.id
                            ? "Deleting..."
                            : "Șterge"}
                        </Button>
                      </div>
                    </td>
                  </tr>
                )
              })
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
