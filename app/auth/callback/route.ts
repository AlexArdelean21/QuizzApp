import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options"
import { consumeInviteToken } from "@/lib/auth/invite-token"

export async function GET(request: NextRequest) {
  const requestUrl = new URL(request.url)
  const code = requestUrl.searchParams.get("code")
  const next = requestUrl.searchParams.get("next") ?? "/"
  const invite = requestUrl.searchParams.get("invite")

  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.redirect(new URL("/login?error=server-config", requestUrl.origin))
  }

  if (!code) {
    return NextResponse.redirect(new URL("/login?error=missing-code", requestUrl.origin))
  }

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
    return NextResponse.redirect(
      new URL("/login?error=auth-code-error", requestUrl.origin)
    )
  }

  if (invite && typeof invite === "string") {
    const {
      data: { user },
    } = await supabase.auth.getUser()
    console.log("[auth/callback] invite flow started", {
      hasUser: Boolean(user?.id),
      tokenLength: invite.length,
    })
    if (user?.id) {
      const result = await consumeInviteToken(invite, user.id)
      if (!result.ok) {
        console.error("[auth/callback] consumeInviteToken failed", { reason: result.reason })
      } else {
        console.log("[auth/callback] consumeInviteToken success", {
          org_id: result.org_id,
          already_in_org: result.already_in_org,
        })
      }
    } else {
      console.error("[auth/callback] no user after exchangeCodeForSession")
    }
    // Carry over the session cookies that exchangeCodeForSession set on
    // `response` so the user stays authenticated after the redirect.
    const inviteResponse = NextResponse.redirect(new URL("/", requestUrl.origin))
    response.cookies.getAll().forEach((cookie) => {
      inviteResponse.cookies.set(cookie)
    })
    return inviteResponse
  }

  return response
}
