import { ReactNode } from "react"
import { redirect } from "next/navigation"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { getAdminContext } from "@/lib/auth/admin-context"
import { AdminLayoutShell } from "@/components/admin/AdminSidebar"

type AdminLayoutProps = {
  children: ReactNode
}

export default async function AdminLayout({ children }: AdminLayoutProps) {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    redirect("/login")
  }

  const context = await getAdminContext()
  if (!context) {
    redirect("/")
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
