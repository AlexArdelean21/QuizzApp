import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options"

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
  }

  let body: { email?: string }
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const email = body.email?.trim()
  if (!email) {
    return NextResponse.json({ error: "Email is required" }, { status: 400 })
  }

  // Derive the origin from the request so the redirectTo always exactly matches
  // the host the browser is on — prevents localhost vs 127.0.0.1 mismatches.
  const origin =
    request.headers.get("origin") ??
    (() => {
      const ref = request.headers.get("referer")
      if (ref) {
        try { return new URL(ref).origin } catch { /* fall through */ }
      }
      return new URL(request.url).origin
    })()

  const redirectTo = `${origin}/auth/callback?next=/update-password`
  console.log("[reset-password] redirectTo:", redirectTo)

  // Start with the success response. We mutate this object via
  // response.cookies.set() — we do NOT recreate it in setAll, so cookies
  // accumulate across multiple setAll calls correctly.
  const response = NextResponse.json({ success: true })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    // Pass explicit cookieOptions so applyServerStorage uses them for every
    // Set-Cookie it writes (the library merges these with DEFAULT_COOKIE_OPTIONS).
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      /**
       * setAll receives two arguments per the SetAllCookies type:
       *   1. cookiesToSet — array of { name, value, options }
       *   2. headers      — Cache-Control / Expires / Pragma that MUST be
       *                     forwarded to prevent CDN caching of the response.
       *
       * We override every cookie's options with SUPABASE_COOKIE_OPTIONS so
       * secure:false is guaranteed on HTTP localhost regardless of what
       * applyServerStorage calculated.
       */
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          response.cookies.set(name, value, SUPABASE_COOKIE_OPTIONS)
        })

        // Forward the required no-cache headers.
        if (headers) {
          Object.entries(headers).forEach(([key, val]) => {
            response.headers.set(key, val)
          })
        }

        // ── Diagnostics ──────────────────────────────────────────────────
        const fullSetCookies = response.headers.getSetCookie?.() ?? []
        console.log(
          "[reset-password] setAll — full Set-Cookie strings:",
          fullSetCookies
        )
      },
    },
  })

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  if (error) {
    console.error("[reset-password] resetPasswordForEmail error:", error.message)
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  // Final confirmation: log what the browser will actually receive.
  const setCookieHeaders = response.headers.getSetCookie?.() ?? []
  console.log(
    "[reset-password] Final response Set-Cookie headers:",
    setCookieHeaders.length ? setCookieHeaders : "(none — setAll was not called)"
  )

  return response
}
