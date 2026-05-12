"use client"

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
  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <h2 className="text-xl font-semibold text-foreground">User Management</h2>
      <p className="mt-1 text-sm text-muted-foreground">
        Administrează utilizatorii și acordă acces pe examen.
      </p>
      <UsersTable
        profiles={profiles}
        examene={examene}
        activeAccessByUser={activeAccessByUser}
      />
    </section>
  )
}
