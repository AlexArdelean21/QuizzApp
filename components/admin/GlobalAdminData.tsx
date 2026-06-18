import { createClient } from "@supabase/supabase-js"
import { normalizeRole, type AppRole } from "@/lib/auth/roles"
import { OrganizationManagement } from "@/components/admin/OrganizationManagement"
import type { AdminOrganizationRow, AdminUserRow } from "@/app/admin/actions"

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

// Async server component that owns the heavy /admin/global data fetching:
//   - organizations + profiles + examene (parallel)
//   - per-org user/exam counts (computed from already-loaded data)
//
// Lives behind a Suspense boundary so /admin/global can paint its header
// instantly while these service-role queries stream in. Stays server-only —
// the service-role client never crosses into a client component.
export async function GlobalAdminData() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return (
      <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-300">
        Lipsesc variabilele Supabase pentru acces admin.
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
      .select("id, nume, slug, created_at, invite_links_enabled")
      .order("nume", { ascending: true }),
    adminSupabase
      .from("profiles")
      .select("id, nume, email, role, org_id, organizatii(id, nume)")
      .order("email", { ascending: true }),
    adminSupabase.from("examene").select("id, org_id"),
  ])

  if (orgsResult.error || profilesResult.error || examsResult.error) {
    return (
      <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-300">
        {orgsResult.error?.message ||
          profilesResult.error?.message ||
          examsResult.error?.message}
      </div>
    )
  }

  const organizations: AdminOrganizationRow[] = (orgsResult.data ?? []).map((row) => ({
    id: String(row.id),
    nume: String(row.nume ?? ""),
    slug: String(row.slug ?? ""),
    created_at: row.created_at ? String(row.created_at) : null,
    invite_links_enabled: Boolean(row.invite_links_enabled),
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
    <OrganizationManagement
      organizations={organizations}
      users={users}
      stats={orgStats}
    />
  )
}
