"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { Building2, Inbox, Pencil, Plus, Search, Trash2, Users as UsersIcon } from "lucide-react"
import {
  assignUserToOrganization,
  createOrganization,
  deleteOrganization,
  updateOrganization,
  updateUserRole,
  type AdminOrganizationRow,
  type AdminUserRow,
} from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import type { AppRole } from "@/lib/auth/roles"

type Toast = { type: "success" | "error"; message: string } | null

type OrganizationManagementProps = {
  organizations: AdminOrganizationRow[]
  users: AdminUserRow[]
  stats: Record<string, { users: number; exams: number }>
}

const ROLE_BADGE: Record<AppRole, string> = {
  super_admin: "bg-violet-500/15 text-violet-700 dark:text-violet-300",
  org_admin: "bg-blue-500/15 text-blue-700 dark:text-blue-300",
  user: "bg-slate-200 text-slate-700 dark:bg-slate-800 dark:text-slate-200",
}

const ROLE_LABELS: Record<AppRole, string> = {
  super_admin: "Super Admin",
  org_admin: "Org Admin",
  user: "User",
}

type UserFilter = "lobby" | "assigned" | "all"

export function OrganizationManagement({
  organizations,
  users,
  stats,
}: OrganizationManagementProps) {
  const router = useRouter()
  const [toast, setToast] = useState<Toast>(null)
  const [showCreateModal, setShowCreateModal] = useState(false)
  const [createNume, setCreateNume] = useState("")
  const [createSlug, setCreateSlug] = useState("")
  const [editTarget, setEditTarget] = useState<AdminOrganizationRow | null>(null)
  const [editNume, setEditNume] = useState("")
  const [editSlug, setEditSlug] = useState("")
  const [deleteTarget, setDeleteTarget] = useState<AdminOrganizationRow | null>(null)
  const [deleteConfirm, setDeleteConfirm] = useState("")
  const [searchUser, setSearchUser] = useState("")
  const [userFilter, setUserFilter] = useState<UserFilter>("lobby")

  const [creating, startCreate] = useTransition()
  const [saving, startSave] = useTransition()
  const [deleting, startDelete] = useTransition()
  const [updatingUser, startUpdateUser] = useTransition()

  const orgNameById = new Map<string, string>(organizations.map((org) => [org.id, org.nume]))

  const pushToast = (next: Exclude<Toast, null>) => {
    setToast(next)
    window.setTimeout(() => {
      setToast((current) => (current?.message === next.message ? null : current))
    }, 4000)
  }

  const handleCreate = () => {
    if (!createNume.trim()) return
    startCreate(() => {
      void (async () => {
        try {
          await createOrganization({ nume: createNume.trim(), slug: createSlug.trim() || undefined })
          pushToast({ type: "success", message: "Organizație creată." })
          setShowCreateModal(false)
          setCreateNume("")
          setCreateSlug("")
          router.refresh()
        } catch (error) {
          pushToast({
            type: "error",
            message: error instanceof Error ? error.message : "Nu s-a putut crea organizația.",
          })
        }
      })()
    })
  }

  const handleSaveEdit = () => {
    if (!editTarget) return
    startSave(() => {
      void (async () => {
        try {
          await updateOrganization({ id: editTarget.id, nume: editNume.trim(), slug: editSlug.trim() })
          pushToast({ type: "success", message: "Organizație actualizată." })
          setEditTarget(null)
          router.refresh()
        } catch (error) {
          pushToast({
            type: "error",
            message: error instanceof Error ? error.message : "Nu s-a putut actualiza.",
          })
        }
      })()
    })
  }

  const handleDelete = () => {
    if (!deleteTarget) return
    startDelete(() => {
      void (async () => {
        try {
          await deleteOrganization(deleteTarget.id)
          pushToast({ type: "success", message: `Organizația "${deleteTarget.nume}" a fost ștearsă.` })
          setDeleteTarget(null)
          setDeleteConfirm("")
          router.refresh()
        } catch (error) {
          pushToast({
            type: "error",
            message: error instanceof Error ? error.message : "Nu s-a putut șterge.",
          })
        }
      })()
    })
  }

  const handleAssignOrg = (userId: string, orgId: string | null) => {
    startUpdateUser(() => {
      void (async () => {
        try {
          await assignUserToOrganization({ userId, orgId })
          pushToast({ type: "success", message: "Utilizatorul a fost mutat." })
          router.refresh()
        } catch (error) {
          pushToast({
            type: "error",
            message: error instanceof Error ? error.message : "Eroare la mutarea utilizatorului.",
          })
        }
      })()
    })
  }

  const handleSetRole = (userId: string, role: AppRole) => {
    startUpdateUser(() => {
      void (async () => {
        try {
          await updateUserRole({ userId, role })
          pushToast({ type: "success", message: "Rol actualizat." })
          router.refresh()
        } catch (error) {
          pushToast({
            type: "error",
            message: error instanceof Error ? error.message : "Eroare la schimbarea rolului.",
          })
        }
      })()
    })
  }

  const unassignedCount = useMemo(
    () => users.filter((user) => !user.org_id).length,
    [users]
  )
  const assignedCount = users.length - unassignedCount

  const filteredUsers = useMemo(() => {
    const needle = searchUser.trim().toLowerCase()
    let base = users
    if (userFilter === "lobby") {
      base = base.filter((user) => !user.org_id)
    } else if (userFilter === "assigned") {
      base = base.filter((user) => Boolean(user.org_id))
    }
    if (!needle) return base
    return base.filter((user) => {
      const haystack = `${user.email ?? ""} ${user.nume ?? ""} ${user.org_nume ?? ""}`.toLowerCase()
      return haystack.includes(needle)
    })
  }, [users, searchUser, userFilter])

  const toastClasses =
    toast?.type === "success"
      ? "border-emerald-500/30 bg-emerald-500/10 text-emerald-700 dark:text-emerald-300"
      : "border-rose-500/40 bg-rose-500/10 text-rose-700 dark:text-rose-300"

  return (
    <div className="flex flex-col gap-6">
      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Organizații
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Creează și administrează organizațiile platformei.
            </p>
          </div>
          <Button
            type="button"
            onClick={() => setShowCreateModal(true)}
            className="bg-blue-600 text-white hover:bg-blue-500"
          >
            <Plus className="mr-1 size-4" />
            Organizație nouă
          </Button>
        </div>

        <div className="mt-4 overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200/70 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Organizație</th>
                <th className="px-4 py-3">Slug</th>
                <th className="px-4 py-3">Utilizatori</th>
                <th className="px-4 py-3">Examene</th>
                <th className="px-4 py-3 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan={5} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    Nu există organizații încă.
                  </td>
                </tr>
              ) : (
                organizations.map((org) => {
                  const orgStats = stats[org.id] ?? { users: 0, exams: 0 }
                  return (
                    <tr
                      key={org.id}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-950/60"
                    >
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <div className="flex size-9 items-center justify-center rounded-lg bg-blue-500/15 text-blue-700 dark:text-blue-300">
                            <Building2 className="size-4" />
                          </div>
                          <div>
                            <p className="font-medium text-slate-900 dark:text-white">{org.nume}</p>
                            <p className="text-[11px] text-slate-500 dark:text-slate-400">
                              ID {org.id.slice(0, 8)}…
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-3 text-slate-600 dark:text-slate-300">{org.slug}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{orgStats.users}</td>
                      <td className="px-4 py-3 text-slate-700 dark:text-slate-200">{orgStats.exams}</td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            onClick={() => {
                              setEditTarget(org)
                              setEditNume(org.nume)
                              setEditSlug(org.slug)
                            }}
                          >
                            <Pencil className="mr-1 size-3.5" />
                            Editează
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="destructive"
                            onClick={() => {
                              setDeleteTarget(org)
                              setDeleteConfirm("")
                            }}
                          >
                            <Trash2 className="mr-1 size-3.5" />
                            Șterge
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

        {toast ? (
          <div className={`mt-4 rounded-md border px-3 py-2 text-sm ${toastClasses}`}>
            {toast.message}
          </div>
        ) : null}
      </section>

      <section className="rounded-2xl border border-slate-200/80 bg-white p-5 shadow-sm dark:border-slate-800 dark:bg-slate-900">
        <div className="flex flex-wrap items-center justify-between gap-3 border-b border-slate-200/70 pb-4 dark:border-slate-800">
          <div>
            <h2 className="text-lg font-semibold text-slate-900 dark:text-white">
              Lobby utilizatori
            </h2>
            <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
              Utilizatorii noi încep aici. Asignează-i la o organizație și, dacă e cazul, promovează-i ca org admin.
            </p>
          </div>
          {unassignedCount > 0 ? (
            <span className="inline-flex items-center gap-2 rounded-full bg-amber-500/15 px-3 py-1 text-xs font-medium text-amber-700 dark:text-amber-300">
              <Inbox className="size-3.5" />
              {unassignedCount} în așteptare
            </span>
          ) : (
            <span className="inline-flex items-center gap-2 rounded-full bg-emerald-500/15 px-3 py-1 text-xs font-medium text-emerald-700 dark:text-emerald-300">
              <UsersIcon className="size-3.5" />
              Lobby gol
            </span>
          )}
        </div>

        <div className="mt-4 flex flex-wrap items-center justify-between gap-3">
          <div className="inline-flex rounded-lg border border-slate-200 bg-slate-50 p-1 text-xs font-medium dark:border-slate-800 dark:bg-slate-950">
            {(
              [
                { key: "lobby" as const, label: "Lobby", count: unassignedCount },
                { key: "assigned" as const, label: "Asignați", count: assignedCount },
                { key: "all" as const, label: "Toți", count: users.length },
              ]
            ).map((tab) => (
              <button
                key={tab.key}
                type="button"
                onClick={() => setUserFilter(tab.key)}
                className={
                  userFilter === tab.key
                    ? "rounded-md bg-white px-3 py-1.5 text-slate-900 shadow-sm transition dark:bg-slate-800 dark:text-white"
                    : "rounded-md px-3 py-1.5 text-slate-500 transition hover:text-slate-900 dark:text-slate-400 dark:hover:text-white"
                }
              >
                {tab.label}
                <span className="ml-1 text-[10px] opacity-70">({tab.count})</span>
              </button>
            ))}
          </div>

          <div className="relative w-full max-w-sm">
            <Search className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-slate-400" />
            <input
              value={searchUser}
              onChange={(event) => setSearchUser(event.target.value)}
              placeholder="Caută utilizator..."
              className="w-full rounded-lg border border-slate-200 bg-white py-2 pl-9 pr-3 text-sm text-slate-900 placeholder:text-slate-400 transition focus:border-blue-500 focus:outline-none focus:ring-2 focus:ring-blue-500/30 dark:border-slate-800 dark:bg-slate-950 dark:text-white dark:placeholder:text-slate-500"
            />
          </div>
        </div>
        <div className="mt-3" />

        <div className="overflow-x-auto rounded-xl border border-slate-200/70 dark:border-slate-800">
          <table className="min-w-full divide-y divide-slate-200/70 text-sm dark:divide-slate-800">
            <thead className="bg-slate-50 text-left text-xs font-medium uppercase tracking-wider text-slate-500 dark:bg-slate-950 dark:text-slate-400">
              <tr>
                <th className="px-4 py-3">Utilizator</th>
                <th className="px-4 py-3">Rol</th>
                <th className="px-4 py-3">Organizație</th>
                <th className="px-4 py-3 text-right">Acțiuni</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-200/70 bg-white dark:divide-slate-800 dark:bg-slate-900">
              {filteredUsers.length === 0 ? (
                <tr>
                  <td colSpan={4} className="px-4 py-10 text-center text-sm text-slate-500 dark:text-slate-400">
                    Nu am găsit utilizatori.
                  </td>
                </tr>
              ) : (
                filteredUsers.map((user) => {
                  const orgName = user.org_nume ?? (user.org_id ? orgNameById.get(user.org_id) ?? null : null)
                  return (
                    <tr
                      key={user.id}
                      className="transition-colors hover:bg-slate-50 dark:hover:bg-slate-950/60"
                    >
                      <td className="px-4 py-3">
                        <p className="font-medium text-slate-900 dark:text-white">
                          {user.email ?? "—"}
                        </p>
                        <p className="text-xs text-slate-500 dark:text-slate-400">{user.nume ?? ""}</p>
                      </td>
                      <td className="px-4 py-3">
                        <span
                          className={`inline-flex rounded-full px-2 py-0.5 text-xs font-medium ${ROLE_BADGE[user.role]}`}
                        >
                          {ROLE_LABELS[user.role]}
                        </span>
                      </td>
                      <td className="px-4 py-3">
                        <select
                          value={user.org_id ?? ""}
                          onChange={(event) =>
                            handleAssignOrg(user.id, event.target.value ? event.target.value : null)
                          }
                          disabled={updatingUser || user.role === "super_admin"}
                          title={
                            user.role === "super_admin"
                              ? "Super admin nu poate fi mutat în altă organizație."
                              : undefined
                          }
                          className="rounded-md border border-slate-300 bg-white px-2 py-1 text-xs text-slate-800 transition focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-100 disabled:cursor-not-allowed disabled:opacity-50"
                        >
                          <option value="">— Fără organizație —</option>
                          {organizations.map((org) => (
                            <option key={org.id} value={org.id}>
                              {org.nume}
                            </option>
                          ))}
                        </select>
                        {orgName && (
                          <p className="mt-1 text-[11px] text-slate-500 dark:text-slate-400">Curent: {orgName}</p>
                        )}
                      </td>
                      <td className="px-4 py-3 text-right">
                        <div className="inline-flex flex-wrap items-center justify-end gap-1.5">
                          <Button
                            type="button"
                            size="sm"
                            variant="outline"
                            disabled={
                              updatingUser ||
                              user.role === "org_admin" ||
                              user.role === "super_admin" ||
                              !user.org_id
                            }
                            title={
                              user.role === "super_admin"
                                ? "Super admin nu poate fi modificat."
                                : undefined
                            }
                            onClick={() => handleSetRole(user.id, "org_admin")}
                          >
                            Setează Org Admin
                          </Button>
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            disabled={
                              updatingUser ||
                              user.role === "user" ||
                              user.role === "super_admin"
                            }
                            title={
                              user.role === "super_admin"
                                ? "Super admin nu poate fi modificat."
                                : undefined
                            }
                            onClick={() => handleSetRole(user.id, "user")}
                          >
                            Resetează la user
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
      </section>

      {showCreateModal ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Închide"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setShowCreateModal(false)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Creare organizație
            </h3>
            <p className="mt-1 text-xs text-slate-500 dark:text-slate-400">
              Slug-ul se va genera automat din nume dacă nu îl completezi.
            </p>

            <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Nume
              <input
                value={createNume}
                onChange={(event) => setCreateNume(event.target.value)}
                placeholder="Ex: StarElectro"
                disabled={creating}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <label className="mt-3 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Slug (opțional)
              <input
                value={createSlug}
                onChange={(event) => setCreateSlug(event.target.value)}
                placeholder="starelectro"
                disabled={creating}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setShowCreateModal(false)}
                disabled={creating}
              >
                Anulează
              </Button>
              <Button
                type="button"
                onClick={handleCreate}
                disabled={creating || !createNume.trim()}
                className="bg-blue-600 text-white hover:bg-blue-500"
              >
                {creating ? "Se creează..." : "Creează"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {editTarget ? (
        <div className="fixed inset-0 z-[91] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Închide"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => setEditTarget(null)}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-slate-200 bg-white p-5 shadow-2xl dark:border-slate-800 dark:bg-slate-950">
            <h3 className="text-base font-semibold text-slate-900 dark:text-white">
              Editare organizație
            </h3>

            <label className="mt-4 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Nume
              <input
                value={editNume}
                onChange={(event) => setEditNume(event.target.value)}
                disabled={saving}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>
            <label className="mt-3 block text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
              Slug
              <input
                value={editSlug}
                onChange={(event) => setEditSlug(event.target.value)}
                disabled={saving}
                className="mt-1 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              />
            </label>

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => setEditTarget(null)}
                disabled={saving}
              >
                Anulează
              </Button>
              <Button
                type="button"
                onClick={handleSaveEdit}
                disabled={saving || !editNume.trim()}
                className="bg-blue-600 text-white hover:bg-blue-500"
              >
                {saving ? "Se salvează..." : "Salvează"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {deleteTarget ? (
        <div className="fixed inset-0 z-[92] flex items-center justify-center p-4">
          <button
            type="button"
            aria-label="Închide"
            className="absolute inset-0 bg-black/60 backdrop-blur-sm"
            onClick={() => {
              if (!deleting) {
                setDeleteTarget(null)
                setDeleteConfirm("")
              }
            }}
          />
          <div className="relative z-10 w-full max-w-md rounded-2xl border border-rose-500/40 bg-white p-5 shadow-2xl dark:bg-slate-950">
            <h3 className="text-lg font-semibold text-rose-600 dark:text-rose-300">
              Confirmă ștergerea
            </h3>
            <p className="mt-2 text-sm text-slate-700 dark:text-slate-300">
              Această acțiune este permanentă. Asigură-te că organizația nu mai are utilizatori
              sau examene asociate.
            </p>
            <p className="mt-3 text-sm text-slate-600 dark:text-slate-400">
              Pentru confirmare tastați:{" "}
              <span className="font-semibold text-slate-900 dark:text-white">{deleteTarget.nume}</span>
            </p>
            <input
              value={deleteConfirm}
              onChange={(event) => setDeleteConfirm(event.target.value)}
              className="mt-3 w-full rounded-lg border border-slate-300 bg-white px-3 py-2 text-sm text-slate-900 dark:border-slate-700 dark:bg-slate-900 dark:text-white"
              disabled={deleting}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDeleteTarget(null)
                  setDeleteConfirm("")
                }}
                disabled={deleting}
              >
                Anulează
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDelete}
                disabled={deleting || deleteConfirm.trim() !== deleteTarget.nume}
              >
                {deleting ? "Se șterge..." : "Șterge definitiv"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}
    </div>
  )
}
