import { createClient } from "@supabase/supabase-js"
import { UserManagement } from "@/components/admin/UserManagement"
import { ExamManagement } from "@/components/admin/ExamManagement"
import { type UserProfileRow, type ExamOption } from "@/components/admin/UsersTable"

export const dynamic = "force-dynamic"

export default async function AdminPage() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  let profiles: UserProfileRow[] = []
  let examene: ExamOption[] = []
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

    const nowIso = new Date().toISOString()
    const [profilesResult, exameneResult, accessResult, questionsResult] = await Promise.all([
      adminSupabase
        .from("profiles")
        .select("id, nume, email, role")
        .neq("role", "admin")
        .order("email", { ascending: true }),
      adminSupabase.from("examene").select("id, nume_examen").order("id", { ascending: true }),
      adminSupabase
        .from("acces_examene")
        .select("user_id, examen_id, data_expirare")
        .gt("data_expirare", nowIso),
      adminSupabase.from("intrebari").select("examen_id"),
    ])

    if (profilesResult.error || exameneResult.error || accessResult.error || questionsResult.error) {
      fetchError =
        profilesResult.error?.message ||
        exameneResult.error?.message ||
        accessResult.error?.message ||
        questionsResult.error?.message ||
        "A apărut o eroare la încărcarea datelor admin."
    } else {
      profiles = profilesResult.data ?? []
      const questionCountByExamId = new Map<number, number>()
      for (const row of questionsResult.data ?? []) {
        const examId = Number(row.examen_id)
        questionCountByExamId.set(examId, (questionCountByExamId.get(examId) ?? 0) + 1)
      }

      examene = (exameneResult.data ?? []).map((exam) => ({
        id: Number(exam.id),
        nume_examen: exam.nume_examen ?? `Examen ${exam.id}`,
        question_count: questionCountByExamId.get(Number(exam.id)) ?? 0,
      }))

      const examNameById = new Map<number, string>(
        examene.map((exam) => [exam.id, exam.nume_examen])
      )

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

  return (
    <main className="min-h-screen bg-background px-4 py-10">
      <div className="mx-auto max-w-6xl rounded-xl border border-border bg-card p-6 shadow-sm">
        <h1 className="text-2xl font-semibold text-foreground">Admin Dashboard</h1>
        <p className="mt-2 text-sm text-muted-foreground">User and exam administration</p>

        {fetchError ? (
          <p className="mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            Nu am putut încărca utilizatorii: {fetchError}
          </p>
        ) : (
          <div className="mt-6 grid gap-6">
            <ExamManagement examene={examene} />
            <UserManagement
              profiles={profiles}
              examene={examene}
              activeAccessByUser={activeAccessByUser}
            />
          </div>
        )}
      </div>
    </main>
  )
}
