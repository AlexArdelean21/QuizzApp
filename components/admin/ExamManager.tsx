"use client"

import { useMemo, useState, useTransition } from "react"
import { previewExamImport, importExamFromExcel } from "@/app/admin/actions"
import { Button } from "@/components/ui/button"

type ToastState = {
  type: "success" | "error"
  message: string
} | null

export function ExamManager() {
  const [examName, setExamName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewSkippedRows, setPreviewSkippedRows] = useState(0)
  const [importing, startImportTransition] = useTransition()
  const [previewing, startPreviewTransition] = useTransition()
  const [toast, setToast] = useState<ToastState>(null)

  const isBusy = importing || previewing
  const canPreview = Boolean(file) && !isBusy
  const canImport = Boolean(file) && examName.trim().length > 0 && previewCount !== null && !isBusy

  const toastClasses = useMemo(() => {
    if (!toast) return ""
    return toast.type === "success"
      ? "border-emerald-500/30 bg-emerald-500/15 text-emerald-200"
      : "border-rose-500/40 bg-rose-500/15 text-rose-200"
  }, [toast])

  const pushToast = (nextToast: Exclude<ToastState, null>) => {
    setToast(nextToast)
    window.setTimeout(() => {
      setToast((current) => (current?.message === nextToast.message ? null : current))
    }, 3500)
  }

  const toFormData = () => {
    if (!file) {
      throw new Error("Selectează un fișier .xlsx.")
    }
    const formData = new FormData()
    formData.set("file", file)
    formData.set("examName", examName.trim())
    return formData
  }

  const handlePreview = () => {
    startPreviewTransition(() => {
      void (async () => {
        try {
          const result = await previewExamImport(toFormData())
          setPreviewCount(result.questionCount)
          setPreviewSkippedRows(result.skippedRows)
          pushToast({
            type: "success",
            message: `Preview gata: ${result.questionCount} întrebări detectate.`,
          })
        } catch (error) {
          console.error("Preview exam failed:", error)
          setPreviewCount(null)
          setPreviewSkippedRows(0)
          pushToast({
            type: "error",
            message: error instanceof Error ? error.message : "Nu s-a putut genera preview-ul.",
          })
        }
      })()
    })
  }

  const handleImport = () => {
    startImportTransition(() => {
      void (async () => {
        try {
          const result = await importExamFromExcel(toFormData())
          setExamName("")
          setFile(null)
          setPreviewCount(null)
          setPreviewSkippedRows(0)
          pushToast({
            type: "success",
            message: `Examen creat (ID ${result.examenId}) cu ${result.insertedCount} întrebări.`,
          })
        } catch (error) {
          console.error("Import exam failed:", error)
          pushToast({
            type: "error",
            message: error instanceof Error ? error.message : "Importul a eșuat.",
          })
        }
      })()
    })
  }

  return (
    <section className="mt-6 rounded-lg border border-border bg-card/80 p-4 shadow-sm">
      <div className="flex flex-col gap-2">
        <h2 className="text-lg font-semibold text-foreground">Crează Examen</h2>
        <p className="text-sm text-muted-foreground">
          Importă un fișier Excel (.xlsx). Răspunsul corect este detectat din celula evidențiată.
        </p>
      </div>

      <div className="mt-4 grid gap-3 md:grid-cols-2">
        <input
          value={examName}
          onChange={(event) => setExamName(event.target.value)}
          placeholder="Nume examen"
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 placeholder:text-slate-400"
          disabled={isBusy}
        />
        <input
          key={file?.name ?? "empty"}
          type="file"
          accept=".xlsx"
          onChange={(event) => {
            const nextFile = event.target.files?.[0] ?? null
            setFile(nextFile)
            setPreviewCount(null)
            setPreviewSkippedRows(0)
          }}
          className="rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-xs file:text-slate-100"
          disabled={isBusy}
        />
      </div>

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <Button type="button" onClick={handlePreview} disabled={!canPreview} variant="secondary">
          {previewing ? (
            <span className="inline-flex items-center gap-2">
              <span className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
              Preview...
            </span>
          ) : (
            "Preview"
          )}
        </Button>
        <Button type="button" onClick={handleImport} disabled={!canImport}>
          {importing ? (
            <span className="inline-flex items-center gap-2">
              <span className="size-3 animate-spin rounded-full border border-current border-t-transparent" />
              Import în curs...
            </span>
          ) : (
            "Importă examenul"
          )}
        </Button>
      </div>

      {previewCount !== null && (
        <div className="mt-3 rounded-md border border-slate-700 bg-slate-900/70 px-3 py-2 text-sm text-slate-200">
          Întrebări detectate: <strong>{previewCount}</strong>
          {previewSkippedRows > 0 ? (
            <span className="ml-2 text-xs text-amber-300">
              ({previewSkippedRows} rânduri ignorate: incomplete sau fără răspuns evidențiat)
            </span>
          ) : null}
        </div>
      )}

      {toast ? (
        <div className={`mt-3 rounded-md border px-3 py-2 text-sm ${toastClasses}`}>{toast.message}</div>
      ) : null}
    </section>
  )
}
