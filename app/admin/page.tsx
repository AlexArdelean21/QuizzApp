import { Suspense } from "react"
import { redirect } from "next/navigation"
import { getAdminContext } from "@/lib/auth/admin-context"
import { AnalyticsOverview } from "@/components/admin/AnalyticsOverview"
import { AdminDashboardData } from "@/components/admin/AdminDashboardData"
import {
  AdminDashboardSkeleton,
  AnalyticsOverviewSkeleton,
} from "@/components/admin/AdminDashboardSkeleton"

export const dynamic = "force-dynamic"

// /admin used to do all its DB work (profiles, exams, orgs, access, per-exam
// question counts) inline before returning JSX, which blocked FCP behind the
// slowest query. We now keep this page as a thin auth-gated shell and stream
// the two heavy server components in independently:
//
//   * <AnalyticsOverview /> — 4 KPI counts (own Supabase round-trip)
//   * <AdminDashboardData /> — profiles + exams + access + org breakdown
//
// Each one has its own Suspense boundary so a slow KPI query never holds back
// the org/users/exams panels and vice versa.
export default async function AdminPage() {
  const context = await getAdminContext()
  if (!context) redirect("/")

  const scopeLabel = context.isSuperAdmin
    ? "Vizualizare globală — toate organizațiile."
    : context.orgName
      ? `Vizualizare pentru organizația ${context.orgName}.`
      : "Contul tău nu este asociat unei organizații."

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="flex flex-col gap-6">
        <Suspense fallback={<AnalyticsOverviewSkeleton />}>
          <AnalyticsOverview scopeLabel={scopeLabel} />
        </Suspense>

        <Suspense fallback={<AdminDashboardSkeleton isSuperAdmin={context.isSuperAdmin} />}>
          <AdminDashboardData context={context} />
        </Suspense>
      </div>
    </div>
  )
}
