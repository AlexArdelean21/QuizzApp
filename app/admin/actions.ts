"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import { createSupabaseServerClient } from "@/lib/supabase/server"

function getAdminServiceClient() {
  const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY

  if (!supabaseUrl || !serviceRoleKey) {
    throw new Error("Lipsesc variabilele Supabase pentru acțiuni admin.")
  }

  return createClient(supabaseUrl, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  })
}

async function assertAdminActor() {
  const supabase = await createSupabaseServerClient()
  const {
    data: { user },
    error: userError,
  } = await supabase.auth.getUser()

  if (userError || !user) {
    throw new Error("Neautorizat.")
  }

  const { data: profile, error: profileError } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .maybeSingle()

  if (profileError || profile?.role !== "admin") {
    throw new Error("Acces interzis.")
  }
}

export async function deleteUser(userId: string) {
  await assertAdminActor()
  const adminSupabase = getAdminServiceClient()

  const { error: deleteAuthError } = await adminSupabase.auth.admin.deleteUser(userId)

  if (deleteAuthError) {
    // Fallback cleanup if foreign-key or trigger constraints block auth deletion.
    const { error: profileDeleteError } = await adminSupabase
      .from("profiles")
      .delete()
      .eq("id", userId)

    if (profileDeleteError) {
      throw new Error(deleteAuthError.message)
    }

    const { error: retryDeleteAuthError } = await adminSupabase.auth.admin.deleteUser(userId)
    if (retryDeleteAuthError) {
      throw new Error(retryDeleteAuthError.message)
    }
  }

  revalidatePath("/admin")
}

export async function grantExamAccess(
  userId: string,
  examId: number,
  days: number = 30
) {
  await assertAdminActor()
  const adminSupabase = getAdminServiceClient()

  const expireDate = new Date()
  expireDate.setDate(expireDate.getDate() + days)
  const isoDate = expireDate.toISOString()

  const { data: existing, error: existingError } = await adminSupabase
    .from("acces_examene")
    .select("user_id")
    .eq("user_id", userId)
    .eq("examen_id", examId)
    .maybeSingle()

  if (existingError) {
    throw new Error(existingError.message)
  }

  if (existing) {
    const { error: updateError } = await adminSupabase
      .from("acces_examene")
      .update({
        data_expirare: isoDate,
      })
      .eq("user_id", userId)
      .eq("examen_id", examId)

    if (updateError) {
      throw new Error(updateError.message)
    }
  } else {
    const { error: insertError } = await adminSupabase.from("acces_examene").insert({
      user_id: userId,
      examen_id: examId,
      data_expirare: isoDate,
    })

    if (insertError) {
      throw new Error(insertError.message)
    }
  }

  revalidatePath("/admin")
}
