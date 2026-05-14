export type AppRole = "super_admin" | "org_admin" | "user"

export const ADMIN_ROLES: ReadonlyArray<AppRole> = ["super_admin", "org_admin"]

// Legacy values that used to live in the database. Anything we don't
// explicitly recognise here gets demoted to a regular "user" so stale
// records can never accidentally grant elevated privileges.
const LEGACY_ROLE_ALIASES: Record<string, AppRole> = {
  admin: "user",
}

export function normalizeRole(rawRole: string | null | undefined): AppRole {
  const value = String(rawRole ?? "").trim().toLowerCase()
  if (value === "super_admin" || value === "org_admin" || value === "user") {
    return value
  }
  if (value in LEGACY_ROLE_ALIASES) {
    return LEGACY_ROLE_ALIASES[value]
  }
  return "user"
}

export function isAdminRole(rawRole: string | null | undefined): boolean {
  return ADMIN_ROLES.includes(normalizeRole(rawRole))
}

export function isSuperAdminRole(rawRole: string | null | undefined): boolean {
  return normalizeRole(rawRole) === "super_admin"
}

// org_admins are scoped to their organization; super_admins are not.
export function isOrgScopedAdminRole(rawRole: string | null | undefined): boolean {
  return normalizeRole(rawRole) === "org_admin"
}
