import { NextResponse, type NextRequest } from "next/server"
import { createClient, type SupabaseClient } from "@supabase/supabase-js"
import { Resend } from "resend"

export const runtime = "nodejs"
export const dynamic = "force-dynamic"

type SupabaseWebhookPayload = {
  type?: "INSERT" | "UPDATE" | "DELETE"
  table?: string
  schema?: string
  record?: Record<string, unknown> | null
  old_record?: Record<string, unknown> | null
}

function escapeHtml(value: string): string {
  return value
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#39;")
}

function getString(record: Record<string, unknown>, key: string): string | null {
  const value = record[key]
  return typeof value === "string" && value.trim().length > 0 ? value : null
}

function isNullish(value: unknown): boolean {
  return value === null || value === undefined || value === ""
}

function isValidUuid(value: unknown): value is string {
  return (
    typeof value === "string" &&
    /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i.test(value)
  )
}

type AdminClient = SupabaseClient

function layoutEmail(innerHtml: string): string {
  return `
    <div style="background:#f3f4f6;padding:24px 0;font-family:-apple-system,BlinkMacSystemFont,'Segoe UI',Roboto,sans-serif;">
      <div style="max-width:560px;margin:0 auto;background:#ffffff;border-radius:12px;overflow:hidden;border:1px solid #e5e7eb;">
        <div style="background:#111827;padding:20px 32px;">
          <span style="color:#ffffff;font-size:20px;font-weight:700;letter-spacing:0.5px;">QuizHub</span>
        </div>
        <div style="padding:32px;color:#1f2937;">
          ${innerHtml}
        </div>
        <div style="padding:16px 32px;border-top:1px solid #e5e7eb;">
          <p style="margin:0;font-size:12px;color:#9ca3af;">QuizHub · quizhub.ro</p>
        </div>
      </div>
    </div>
  `
}

async function handleExamAccess(
  payload: SupabaseWebhookPayload,
  resend: Resend,
  adminClient: AdminClient,
  appUrl: string,
) {
  const record = payload.record
  if (!record || typeof record !== "object") {
    return NextResponse.json({ ok: true, skipped: "missing-record" }, { status: 200 })
  }

  const userId = record["user_id"]
  const examenIdRaw = record["examen_id"]

  console.log("[webhooks/notifications] acces_examene INSERT", {
    user_id: userId,
    examen_id: examenIdRaw,
  })

  if (!isValidUuid(userId)) {
    return NextResponse.json({ ok: true, skipped: "invalid-id" }, { status: 200 })
  }

  const examenId =
    typeof examenIdRaw === "number"
      ? examenIdRaw
      : typeof examenIdRaw === "string"
        ? Number(examenIdRaw)
        : NaN
  if (!Number.isInteger(examenId) || examenId <= 0) {
    return NextResponse.json({ ok: true, skipped: "invalid-examen-id" }, { status: 200 })
  }

  const { data: profile, error: profileError } = await adminClient
    .from("profiles")
    .select("id, email, nume")
    .eq("id", userId)
    .maybeSingle()

  if (profileError || !profile) {
    console.error("[webhooks/notifications] DB error:", profileError)
    return NextResponse.json({ error: "Profile lookup failed" }, { status: 500 })
  }

  const { data: exam, error: examError } = await adminClient
    .from("examene")
    .select("id, nume_examen")
    .eq("id", examenId)
    .maybeSingle()

  if (examError || !exam) {
    console.error("[webhooks/notifications] DB error:", examError)
    return NextResponse.json({ error: "Exam lookup failed" }, { status: 500 })
  }

  const profileRecord = profile as Record<string, unknown>
  const examRecord = exam as Record<string, unknown>

  const userEmailRaw = getString(profileRecord, "email")
  if (!userEmailRaw) {
    console.error("[webhooks/notifications] DB error: profile has no email", { userId })
    return NextResponse.json({ error: "Profile has no email" }, { status: 500 })
  }

  const userNameRaw =
    getString(profileRecord, "nume") ?? getString(profileRecord, "email") ?? "Utilizator"
  const examNameRaw = getString(examRecord, "nume_examen") ?? "Examen"

  const userName = escapeHtml(userNameRaw)
  const userEmail = escapeHtml(userEmailRaw)
  const examName = escapeHtml(examNameRaw)

  let formattedDate = "nedefinită"
  try {
    const expirare = record["data_expirare"]
    if (!isNullish(expirare)) {
      const parsed = new Date(expirare as string)
      if (!Number.isNaN(parsed.getTime())) {
        formattedDate = parsed.toLocaleDateString("ro-RO", {
          day: "2-digit",
          month: "long",
          year: "numeric",
        })
      }
    }
  } catch {
    formattedDate = "nedefinită"
  }
  const safeFormattedDate = escapeHtml(formattedDate)

  const ctaUrl = `${appUrl}/`

  const html = layoutEmail(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px;">Salut, ${userName}!</h2>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.5;">
        Administratorul organizației tale ți-a acordat acces la un nou examen.
      </p>
      <table style="border-collapse:collapse;width:100%;margin:0 0 24px;font-size:14px;">
        <tbody>
          <tr>
            <td style="padding:10px 12px;background:#f3f4f6;font-weight:600;width:180px;">Examen</td>
            <td style="padding:10px 12px;background:#f9fafb;">${examName}</td>
          </tr>
          <tr>
            <td style="padding:10px 12px;background:#f3f4f6;font-weight:600;">Acces valabil până la</td>
            <td style="padding:10px 12px;background:#f9fafb;">${safeFormattedDate}</td>
          </tr>
        </tbody>
      </table>
      <a href="${ctaUrl}"
         style="display:inline-block;margin:0 0 8px;padding:12px 24px;
                background:#111827;color:#ffffff;text-decoration:none;
                border-radius:8px;font-size:14px;font-weight:600;">
        Accesează examenul →
      </a>
      <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">
        Dacă nu te așteptai la acest email, îl poți ignora în siguranță.
      </p>
  `)

  try {
    const { error } = await resend.emails.send({
      from: "QuizHub <noreply@quizhub.ro>",
      to: userEmailRaw,
      subject: "✅ Ai primit acces la un examen nou pe QuizHub",
      html,
    })

    if (error) {
      console.error("[webhooks/notifications] Resend error:", error)
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }
  } catch (err) {
    console.error("[webhooks/notifications] Resend error:", err)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }

  console.log("[webhooks/notifications] email sent", {
    to: userEmailRaw,
    type: "exam-access",
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}

async function handleRolePromotion(
  payload: SupabaseWebhookPayload,
  resend: Resend,
  adminClient: AdminClient,
  appUrl: string,
) {
  const record = payload.record
  const oldRecord = payload.old_record

  if (!record || typeof record !== "object") {
    return NextResponse.json({ ok: true, skipped: "missing-record" }, { status: 200 })
  }
  if (!oldRecord || typeof oldRecord !== "object") {
    return NextResponse.json({ ok: true, skipped: "missing-old-record" }, { status: 200 })
  }

  const isPromotion =
    getString(record, "role") === "org_admin" &&
    getString(oldRecord, "role") !== "org_admin"

  if (!isPromotion) {
    return NextResponse.json({ ok: true, skipped: "not-a-promotion" }, { status: 200 })
  }

  const userId = record["id"]

  console.log("[webhooks/notifications] profiles UPDATE role promotion", {
    user_id: userId,
  })

  if (!isValidUuid(userId)) {
    return NextResponse.json({ ok: true, skipped: "invalid-id" }, { status: 200 })
  }

  let userEmailRaw = getString(record, "email")
  if (!userEmailRaw) {
    const { data: profile, error: profileError } = await adminClient
      .from("profiles")
      .select("id, email, nume")
      .eq("id", userId)
      .maybeSingle()

    if (profileError) {
      console.error("[webhooks/notifications] DB error:", profileError)
      return NextResponse.json({ error: "Profile lookup failed" }, { status: 500 })
    }

    if (profile) {
      userEmailRaw = getString(profile as Record<string, unknown>, "email")
    }
  }

  if (!userEmailRaw) {
    console.warn("[webhooks/notifications] role promotion skipped: no email", { userId })
    return NextResponse.json({ ok: true, skipped: "no-email" }, { status: 200 })
  }

  const userNameRaw =
    getString(record, "nume") ?? getString(record, "email") ?? "Utilizator"

  let orgNameRaw = "organizația ta"
  const orgId = record["org_id"]
  if (isValidUuid(orgId)) {
    const { data: org, error: orgError } = await adminClient
      .from("organizatii")
      .select("id, nume")
      .eq("id", orgId)
      .maybeSingle()

    if (orgError) {
      console.error("[webhooks/notifications] DB error:", orgError)
      return NextResponse.json({ error: "Org lookup failed" }, { status: 500 })
    }

    if (org) {
      orgNameRaw = getString(org as Record<string, unknown>, "nume") ?? "organizația ta"
    }
  }

  const userName = escapeHtml(userNameRaw)
  const userEmail = escapeHtml(userEmailRaw)
  const orgName = escapeHtml(orgNameRaw)

  const ctaUrl = `${appUrl}/admin`

  const html = layoutEmail(`
      <h2 style="margin:0 0 16px;color:#111827;font-size:20px;">Salut, ${userName}!</h2>
      <p style="margin:0 0 20px;font-size:16px;line-height:1.5;">
        Felicitări! Ai fost promovat(ă) ca administrator al organizației ${orgName} pe QuizHub.
      </p>
      <div style="background:#f3f4f6;border-radius:8px;padding:16px 20px;margin:0 0 24px;">
        <p style="margin:0;font-size:14px;line-height:1.5;color:#374151;">
          Ca administrator, poți gestiona utilizatorii și examenele din organizația ta.
        </p>
      </div>
      <a href="${ctaUrl}"
         style="display:inline-block;margin:0 0 8px;padding:12px 24px;
                background:#111827;color:#ffffff;text-decoration:none;
                border-radius:8px;font-size:14px;font-weight:600;">
        Accesează panoul de administrare →
      </a>
      <p style="margin:24px 0 0;font-size:13px;color:#6b7280;line-height:1.5;">
        Dacă crezi că acest email a fost trimis din greșeală, contactează administratorul platformei.
      </p>
  `)

  try {
    const { error } = await resend.emails.send({
      from: "QuizHub <noreply@quizhub.ro>",
      to: userEmailRaw,
      subject: "🎉 Ești acum administrator pe QuizHub",
      html,
    })

    if (error) {
      console.error("[webhooks/notifications] Resend error:", error)
      return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
    }
  } catch (err) {
    console.error("[webhooks/notifications] Resend error:", err)
    return NextResponse.json({ error: "Failed to send email" }, { status: 500 })
  }

  console.log("[webhooks/notifications] email sent", {
    to: userEmailRaw,
    type: "role-promotion",
  })

  return NextResponse.json({ ok: true }, { status: 200 })
}

export async function POST(request: NextRequest) {
  try {
    const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET
    const resendApiKey = process.env.RESEND_API_KEY
    const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY
    const supabaseUrl = process.env.NEXT_PUBLIC_SUPABASE_URL

    if (!webhookSecret || !resendApiKey || !serviceRoleKey || !supabaseUrl) {
      return NextResponse.json(
        { error: "Server misconfiguration" },
        { status: 500 },
      )
    }

    const incomingSecret = request.headers.get("x-webhook-secret")
    if (incomingSecret !== webhookSecret) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 })
    }

    let payload: SupabaseWebhookPayload
    try {
      payload = (await request.json()) as SupabaseWebhookPayload
    } catch {
      return NextResponse.json({ error: "Invalid JSON body" }, { status: 400 })
    }

    const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://quizhub.ro"
    const resend = new Resend(resendApiKey)
    const adminClient = createClient(supabaseUrl, serviceRoleKey, {
      auth: {
        persistSession: false,
        autoRefreshToken: false,
      },
    })

    if (payload.table === "acces_examene" && payload.type === "INSERT") {
      return await handleExamAccess(payload, resend, adminClient, appUrl)
    }

    if (payload.table === "profiles" && payload.type === "UPDATE") {
      return await handleRolePromotion(payload, resend, adminClient, appUrl)
    }

    return NextResponse.json({ ok: true, skipped: "irrelevant-event" }, { status: 200 })
  } catch (err) {
    console.error("[webhooks/notifications] Unexpected error:", err)
    return NextResponse.json({ error: "Internal server error" }, { status: 500 })
  }
}
