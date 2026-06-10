import { notFound, redirect } from "next/navigation"
import { Link2, Lock } from "lucide-react"
import { createSupabaseServerClient } from "@/lib/supabase/server"
import { normalizeRole } from "@/lib/auth/roles"
import { InviteManagement } from "@/components/admin/InviteManagement"

export const dynamic = "force-dynamic"

export default async function InvitePage() {
  const supabase = await createSupabaseServerClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) {
    redirect("/login")
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role, org_id")
    .eq("id", user.id)
    .maybeSingle()

  const role = normalizeRole(profile?.role)

  if (role !== "org_admin" && role !== "super_admin") {
    notFound()
  }

  // Super admin manages invite links from /admin/global, not here.
  if (role === "super_admin") {
    notFound()
  }

  const orgId = profile?.org_id ? String(profile.org_id) : null

  if (!orgId) {
    return (
      <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
        <div className="rounded-2xl border border-rose-500/40 bg-rose-500/10 p-4 text-sm text-rose-600 dark:text-rose-300">
          Contul tău nu este asociat unei organizații.
        </div>
      </main>
    )
  }

  const { data: org } = await supabase
    .from("organizatii")
    .select("id, nume, invite_links_enabled")
    .eq("id", orgId)
    .maybeSingle()

  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-8 sm:px-6 lg:px-8">
      <div className="mb-6 flex items-center gap-3">
        <div className="flex size-12 items-center justify-center rounded-2xl bg-blue-500/15 text-blue-600 dark:text-blue-300">
          <Link2 className="size-6" />
        </div>
        <div>
          <p className="text-xs font-medium uppercase tracking-wider text-slate-500 dark:text-slate-400">
            {org?.nume ?? "Organizație"}
          </p>
          <h1 className="text-2xl font-semibold text-slate-900 dark:text-white">
            Invite Links
          </h1>
          <p className="mt-1 text-sm text-slate-500 dark:text-slate-400">
            Generează linkuri de invitație pentru a adăuga membri noi direct în organizație.
          </p>
        </div>
      </div>

      {!org?.invite_links_enabled ? (
        <div className="rounded-2xl border border-slate-200 bg-white p-8 text-center dark:border-slate-800 dark:bg-slate-900">
          <Lock className="mx-auto mb-3 size-10 text-slate-400" />
          <h2 className="text-base font-semibold text-slate-900 dark:text-white">
            Funcție dezactivată
          </h2>
          <p className="mt-2 text-sm text-slate-500 dark:text-slate-400">
            Invite links nu sunt activate pentru organizația ta. Contactează
            administratorul platformei pentru a activa această funcție.
          </p>
        </div>
      ) : (
        <InviteManagement
          orgId={orgId}
          inviteLinksEnabled={org.invite_links_enabled}
          isSuperAdmin={false}
        />
      )}
    </main>
  )
}
