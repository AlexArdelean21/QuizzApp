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

function getOptionalFileFromFormData(formData: FormData) {
  const rawFile = formData.get("file")
  if (rawFile == null || rawFile === "") return null
  if (!(rawFile instanceof File)) {
    throw new Error("Fișierul încărcat este invalid.")
  }
  if (!rawFile.name.toLowerCase().endsWith(".xlsx")) {
    throw new Error("Fișier invalid. Se acceptă doar .xlsx.")
  }
  return rawFile
}

function normalizeQuestionKey(text: string) {
  return normalizeText(text).toLowerCase()
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

  const existingExamenIdRaw = Number(formData.get("existingExamenId"))
  const hasExistingExamenId = Number.isFinite(existingExamenIdRaw) && existingExamenIdRaw > 0
  const examName = String(formData.get("examName") ?? "").trim()

  const file = getFileFromFormData(formData)
  const buffer = Buffer.from(await file.arrayBuffer())
  const parsed = await parseExamWorkbook(buffer)

  if (parsed.questions.length === 0) {
    throw new Error("Nu am detectat întrebări valide în fișierul selectat.")
  }

  let examenId: number
  let createdNewExam = false

  if (hasExistingExamenId) {
    examenId = existingExamenIdRaw
    const { data: existingExam, error: existingExamError } = await adminSupabase
      .from("examene")
      .select("id")
      .eq("id", examenId)
      .maybeSingle()

    if (existingExamError || !existingExam) {
      throw new Error(existingExamError?.message ?? "Examenul selectat nu există.")
    }
  } else {
    if (!examName) {
      throw new Error("Numele examenului este obligatoriu.")
    }

    const { data: createdExam, error: createExamError } = await adminSupabase
      .from("examene")
      .insert({ nume_examen: examName })
      .select("id")
      .single()

    if (createExamError || !createdExam) {
      throw new Error(createExamError?.message ?? "Nu s-a putut crea examenul.")
    }

    createdNewExam = true
    examenId = Number(createdExam.id)
  }

  const { data: existingQuestionRows, error: existingQuestionRowsError } = await adminSupabase
    .from("intrebari")
    .select("intrebare_text")
    .eq("examen_id", examenId)

  if (existingQuestionRowsError) {
    if (createdNewExam) {
      await adminSupabase.from("examene").delete().eq("id", examenId)
    }
    throw new Error(existingQuestionRowsError.message)
  }

  const knownQuestionKeys = new Set(
    (existingQuestionRows ?? [])
      .map((row) => normalizeQuestionKey(String(row.intrebare_text ?? "")))
      .filter(Boolean)
  )

  const rowsToInsert = []
  let duplicateCount = 0

  for (const row of parsed.questions) {
    const key = normalizeQuestionKey(row.intrebare_text)
    if (!key || knownQuestionKeys.has(key)) {
      duplicateCount += 1
      continue
    }
    knownQuestionKeys.add(key)
    rowsToInsert.push({
      examen_id: examenId,
      ...row,
    })
  }

  if (rowsToInsert.length > 0) {
    const { error: insertError } = await adminSupabase.from("intrebari").insert(rowsToInsert)
    if (insertError) {
      if (createdNewExam) {
        await adminSupabase.from("examene").delete().eq("id", examenId)
      }
      throw new Error(insertError.message)
    }
  }

  revalidatePath("/admin")

  return {
    examenId,
    insertedCount: rowsToInsert.length,
    skippedRows: parsed.skippedRows,
    duplicateCount,
    createdNewExam,
  }
}

export async function updateExam(formData: FormData) {
  await assertAdminActor()
  const adminSupabase = getAdminServiceClient()

  const examId = Number(formData.get("examId"))
  if (!Number.isFinite(examId) || examId <= 0) {
    throw new Error("ID-ul examenului este invalid.")
  }

  const { data: existingExam, error: existingExamError } = await adminSupabase
    .from("examene")
    .select("id, nume_examen")
    .eq("id", examId)
    .maybeSingle()

  if (existingExamError || !existingExam) {
    throw new Error(existingExamError?.message ?? "Examenul selectat nu există.")
  }

  const nextExamName = String(formData.get("examName") ?? "").trim()
  const file = getOptionalFileFromFormData(formData)

  if (!nextExamName && !file) {
    throw new Error("Nu există modificări de salvat.")
  }

  if (nextExamName && nextExamName !== String(existingExam.nume_examen ?? "").trim()) {
    const { error: updateNameError } = await adminSupabase
      .from("examene")
      .update({ nume_examen: nextExamName })
      .eq("id", examId)

    if (updateNameError) {
      throw new Error("Nu s-a putut actualiza numele examenului.")
    }
  }

  let insertedCount = 0
  let duplicateCount = 0
  let skippedRows = 0

  if (file) {
    const buffer = Buffer.from(await file.arrayBuffer())
    const parsed = await parseExamWorkbook(buffer)
    skippedRows = parsed.skippedRows

    const { data: existingQuestionRows, error: existingQuestionRowsError } = await adminSupabase
      .from("intrebari")
      .select("intrebare_text")
      .eq("examen_id", examId)

    if (existingQuestionRowsError) {
      throw new Error("Nu s-au putut încărca întrebările existente pentru verificarea duplicatelor.")
    }

    const knownQuestionKeys = new Set(
      (existingQuestionRows ?? [])
        .map((row) => normalizeQuestionKey(String(row.intrebare_text ?? "")))
        .filter(Boolean)
    )

    const rowsToInsert = []
    for (const row of parsed.questions) {
      const key = normalizeQuestionKey(row.intrebare_text)
      if (!key || knownQuestionKeys.has(key)) {
        duplicateCount += 1
        continue
      }
      knownQuestionKeys.add(key)
      rowsToInsert.push({
        examen_id: examId,
        ...row,
      })
    }

    if (rowsToInsert.length > 0) {
      const { error: insertError } = await adminSupabase.from("intrebari").insert(rowsToInsert)
      if (insertError) {
        throw new Error("Nu s-au putut salva întrebările noi din fișier.")
      }
      insertedCount = rowsToInsert.length
    }
  }

  revalidatePath("/admin")

  return {
    examId,
    updatedName: nextExamName || String(existingExam.nume_examen ?? ""),
    insertedCount,
    duplicateCount,
    skippedRows,
  }
}

export async function deleteExam(examId: number) {
  await assertAdminActor()
  const adminSupabase = getAdminServiceClient()

  if (!Number.isFinite(examId) || examId <= 0) {
    throw new Error("ID-ul examenului este invalid.")
  }

  const { data: exam, error: readExamError } = await adminSupabase
    .from("examene")
    .select("id")
    .eq("id", examId)
    .maybeSingle()

  if (readExamError) {
    throw new Error("Nu s-a putut verifica examenul selectat.")
  }
  if (!exam) {
    throw new Error("Examenul nu există sau a fost deja șters.")
  }

  // Fallback cleanup for schemas where CASCADE is not yet configured.
  for (const tableName of [
    "status_invatare",
    "bookmarks",
    "acces_examene",
    "intrebari_salvate",
    "progres_utilizator",
    "intrebari",
  ]) {
    const { error: cleanupError } = await adminSupabase
      .from(tableName)
      .delete()
      .eq("examen_id", examId)

    if (cleanupError) {
      if ((cleanupError as { code?: string }).code === "42P01") {
        continue
      }
      throw new Error(`Nu s-au putut șterge datele dependente (${tableName}).`)
    }
  }

  const { error } = await adminSupabase.from("examene").delete().eq("id", examId)
  if (error) {
    if ((error as { code?: string }).code === "23503") {
      throw new Error(
        "Examenul nu poate fi șters deoarece există date dependente. Verifică relațiile FK sau rulează migrarea de CASCADE."
      )
    }
    throw new Error("Ștergerea examenului a eșuat. Încearcă din nou.")
  }

  revalidatePath("/admin")
}
