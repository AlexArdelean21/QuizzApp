import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") ?? "/update-password"

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    console.error("[auth/callback] Missing Supabase env vars")
    return NextResponse.redirect(new URL("/login?error=server-config", requestUrl.origin))
  }

  if (!code) {
    console.error("[auth/callback] No code param in URL")
    return NextResponse.redirect(new URL("/login?error=missing-code", requestUrl.origin))
  }

  // ── Cookie diagnostics ────────────────────────────────────────────────────
  // Log the raw Cookie request header so we can see exactly what the browser
  // sent, including cookie names and presence of the code-verifier.
  const rawCookieHeader = request.headers.get("cookie") ?? "(none)"
  console.log("[auth/callback] Raw Cookie header:", rawCookieHeader)

  const allCookies = request.cookies.getAll()
  const cookieNames = allCookies.map((c) => c.name)
  const verifierCookie = allCookies.find((c) => c.name.includes("code-verifier"))

  console.log("[auth/callback] Parsed cookie names:", cookieNames)
  console.log(
    "[auth/callback] Code-verifier cookie:",
    verifierCookie
      ? `FOUND — name: ${verifierCookie.name}, value length: ${verifierCookie.value.length}`
      : "NOT FOUND"
  )
  // ─────────────────────────────────────────────────────────────────────────

  if (!verifierCookie) {
    // Diagnostic: set a short-lived test cookie in the redirect response.
    // On the login page that follows, the client-side diagnostic will check
    // whether *this* cookie survived — if it does but the verifier didn't,
    // the issue is specifically with when/how the verifier was stored.
    const errorRedirect = NextResponse.redirect(
      new URL("/login?error=auth-code-error&diag=no-verifier", requestUrl.origin)
    )
    errorRedirect.cookies.set("sb-diag-test", "1", {
      ...SUPABASE_COOKIE_OPTIONS,
      maxAge: 300, // 5 minutes — enough time to inspect in DevTools
    })
    console.log(
      "[auth/callback] Verifier missing — set sb-diag-test cookie in redirect"
    )
    return errorRedirect
  }

  // The redirect response is declared here so setAll can attach session cookies.
  let response = NextResponse.redirect(new URL(next, requestUrl.origin))

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          request.cookies.set(name, value)
        })
        response = NextResponse.redirect(new URL(next, requestUrl.origin))
        cookiesToSet.forEach(({ name, value }) => {
          response.cookies.set(name, value, SUPABASE_COOKIE_OPTIONS)
        })
        if (headers) {
          Object.entries(headers).forEach(([key, val]) => {
            response.headers.set(key, val)
          })
        }
      },
    },
  })

  const { error } = await supabase.auth.exchangeCodeForSession(code)

  if (error) {
    console.error(
      `[auth/callback] exchangeCodeForSession failed — status: ${error.status ?? "n/a"}, message: ${error.message}`
    )
    return NextResponse.redirect(
      new URL("/login?error=auth-code-error", requestUrl.origin)
    )
  }

  console.log("[auth/callback] Session established, redirecting to:", next)
  return response
}
