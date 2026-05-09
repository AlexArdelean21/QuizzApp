import { createBrowserClient } from "@supabase/ssr"
import type { SupabaseClient } from "@supabase/supabase-js"
import { SUPABASE_COOKIE_OPTIONS } from "@/lib/supabase/cookie-options"

let browserClient: SupabaseClient | null = null

export function getSupabaseBrowserClient(): SupabaseClient {
  if (browserClient) return browserClient

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY

  if (!url || !anonKey) {
    throw new Error(
      "Lipsesc NEXT_PUBLIC_SUPABASE_URL sau NEXT_PUBLIC_SUPABASE_ANON_KEY în .env.local."
    )
  }

  // Explicit cookieOptions keeps the browser client's cookie attributes
  // in sync with the server client, so both use the same secure/sameSite
  // settings regardless of environment.
  browserClient = createBrowserClient(url, anonKey, {
    cookieOptions: SUPABASE_COOKIE_OPTIONS,
  })
  return browserClient
}
