"use server"

import { revalidatePath } from "next/cache"
import { createClient } from "@supabase/supabase-js"
import ExcelJS from "exceljs"
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

type ParsedExamQuestion = {
  intrebare_text: string
  varianta_a: string
  varianta_b: string
  varianta_c: string
  raspuns_corect: "a" | "b" | "c"
}

type ParseExamResult = {
  questions: ParsedExamQuestion[]
  skippedRows: number
}

function cellValueToText(value: unknown) {
  if (value == null) return ""
  if (typeof value === "string") return value
  if (typeof value === "number" || typeof value === "boolean") return String(value)
  if (value instanceof Date) return value.toISOString()

  if (typeof value === "object") {
    const asRecord = value as Record<string, unknown>
    if (Array.isArray(asRecord.richText)) {
      return asRecord.richText
        .map((part) => {
          if (part && typeof part === "object" && "text" in (part as Record<string, unknown>)) {
            return String((part as Record<string, unknown>).text ?? "")
          }
          return ""
        })
        .join("")
    }
    if (asRecord.text != null) return String(asRecord.text)
    if (asRecord.result != null) return String(asRecord.result)
    if (asRecord.hyperlink != null && asRecord.text != null) return String(asRecord.text)
  }

  return String(value)
}

function normalizeText(value: unknown) {
  return cellValueToText(value).replace(/\s+/g, " ").trim()
}

function hasFill(cell: ExcelJS.Cell) {
  const fill = cell.fill
  if (!fill) return false
  if (fill.type === "pattern") return Boolean(fill.pattern && fill.pattern !== "none")
  if (fill.type === "gradient") return true
  return false
}

function detectCorrectAnswer(row: ExcelJS.Row): "a" | "b" | "c" | null {
  if (hasFill(row.getCell(2))) return "a"
  if (hasFill(row.getCell(3))) return "b"
  if (hasFill(row.getCell(4))) return "c"
  return null
}

async function parseExamWorkbook(buffer: Buffer): Promise<ParseExamResult> {
  const workbook = new ExcelJS.Workbook()
  await workbook.xlsx.load(buffer)

  const questions: ParsedExamQuestion[] = []
  let skippedRows = 0

  for (const sheet of workbook.worksheets) {
    sheet.eachRow({ includeEmpty: false }, (row) => {
      const intrebare_text = normalizeText(row.getCell(1).value)
      const varianta_a = normalizeText(row.getCell(2).value)
      const varianta_b = normalizeText(row.getCell(3).value)
      const varianta_c = normalizeText(row.getCell(4).value)

      // Ignore fully empty or spacer rows.
      if (!intrebare_text && !varianta_a && !varianta_b && !varianta_c) {
        return
      }

      const raspuns_corect = detectCorrectAnswer(row)
      if (!intrebare_text || !varianta_a || !varianta_b || !varianta_c || !raspuns_corect) {
        skippedRows += 1
        return
      }

      questions.push({
        intrebare_text,
        varianta_a,
        varianta_b,
        varianta_c,
        raspuns_corect,
      })
    })
  }

  return { questions, skippedRows }
}

function getFileFromFormData(formData: FormData) {
  const rawFile = formData.get("file")
  if (!(rawFile instanceof File)) {
    throw new Error("Fișierul Excel lipsește.")
  }
  if (!rawFile.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Fișier invalid. Se acceptă doar .xlsx.")
  }
  return rawFile
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

export async function previewExamImport(formData: FormData) {
  await assertAdminActor()
  const file = getFileFromFormData(formData)
  const buffer = Buffer.from(await file.arrayBuffer())
  const parsed = await parseExamWorkbook(buffer)

  return {
    questionCount: parsed.questions.length,
    skippedRows: parsed.skippedRows,
  }
}

export async function importExamFromExcel(formData: FormData) {
  await assertAdminActor()
  const adminSupabase = getAdminServiceClient()

  const examName = String(formData.get("examName") ?? "").trim()
  if (!examName) {
    throw new Error("Numele examenului este obligatoriu.")
  }

  const file = getFileFromFormData(formData)
  const buffer = Buffer.from(await file.arrayBuffer())
  const parsed = await parseExamWorkbook(buffer)

  if (parsed.questions.length === 0) {
    throw new Error("Nu am detectat întrebări valide în fișierul selectat.")
  }

  const { data: createdExam, error: createExamError } = await adminSupabase
    .from("examene")
    .insert({ nume_examen: examName })
    .select("id")
    .single()

  if (createExamError || !createdExam) {
    throw new Error(createExamError?.message ?? "Nu s-a putut crea examenul.")
  }

  const examenId = Number(createdExam.id)
  const rowsToInsert = parsed.questions.map((row) => ({
    examen_id: examenId,
    ...row,
  }))

  const { error: insertError } = await adminSupabase.from("intrebari").insert(rowsToInsert)
  if (insertError) {
    await adminSupabase.from("examene").delete().eq("id", examenId)
    throw new Error(insertError.message)
  }

  revalidatePath("/admin")

  return {
    examenId,
    insertedCount: rowsToInsert.length,
    skippedRows: parsed.skippedRows,
  }
}
