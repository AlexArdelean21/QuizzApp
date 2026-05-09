import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options"

/**
 * Initiates the Supabase PKCE password-reset flow from the server.
 *
 * Running resetPasswordForEmail in a Route Handler (rather than directly from
 * the browser client) guarantees that the PKCE code verifier is delivered to
 * the browser via a proper HTTP Set-Cookie response header instead of a
 * document.cookie write. Set-Cookie headers survive email-client redirect
 * chains and strict browser privacy settings that can silently drop JS
 * cookie writes.
 */
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

  // Derive the origin from the request so redirectTo always exactly matches
  // the host the browser is on — prevents localhost vs 127.0.0.1 mismatches.
  const origin =
    request.headers.get("origin") ??
    (() => {
      const ref = request.headers.get("referer")
      if (ref) {
        try {
          return new URL(ref).origin
        } catch {
          // fall through
        }
      }
      return new URL(request.url).origin
    })()

  const redirectTo = `${origin}/auth/callback?next=/update-password`

  // The response is created once and mutated by response.cookies.set() inside
  // setAll. We intentionally do NOT recreate it on repeated setAll calls so
  // cookies accumulate correctly if applyServerStorage calls setAll more than once.
  const response = NextResponse.json({ success: true })

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          response.cookies.set(name, value, SUPABASE_COOKIE_OPTIONS)
        })
        // Forward no-cache headers to prevent CDN/proxy caching of a
        // response that carries auth cookies.
        if (headers) {
          Object.entries(headers).forEach(([key, val]) => {
            response.headers.set(key, val)
          })
        }
      },
    },
  })

  const { error } = await supabase.auth.resetPasswordForEmail(email, { redirectTo })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  return response
}
