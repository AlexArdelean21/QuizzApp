import { Suspense } from "react"
import { redirect } from "next/navigation"
import { Building2 } from "lucide-react"
import { getAdminContext } from "@/lib/auth/admin-context"
import { GlobalAdminData } from "@/components/admin/GlobalAdminData"
import { OrganizationManagementSkeleton } from "@/components/admin/OrganizationManagementSkeleton"

export const dynamic = "force-dynamic"

// /admin/global used to await the full Promise.all (orgs + profiles + exams)
// before returning any JSX, so the entire page — header included — blocked on
// the slowest query. We now keep this page as a thin auth-gated shell that
// paints the header immediately and streams the data fetch behind a Suspense
// boundary (see GlobalAdminData). The auth gate stays here so unauthorized
// users never reach the service-role fetch.
export default async function GlobalAdminPage() {
  const context = await getAdminContext()
  if (!context) {
    redirect("/")
  }
  if (!context.isSuperAdmin) {
    redirect("/admin")
  }

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-300">
          <Building2 className="size-6" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            Super Admin
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Organization Management
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Gestionează toate organizațiile platformei și asignează admini de organizație.
          </p>
        </div>
      </div>

      <Suspense fallback={<OrganizationManagementSkeleton />}>
        <GlobalAdminData />
      </Suspense>
    </div>
  )
}
