"use client"

import { useState, useTransition } from "react"
import { Button } from "@/components/ui/button"
import { deleteUser, grantExamAccess } from "@/app/admin/actions"

export type UserProfileRow = {
  id: string
  nume: string | null
  email: string | null
  role: string | null
}

export type ExamOption = {
  id: number
  nume_examen: string
  question_count?: number
}

type UsersTableProps = {
  profiles: UserProfileRow[]
  examene: ExamOption[]
  activeAccessByUser: Record<string, string[]>
}

type PendingAction = {
  type: "grant" | "delete"
  userId: string
} | null

export function UsersTable({
  profiles,
  examene,
  activeAccessByUser,
}: UsersTableProps) {
  const [isPending, startTransition] = useTransition()
  const [pendingAction, setPendingAction] = useState<PendingAction>(null)
  const [selectedExamByUser, setSelectedExamByUser] = useState<Record<string, number>>({})
  const [daysByUser, setDaysByUser] = useState<Record<string, number>>({})

  const defaultExamId = examene[0]?.id ?? null

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
          window.alert("Nu s-a putut acorda accesul pentru utilizator.")
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
          window.alert("Nu s-a putut șterge utilizatorul.")
        } finally {
          setPendingAction(null)
        }
      })()
    })
  }

  return (
    <section className="mt-6">
      <div className="overflow-x-auto rounded-lg border border-border">
        <table className="min-w-full divide-y divide-border text-sm">
          <thead className="bg-muted/40">
            <tr>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Email</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Name</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Role</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Active Access</th>
              <th className="px-4 py-3 text-left font-medium text-muted-foreground">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border bg-card">
            {profiles.length === 0 ? (
              <tr>
                <td colSpan={5} className="px-4 py-6 text-center text-muted-foreground">
                  No users found.
                </td>
              </tr>
            ) : (
              profiles.map((profile) => (
                <tr key={profile.id} className="hover:bg-muted/20">
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">
                    {profile.email ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">
                    {profile.nume ?? "-"}
                  </td>
                  <td className="whitespace-nowrap px-4 py-3 text-foreground">
                    {profile.role ?? "-"}
                  </td>
                  <td className="px-4 py-3 text-muted-foreground">
                    {(activeAccessByUser[profile.id] ?? []).length > 0 ? (
                      <div className="flex flex-wrap gap-2">
                        {(activeAccessByUser[profile.id] ?? []).map((examName) => (
                          <span
                            key={`${profile.id}-${examName}`}
                            className="rounded-full bg-emerald-500/15 px-2 py-1 text-xs text-emerald-300"
                          >
                            {examName}
                          </span>
                        ))}
                      </div>
                    ) : (
                      <span className="rounded-full bg-slate-700/70 px-2 py-1 text-xs text-slate-300">
                        No Access
                      </span>
                    )}
                  </td>
                  <td className="px-4 py-3">
                    <div className="flex flex-wrap items-center gap-2">
                      <select
                        value={selectedExamByUser[profile.id] ?? defaultExamId ?? ""}
                        onChange={(event) =>
                          setSelectedExamByUser((prev) => ({
                            ...prev,
                            [profile.id]: Number(event.target.value),
                          }))
                        }
                        className="rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                        disabled={isPending || examene.length === 0}
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
                        className="w-20 rounded border border-slate-700 bg-slate-800 px-2 py-1 text-xs text-slate-100"
                        disabled={isPending}
                      />
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        disabled={isPending || examene.length === 0}
                        onClick={() => handleGrantAccess(profile.id)}
                      >
                        {pendingAction?.type === "grant" && pendingAction.userId === profile.id
                          ? "Granting..."
                          : "Grant Access"}
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        disabled={isPending}
                        onClick={() => handleDeleteUser(profile.id, profile.email)}
                      >
                        {pendingAction?.type === "delete" &&
                        pendingAction.userId === profile.id
                          ? "Deleting..."
                          : "Delete"}
                      </Button>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </section>
  )
}
