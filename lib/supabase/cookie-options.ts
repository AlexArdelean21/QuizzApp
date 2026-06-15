/**
 * Shared cookie options for all Supabase clients (browser + server).
 *
 * "Remember me" handling:
 *   - When the user checks "remember me", auth cookies persist for 30 days.
 *   - When unchecked, auth cookies are session cookies (no maxAge), so they
 *     are cleared when the browser fully closes.
 *
 * The choice is stored in a separate non-sensitive cookie ("qh-remember")
 * so middleware and server clients can apply the correct maxAge on every
 * token refresh, keeping the behavior consistent across the whole app.
 */

export const REMEMBER_COOKIE_NAME = "qh-remember"
export const REMEMBER_MAX_AGE_SECONDS = 30 * 24 * 60 * 60 // 30 days

// Base options shared by all Supabase auth cookies. Intentionally has NO
// maxAge — callers add it conditionally based on the remember-me choice.
export const SUPABASE_COOKIE_BASE = {
  path: "/" as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  httpOnly: false,
}

/**
 * Returns the cookie options to use for Supabase auth cookies, given whether
 * the user opted into "remember me".
 *   remember = true  → base + maxAge 30 days (persistent)
 *   remember = false → base only (session cookie)
 */
export function getSupabaseCookieOptions(remember: boolean) {
  if (remember) {
    return { ...SUPABASE_COOKIE_BASE, maxAge: REMEMBER_MAX_AGE_SECONDS }
  }
  return { ...SUPABASE_COOKIE_BASE }
}

/**
 * Options for the qh-remember flag cookie itself. It must always be persistent
 * enough to survive across the 30-day window so the middleware can keep
 * reading the choice. It is non-sensitive (just "1" or "0").
 */
export const REMEMBER_FLAG_COOKIE_OPTIONS = {
  path: "/" as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  httpOnly: false,
  maxAge: REMEMBER_MAX_AGE_SECONDS,
}

// Back-compat default kept for any remaining imports: behaves as session
// cookie (no maxAge). Prefer getSupabaseCookieOptions(remember) instead.
export const SUPABASE_COOKIE_OPTIONS = { ...SUPABASE_COOKIE_BASE }
