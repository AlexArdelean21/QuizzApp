/**
 * Shared cookie options for all Supabase clients (browser + server).
 *
 * Rules:
 * - secure: false on plain HTTP (localhost dev); true only on HTTPS production.
 * - sameSite: 'lax' — allows the cookie to be sent on top-level cross-site GET
 *   navigation, which is exactly the Supabase email-link → /auth/callback
 *   redirect chain.
 * - path: '/' — visible to every route, especially /auth/callback.
 * - httpOnly: false — the @supabase/ssr default; JS-readable.
 * - maxAge: 400 days — matches @supabase/ssr DEFAULT_COOKIE_OPTIONS.
 */
export const SUPABASE_COOKIE_OPTIONS = {
  path: "/" as const,
  sameSite: "lax" as const,
  secure: process.env.NODE_ENV === "production",
  httpOnly: false,
  maxAge: 400 * 24 * 60 * 60,
}
