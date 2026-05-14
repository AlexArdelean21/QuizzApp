import { redirect } from "next/navigation"
import { createClient } from "@supabase/supabase-js"
import { getAdminContext } from "@/lib/auth/admin-context"
import { normalizeRole, type AppRole } from "@/lib/auth/roles"
import { AnalyticsOverview } from "@/components/admin/AnalyticsOverview"
import { UserManagement } from "@/components/admin/UserManagement"
import { ExamManagement } from "@/components/admin/ExamManagement"
import type {
  AdminExamRow,
  AdminOrganizationRow,
  AdminUserRow,
} from "@/app/admin/actions"

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

export default async function AdminPage() {
  const context = await getAdminContext()
  if (!context) redirect("/")

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  let profiles: AdminUserRow[] = []
  let examene: AdminExamRow[] = []
  let organizations: AdminOrganizationRow[] = []
  const activeAccessByUser: Record<string, string[]> = {}
  let fetchError: string | null = null

  if (!supabaseUrl || !serviceRoleKey) {
    fetchError = "Lipsesc variabilele de mediu pentru acces admin la Supabase."
  } else {
    const adminSupabase = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    const orgFilter = context.scopedOrgId
    const nowIso = new Date().toISOString()

    // org_admin sandbox:
    //   * Users must belong to the same organization (eq org_id)
    //   * Super admins are invisible (neq role)
    //   * Unassigned users (org_id IS NULL) are filtered out by eq org_id
    let profilesQuery = adminSupabase
      .from("profiles")
      .select("id, nume, email, role, org_id, organizatii(id, nume)")
      .order("email", { ascending: true })
    if (orgFilter) {
      profilesQuery = profilesQuery
        .eq("org_id", orgFilter)
        .neq("role", "super_admin")
    }

    let exameneQuery = adminSupabase
      .from("examene")
      .select(
        "id, nume_examen, org_id, prag_trecere, intrebari_simulare, variante_raspuns, durata_minute, organizatii(id, nume)"
      )
      .order("nume_examen", { ascending: true })
    if (orgFilter) {
      exameneQuery = exameneQuery.eq("org_id", orgFilter)
    }

    const [profilesResult, exameneResult, orgsResult] = await Promise.all([
      profilesQuery,
      exameneQuery,
      adminSupabase
        .from("organizatii")
        .select("id, nume, slug, created_at")
        .order("nume", { ascending: true }),
    ])

    if (profilesResult.error || exameneResult.error || orgsResult.error) {
      fetchError =
        profilesResult.error?.message ||
        exameneResult.error?.message ||
        orgsResult.error?.message ||
        "A apărut o eroare la încărcarea datelor admin."
    } else {
      organizations = (orgsResult.data ?? []).map((row) => ({
        id: String(row.id),
        nume: String(row.nume ?? ""),
        slug: String(row.slug ?? ""),
        created_at: row.created_at ? String(row.created_at) : null,
      }))

      profiles = (profilesResult.data ?? []).map((row) => {
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

      const examRows = exameneResult.data ?? []
      const questionCountByExamId = new Map<number, number>()

      const countResults = await Promise.all(
        examRows.map(async (exam) => {
          const examId = Number(exam.id)
          const result = await adminSupabase
            .from("intrebari")
            .select("id", { count: "exact", head: true })
            .eq("examen_id", examId)

          return { examId, result }
        })
      )

      const countError = countResults.find(({ result }) => result.error)?.result.error
      if (countError) {
        fetchError = countError.message
      } else {
        for (const { examId, result } of countResults) {
          questionCountByExamId.set(examId, result.count ?? 0)
        }

        examene = examRows.map((exam) => {
          const orgInfo = pickOrgFromRelation(exam.organizatii as OrganizationRelation)
          return {
            id: Number(exam.id),
            nume_examen: exam.nume_examen ? String(exam.nume_examen) : `Examen ${exam.id}`,
            org_id: exam.org_id ? String(exam.org_id) : orgInfo.id,
            org_nume: orgInfo.nume,
            question_count: questionCountByExamId.get(Number(exam.id)) ?? 0,
            prag_trecere: Number(exam.prag_trecere ?? 18),
            intrebari_simulare: Number(exam.intrebari_simulare ?? 25),
            variante_raspuns: Number(exam.variante_raspuns ?? 3),
            durata_minute: Number(exam.durata_minute ?? 30),
          }
        })

        const examIds = examene.map((exam) => exam.id)
        const examNameById = new Map<number, string>(
          examene.map((exam) => [exam.id, exam.nume_examen])
        )

        let accessQuery = adminSupabase
          .from("acces_examene")
          .select("user_id, examen_id, data_expirare")
          .gt("data_expirare", nowIso)
        if (orgFilter && examIds.length > 0) {
          accessQuery = accessQuery.in("examen_id", examIds)
        } else if (orgFilter && examIds.length === 0) {
          accessQuery = accessQuery.eq("examen_id", -1)
        }
        const accessResult = await accessQuery

        if (accessResult.error) {
          fetchError = accessResult.error.message
        } else {
          for (const row of accessResult.data ?? []) {
            const userId = String(row.user_id)
            const examId = Number(row.examen_id)
            const examName = examNameById.get(examId) ?? `Examen ${examId}`

            if (!activeAccessByUser[userId]) {
              activeAccessByUser[userId] = []
            }

            if (!activeAccessByUser[userId].includes(examName)) {
              activeAccessByUser[userId].push(examName)
            }
          }
        }
      }
    }
  }

  const scopeLabel = context.isSuperAdmin
    ? "Vizualizare globală — toate organizațiile."
    : context.orgName
      ? `Vizualizare pentru organizația ${context.orgName}.`
      : "Contul tău nu este asociat unei organizații."

  return (
    <div className="mx-auto w-full max-w-7xl px-4 py-8 sm:px-6 lg:px-8">
      {fetchError ? (
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-300">
          Nu am putut încărca datele admin: {fetchError}
        </div>
      ) : (
        <div className="flex flex-col gap-6">
          <AnalyticsOverview scopeLabel={scopeLabel} />
          <ExamManagement
            examene={examene}
            organizations={organizations}
            isSuperAdmin={context.isSuperAdmin}
            defaultOrgId={context.scopedOrgId}
          />
          <UserManagement
            profiles={profiles}
            examene={examene}
            organizations={organizations}
            activeAccessByUser={activeAccessByUser}
            isSuperAdmin={context.isSuperAdmin}
            currentUserId={context.userId}
          />
        </div>
      )}
    </div>
  )
}
