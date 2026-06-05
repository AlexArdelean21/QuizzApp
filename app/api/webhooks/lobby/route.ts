import { NextResponse, type NextRequest } from "next/server"
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

export async function POST(request: NextRequest) {
  const webhookSecret = process.env.SUPABASE_WEBHOOK_SECRET
  const resendApiKey = process.env.RESEND_API_KEY
  const adminEmail = process.env.ADMIN_EMAIL

  if (!webhookSecret || !resendApiKey || !adminEmail) {
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

  if (payload.type !== "INSERT") {
    // Not a new user — ignore silently
    return NextResponse.json({ ok: true, skipped: "not-insert" }, { status: 200 })
  }

  const record = payload?.record
  if (!record || typeof record !== "object") {
    return NextResponse.json(
      { error: "Missing record in payload" },
      { status: 400 },
    )
  }

  // Only notify for lobby users (org_id IS NULL = unassigned)
  if (!isNullish(record["org_id"])) {
    return NextResponse.json({ ok: true, skipped: "already-assigned" }, { status: 200 })
  }

  const email =
    getString(record, "email") ?? getString(record, "user_email") ?? "necunoscut"
  const name =
    getString(record, "nume") ??
    getString(record, "email") ?? // fallback: use email as display name
    "Utilizator nou"
  const role =
    getString(record, "role") ??
    getString(record, "status") ??
    "pending"

  const safeName = escapeHtml(name)
  const safeEmail = escapeHtml(email)
  const safeRole = escapeHtml(role)

  const appUrl = process.env.NEXT_PUBLIC_APP_URL ?? "https://quizhub.ro"
  const lobbyUrl = `${appUrl}/admin`

  const html = `
    <div style="font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif; max-width: 560px; margin: 0 auto; padding: 24px; color: #1f2937;">
      <h2 style="margin: 0 0 16px; color: #111827;">🚨 QuizHub: Utilizator nou în lobby</h2>
      <p style="margin: 0 0 16px; font-size: 16px; line-height: 1.5;">
        Un nou utilizator așteaptă aprobarea ta în platformă.
      </p>
      <table style="border-collapse: collapse; width: 100%; margin: 16px 0; font-size: 14px;">
        <tbody>
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; font-weight: 600; width: 120px;">Nume</td>
            <td style="padding: 8px 12px; background: #f9fafb;">${safeName}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; font-weight: 600;">Email</td>
            <td style="padding: 8px 12px; background: #f9fafb;">${safeEmail}</td>
          </tr>
          <tr>
            <td style="padding: 8px 12px; background: #f3f4f6; font-weight: 600;">Rol / Status</td>
            <td style="padding: 8px 12px; background: #f9fafb;">${safeRole}</td>
          </tr>
        </tbody>
      </table>
      <a href="${lobbyUrl}"
         style="display:inline-block;margin:20px 0 0;padding:12px 24px;
                background:#111827;color:#ffffff;text-decoration:none;
                border-radius:8px;font-size:14px;font-weight:600;">
        Accesează lobby →
      </a>
      <p style="margin: 24px 0 0; font-size: 13px; color: #6b7280;">
        Acest mesaj a fost trimis automat de QuizHub.
      </p>
    </div>
  `

  const resend = new Resend(resendApiKey)

  try {
    const { error } = await resend.emails.send({
      from: "QuizHub <noreply@quizhub.ro>",
      to: adminEmail,
      subject: "🚨 QuizHub: Utilizator nou în lobby",
      html,
    })

    if (error) {
      console.error("[webhooks/lobby] Resend error:", error)
      return NextResponse.json(
        { error: "Failed to send notification email" },
        { status: 500 },
      )
    }

    return NextResponse.json({ ok: true }, { status: 200 })
  } catch (err) {
    console.error("[webhooks/lobby] Unexpected error:", err)
    return NextResponse.json(
      { error: "Failed to send notification email" },
      { status: 500 },
    )
  }
}
