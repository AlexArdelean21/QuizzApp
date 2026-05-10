import { NextResponse, type NextRequest } from "next/server"
import { createServerClient } from "@supabase/ssr"
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options"

type LoginBody = {
  email?: string
  password?: string
  rememberMe?: boolean
}

export async function POST(request: NextRequest) {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    return NextResponse.json({ error: "Server misconfiguration" }, { status: 500 })
  }

  let body: LoginBody
  try {
    body = await request.json()
  } catch {
    return NextResponse.json({ error: "Invalid request body" }, { status: 400 })
  }

  const email = body.email?.trim()
  const password = body.password
  const rememberMe = Boolean(body.rememberMe)

  if (!email || !password) {
    return NextResponse.json({ error: "Email and password are required." }, { status: 400 })
  }

  const cookieOptions = rememberMe
    ? SUPABASE_COOKIE_OPTIONS
    : {
        path: SUPABASE_COOKIE_OPTIONS.path,
        sameSite: SUPABASE_COOKIE_OPTIONS.sameSite,
        secure: SUPABASE_COOKIE_OPTIONS.secure,
        httpOnly: SUPABASE_COOKIE_OPTIONS.httpOnly,
      }

  const pendingCookies: Array<{ name: string; value: string }> = []
  const forwardHeaders = new Headers()

  const supabase = createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
    cookies: {
      getAll() {
        return request.cookies.getAll()
      },
      setAll(cookiesToSet, headers) {
        cookiesToSet.forEach(({ name, value }) => {
          pendingCookies.push({ name, value })
        })
        if (headers) {
          Object.entries(headers).forEach(([key, value]) => {
            forwardHeaders.set(key, value)
          })
        }
      },
    },
  })

  const { data, error } = await supabase.auth.signInWithPassword({
    email,
    password,
  })

  if (error) {
    return NextResponse.json({ error: error.message }, { status: 400 })
  }

  const userId = data.user?.id
  if (!userId) {
    const response = NextResponse.json({ redirectTo: "/" })
    pendingCookies.forEach(({ name, value }) => {
      response.cookies.set(name, value, cookieOptions)
    })
    forwardHeaders.forEach((value, key) => response.headers.set(key, value))
    return response
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", userId)
    .maybeSingle()

  const response = NextResponse.json({
    redirectTo: profile?.role === "admin" ? "/admin" : "/",
  })
  pendingCookies.forEach(({ name, value }) => {
    response.cookies.set(name, value, cookieOptions)
  })
  forwardHeaders.forEach((value, key) => response.headers.set(key, value))
  return response
}
