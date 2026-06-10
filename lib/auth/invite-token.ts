import "server-only"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"

const UUID_REGEX = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
const TOKEN_REGEX = /^[0-9a-f]{64}$/i

export type ConsumeInviteResult =
  | { ok: true; org_id: string; already_in_org: boolean }
  | { ok: false; reason: string }

/**
 * Validates a single-use invite token and assigns the user's profile.org_id
 * to the token's organization. Called from /auth/callback after a successful
 * session exchange. Uses the service-role admin client because the new user
 * may not have a session-bound RLS context yet at this moment in the flow.
 *
 * Security:
 *   - Validates both token and userId formats before any DB query
 *   - Atomically marks token used (.is("used_at", null) on UPDATE) to prevent
 *     races where two clicks consume the same token
 *   - Refuses to overwrite an existing org_id; returns already_in_org instead
 *   - Returns structured failure reasons so the route can log them
 */
export async function consumeInviteToken(
  token: string,
  userId: string
): Promise<ConsumeInviteResult> {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    return { ok: false, reason: "missing-env" }
  }
  if (!TOKEN_REGEX.test(token)) {
    return { ok: false, reason: "invalid-token-format" }
  }
  if (!UUID_REGEX.test(userId)) {
    return { ok: false, reason: "invalid-user-id-format" }
  }

  const adminClient = createClient(supabaseUrl, serviceRoleKey, {
    auth: { persistSession: false, autoRefreshToken: false },
  })

  // Step 1: Fetch the token row
  const { data: tokenRow, error: fetchError } = await adminClient
    .from("invite_tokens")
    .select("id, org_id, used_at, expires_at")
    .eq("token", token)
    .maybeSingle()

  if (fetchError) {
    console.error("[consumeInviteToken] fetch error:", fetchError)
    return { ok: false, reason: "db-fetch-error" }
  }
  if (!tokenRow) {
    return { ok: false, reason: "token-not-found" }
  }
  if (tokenRow.used_at) {
    return { ok: false, reason: "token-already-used" }
  }
  if (new Date(tokenRow.expires_at) < new Date()) {
    return { ok: false, reason: "token-expired" }
  }

  const orgId = String(tokenRow.org_id)

  // Step 2: Check if user already has an org
  const { data: profile, error: profileFetchError } = await adminClient
    .from("profiles")
    .select("id, org_id")
    .eq("id", userId)
    .maybeSingle()

  if (profileFetchError) {
    console.error("[consumeInviteToken] profile fetch error:", profileFetchError)
    return { ok: false, reason: "profile-fetch-error" }
  }
  if (!profile) {
    // Profile not yet created by trigger. Wait briefly and retry once.
    await new Promise((resolve) => setTimeout(resolve, 800))
    const retry = await adminClient
      .from("profiles")
      .select("id, org_id")
      .eq("id", userId)
      .maybeSingle()
    if (retry.error || !retry.data) {
      console.error("[consumeInviteToken] profile still missing after retry")
      return { ok: false, reason: "profile-not-found" }
    }
    if (retry.data.org_id) {
      await markTokenUsed(adminClient, tokenRow.id, userId)
      return { ok: true, org_id: String(retry.data.org_id), already_in_org: true }
    }
  } else if (profile.org_id) {
    // Already in an org — mark token used (preserves audit) but don't change org
    await markTokenUsed(adminClient, tokenRow.id, userId)
    return { ok: true, org_id: String(profile.org_id), already_in_org: true }
  }

  // Step 3: Mark token used atomically (race protection)
  const { data: markedRow, error: markError } = await adminClient
    .from("invite_tokens")
    .update({ used_at: new Date().toISOString(), used_by: userId })
    .eq("id", tokenRow.id)
    .is("used_at", null)
    .select("id")
    .maybeSingle()

  if (markError) {
    console.error("[consumeInviteToken] mark used error:", markError)
    return { ok: false, reason: "mark-used-error" }
  }
  if (!markedRow) {
    // Someone else marked it used between our fetch and update
    return { ok: false, reason: "token-race-condition" }
  }

  // Step 4: Assign org_id on profile
  const { error: assignError } = await adminClient
    .from("profiles")
    .update({ org_id: orgId })
    .eq("id", userId)

  if (assignError) {
    console.error("[consumeInviteToken] assign org error:", assignError)
    // Roll back token usage so the link can be retried
    await adminClient
      .from("invite_tokens")
      .update({ used_at: null, used_by: null })
      .eq("id", tokenRow.id)
    return { ok: false, reason: "assign-org-error" }
  }

  console.log("[consumeInviteToken] success", { userId, orgId, tokenId: tokenRow.id })
  return { ok: true, org_id: orgId, already_in_org: false }
}

async function markTokenUsed(
  adminClient: SupabaseClient,
  tokenId: string,
  userId: string
): Promise<void> {
  await adminClient
    .from("invite_tokens")
    .update({ used_at: new Date().toISOString(), used_by: userId })
    .eq("id", tokenId)
    .is("used_at", null)
}
