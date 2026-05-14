import "server-only"

import { createSupabaseServerClient } from "@/lib/supabase/server"
import {
  isAdminRole,
  isOrgScopedAdminRole,
  isSuperAdminRole,
  normalizeRole,
  type AppRole,
} from "@/lib/auth/roles"

export type AdminContext = {
  userId: string
  email: string | null
  fullName: string | null
  role: AppRole
  orgId: string | null
  orgName: string | null
  isSuperAdmin: boolean
  isOrgAdmin: boolean
  isAdmin: boolean
  // Helper that should be applied to every admin-area Supabase query when the
  // actor is org-scoped. Super admins receive `null` and skip the filter.
  scopedOrgId: string | null
}

export class AdminAccessError extends Error {
  status: 401 | 403

  constructor(status: 401 | 403, message: string) {
    super(message)
    this.status = status
    this.name = "AdminAccessError"
  }
}

export async function getAdminContext(): Promise<AdminContext | null> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) return null

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role, nume, email, org_id, organizatii(id, nume)")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || !profile) return null

  const role = normalizeRole(profile.role)
  if (!isAdminRole(role)) return null

  const isSuper = isSuperAdminRole(role)
  const isOrg = isOrgScopedAdminRole(role)
  const orgId = profile.org_id ? String(profile.org_id) : null

  // org_admin without an org_id has no sandbox to operate inside; treat them
  // as ordinary users so they cannot accidentally see global data.
  if (isOrg && !orgId) return null

  const orgRelation = profile.organizatii as
    | { id?: string | null; nume?: string | null }
    | { id?: string | null; nume?: string | null }[]
    | null
    | undefined
  const orgRecord = Array.isArray(orgRelation) ? orgRelation[0] : orgRelation
  const orgName = orgRecord?.nume ? String(orgRecord.nume) : null

  return {
    userId: user.id,
    email: user.email ?? (profile.email ? String(profile.email) : null),
    fullName: profile.nume ? String(profile.nume) : null,
    role,
    orgId,
    orgName,
    isSuperAdmin: isSuper,
    isOrgAdmin: isOrg,
    isAdmin: true,
    scopedOrgId: isSuper ? null : orgId,
  }
}

export async function requireAdminContext(): Promise<AdminContext> {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new AdminAccessError(401, "Neautorizat.")
  }

  const context = await getAdminContext()
  if (!context) {
    throw new AdminAccessError(403, "Acces interzis.")
  }
  return context
}

export async function requireSuperAdminContext(): Promise<AdminContext> {
  const context = await requireAdminContext()
  if (!context.isSuperAdmin) {
    throw new AdminAccessError(403, "Doar super admin poate face această acțiune.")
  }
  return context
}
