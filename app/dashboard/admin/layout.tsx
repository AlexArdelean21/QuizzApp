import type { ReactNode } from "react"
import { notFound, redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getAdminContext } from "@/lib/auth/admin-context"
import { AdminLayoutShell } from "@/components/admin/AdminSidebar"

type DashboardAdminLayoutProps = {
  children: ReactNode
}

export default async function DashboardAdminLayout({ children }: DashboardAdminLayoutProps) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error,
  } = await supabase.auth.getUser()

  if (error || !user) {
    redirect("/login")
  }

  const context = await getAdminContext()
  if (!context) {
    notFound()
  }

  return (
    <AdminLayoutShell
      email={context.email}
      fullName={context.fullName}
      role={context.role}
      orgName={context.orgName}
      isSuperAdmin={context.isSuperAdmin}
    >
      {children}
    </AdminLayoutShell>
  )
}
