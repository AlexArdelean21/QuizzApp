import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { Building2 } from "lucide-react"
import { getAdminContext } from "@/lib/auth/admin-context"
import { normalizeRole, type AppRole } from "@/lib/auth/roles"
import { OrganizationManagement } from "@/components/admin/OrganizationManagement"
import type { AdminOrganizationRow, AdminUserRow } from "@/app/admin/actions"

export const dynamic = "force-dynamic"

type OrganizationRelation =
  | { id?: string | null; nume?: string | null }
  | { id?: string | null; nume?: string | null }[]
  | null
  | undefined

function pickOrgFromRelation(relation: OrganizationRelation): {
  id: string | null
  nume: string | null
} {
  if (!relation) return { id: null, nume: null }
  const record = Array.isArray(relation) ? relation[0] : relation
  if (!record) return { id: null, nume: null }
  return {
    id: record.id ? String(record.id) : null,
    nume: record.nume ? String(record.nume) : null,
  }
}

export default async function GlobalAdminPage() {
  const context = await getAdminContext()
  if (!context) {
    redirect("/")
  }
  if (!context.isSuperAdmin) {
    redirect("/admin")
  }

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-300">
          Lipsesc variabilele Supabase pentru acces admin.
        </div>
      </div>
    )
  }

  const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })

  const [orgsResult, profilesResult, examsResult] = await Promise.all([
    adminSupabase
      .from("organizatii")
      .select("id, nume, slug, created_at")
      .order("nume", { ascending: true }),
    adminSupabase
      .from("profiles")
      .select("id, nume, email, role, org_id, organizatii(id, nume)")
      .order("email", { ascending: true }),
    adminSupabase.from("examene").select("id, org_id"),
  ])

  if (orgsResult.error || profilesResult.error || examsResult.error) {
    return (
      <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-300">
          {orgsResult.error?.message ||
            profilesResult.error?.message ||
            examsResult.error?.message}
        </div>
      </div>
    )
  }

  const organizations: AdminOrganizationRow[] = (orgsResult.data ?? []).map((row) => ({
    id: String(row.id),
    nume: String(row.nume ?? ""),
    slug: String(row.slug ?? ""),
    created_at: row.created_at ? String(row.created_at) : null,
  }))

  const users: AdminUserRow[] = (profilesResult.data ?? []).map((row) => {
    const orgInfo = pickOrgFromRelation(row.organizatii as OrganizationRelation)
    return {
      id: String(row.id),
      nume: row.nume ? String(row.nume) : null,
      email: row.email ? String(row.email) : null,
      role: normalizeRole(row.role) as AppRole,
      org_id: row.org_id ? String(row.org_id) : orgInfo.id,
      org_nume: orgInfo.nume,
    }
  })

  const orgStats: Record<string, { users: number; exams: number }> = {}
  for (const org of organizations) orgStats[org.id] = { users: 0, exams: 0 }
  for (const user of users) {
    if (user.org_id && orgStats[user.org_id]) {
      orgStats[user.org_id].users += 1
    }
  }
  for (const exam of examsResult.data ?? []) {
    const orgId = exam.org_id ? String(exam.org_id) : null
    if (orgId && orgStats[orgId]) {
      orgStats[orgId].exams += 1
    }
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

      <OrganizationManagement
        organizations={organizations}
        users={users}
        stats={orgStats}
      />
    </div>
  )
}
