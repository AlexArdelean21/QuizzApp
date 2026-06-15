import { cookies } from "next/headers"
import { createServerClient } from "@supabase/ssr"
import {
  getSupabaseCookieOptions,
  REMEMBER_COOKIE_NAME,
  SUPABASE_COOKIE_BASE,
} from "@/lib/supabase/cookie-options"

export async function createSupabaseServerClient() {
  const cookieStore = await cookies()
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const supabaseAnonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!supabaseUrl || !supabaseAnonKey) {
    throw new Error(
      "Lipsesc NEXT_PUBLIC_SUPABASE_URL sau NEXT_PUBLIC_SUPABASE_ANON_KEY în .env.local."
    )
  }

  const remember = cookieStore.get(REMEMBER_COOKIE_NAME)?.value === "1"
  const authCookieOptions = getSupabaseCookieOptions(remember)

  return createServerClient(supabaseUrl, supabaseAnonKey, {
    cookieOptions: SUPABASE_COOKIE_BASE,
    cookies: {
      getAll() {
        return cookieStore.getAll()
      },
      setAll(cookiesToSet) {
        try {
          cookiesToSet.forEach(({ name, value }) =>
            cookieStore.set(name, value, authCookieOptions)
          )
        } catch {
          // setAll is called from a Server Component where cookies().set()
          // throws by design. The middleware refreshes the session instead.
        }
      },
    },
  })
}
