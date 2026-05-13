"use client"

import { useMemo, useState, useTransition } from "react"
import { useRouter } from "next/navigation"
import { ChevronDown } from "lucide-react"
import {
  deleteExam,
  importExamFromExcel,
  previewExamImport,
  updateExam,
} from "@/app/admin/actions"
import { Button } from "@/components/ui/button"
import { QuestionEditorModal } from "@/components/admin/QuestionEditorModal"
import type { ExamOption } from "@/components/admin/UsersTable"

type ToastState = {
  type: "success" | "error"
  message: string
} | null

type ExamManagementProps = {
  examene: ExamOption[]
}

export function ExamManagement({ examene }: ExamManagementProps) {
  const router = useRouter()
  const [isExpanded, setIsExpanded] = useState(true)

  const [examName, setExamName] = useState("")
  const [file, setFile] = useState<File | null>(null)
  const [previewCount, setPreviewCount] = useState<number | null>(null)
  const [previewSkippedRows, setPreviewSkippedRows] = useState(0)
  const [toast, setToast] = useState<ToastState>(null)
  const [editTargetExam, setEditTargetExam] = useState<ExamOption | null>(null)
  const [editExamName, setEditExamName] = useState("")
  const [editFile, setEditFile] = useState<File | null>(null)
  const [deleteTargetExam, setDeleteTargetExam] = useState<ExamOption | null>(null)
  const [deleteConfirmationInput, setDeleteConfirmationInput] = useState("")
  const [questionEditorExam, setQuestionEditorExam] = useState<ExamOption | null>(null)

  const [previewing, startPreviewTransition] = useTransition()
  const [creating, startCreateTransition] = useTransition()
  const [savingUpdate, startSavingUpdateTransition] = useTransition()
  const [deleting, startDeleteTransition] = useTransition()

  const isBusy = previewing || creating || savingUpdate || deleting
  const canPreview = Boolean(file) && !isBusy
  const canCreate = Boolean(file) && examName.trim().length > 0 && previewCount !== null && !isBusy
  const canSaveUpdate =
    editTargetExam != null &&
    !isBusy &&
    (editExamName.trim().length > 0 || editFile != null)
  const canDeleteForever =
    deleteTargetExam != null &&
    deleteConfirmationInput.trim() === deleteTargetExam.nume_examen &&
    !deleting

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
    }, 4000)
  }

  const toFormData = (payload: { file: File; examName?: string; existingExamenId?: number }) => {
    const formData = new FormData()
    formData.set("file", payload.file)
    if (payload.examName) {
      formData.set("examName", payload.examName)
    }
    if (payload.existingExamenId) {
      formData.set("existingExamenId", String(payload.existingExamenId))
    }
    return formData
  }

  const handlePreview = () => {
    if (!file) return
    startPreviewTransition(() => {
      void (async () => {
        try {
          const result = await previewExamImport(toFormData({ file, examName }))
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

  const handleCreateExam = () => {
    if (!file || !examName.trim()) return
    startCreateTransition(() => {
      void (async () => {
        try {
          const result = await importExamFromExcel(toFormData({ file, examName: examName.trim() }))
          setExamName("")
          setFile(null)
          setPreviewCount(null)
          setPreviewSkippedRows(0)
          pushToast({
            type: "success",
            message: `Examen creat cu ${result.insertedCount} întrebări (${result.duplicateCount} duplicate ignorate).`,
          })
          router.refresh()
        } catch (error) {
          console.error("Create exam import failed:", error)
          pushToast({
            type: "error",
            message: error instanceof Error ? error.message : "Nu s-a putut crea examenul.",
          })
        }
      })()
    })
  }

  const handleOpenUpdateModal = (exam: ExamOption) => {
    if (isBusy) return
    setEditTargetExam(exam)
    setEditExamName(exam.nume_examen)
    setEditFile(null)
  }

  const handleSaveUpdate = () => {
    if (!editTargetExam) return
    startSavingUpdateTransition(() => {
      void (async () => {
        try {
          const formData = new FormData()
          formData.set("examId", String(editTargetExam.id))
          formData.set("examName", editExamName.trim())
          if (editFile) {
            formData.set("file", editFile)
          }
          const result = await updateExam(formData)
          pushToast({
            type: "success",
            message:
              `Examen actualizat. +${result.insertedCount} întrebări noi, ` +
              `${result.duplicateCount} duplicate ignorate.` +
              (result.skippedRows > 0 ? ` ${result.skippedRows} rânduri invalide ignorate.` : ""),
          })
          setEditTargetExam(null)
          setEditExamName("")
          setEditFile(null)
          router.refresh()
        } catch (error) {
          console.error("Update exam import failed:", error)
          pushToast({
            type: "error",
            message: error instanceof Error ? error.message : "Nu s-a putut actualiza examenul.",
          })
        }
      })()
    })
  }

  const handleDeleteExam = () => {
    if (!deleteTargetExam) return
    startDeleteTransition(() => {
      void (async () => {
        try {
          await deleteExam(deleteTargetExam.id)
          pushToast({
            type: "success",
            message: `Examenul "${deleteTargetExam.nume_examen}" a fost șters definitiv.`,
          })
          setDeleteTargetExam(null)
          setDeleteConfirmationInput("")
          router.refresh()
        } catch (error) {
          console.error("Delete exam failed:", error)
          pushToast({
            type: "error",
            message: error instanceof Error ? error.message : "Nu s-a putut șterge examenul.",
          })
        }
      })()
    })
  }

  return (
    <section className="rounded-xl border border-border bg-card p-5 shadow-sm">
      <button
        type="button"
        onClick={() => setIsExpanded((prev) => !prev)}
        className="flex w-full items-center justify-between rounded-md px-1 py-1 text-left transition-colors hover:bg-slate-100/70 dark:hover:bg-slate-900/70"
      >
        <div>
          <h2 className="text-xl font-semibold text-foreground">Exam Management</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Creează examene noi, actualizează întrebări și gestionează examenele existente.
          </p>
        </div>
        <ChevronDown
          className={`size-5 text-muted-foreground transition-transform duration-300 ${isExpanded ? "rotate-180" : ""}`}
        />
      </button>

      <div
        className={`grid transition-all duration-300 ${isExpanded ? "mt-4 grid-rows-[1fr] opacity-100" : "mt-0 grid-rows-[0fr] opacity-0"}`}
      >
        <div className="overflow-hidden">
          <div className="mt-1 rounded-lg border border-border bg-card/80 p-4">
            <h3 className="text-base font-semibold text-foreground">Creare examen nou</h3>
            <div className="mt-3 grid gap-3 md:grid-cols-2">
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
            <div className="mt-4 flex flex-wrap gap-2">
              <Button type="button" variant="secondary" onClick={handlePreview} disabled={!canPreview}>
                {previewing ? "Preview..." : "Preview"}
              </Button>
              <Button type="button" onClick={handleCreateExam} disabled={!canCreate}>
                {creating ? "Import în curs..." : "Importă examen nou"}
              </Button>
            </div>
            {previewCount !== null ? (
              <p className="mt-3 text-sm text-muted-foreground">
                Întrebări detectate: {previewCount}
                {previewSkippedRows > 0
                  ? ` (${previewSkippedRows} rânduri ignorate: incomplete sau fără răspuns evidențiat).`
                  : ""}
              </p>
            ) : null}
          </div>

          <div className="mt-5 rounded-lg border border-border bg-card/80 p-4">
            <h3 className="text-base font-semibold text-foreground">Examene existente</h3>
            {examene.length === 0 ? (
              <p className="mt-3 text-sm text-muted-foreground">Nu există examene.</p>
            ) : (
              <div className="mt-3 space-y-2">
                {examene.map((exam) => (
                  <div
                    key={exam.id}
                    className="flex flex-wrap items-center justify-between gap-2 rounded-md border border-slate-800 bg-slate-900/70 px-3 py-2"
                  >
                    <span className="text-sm text-slate-100">
                      {exam.nume_examen}{" "}
                      <span className="text-slate-500">- ({exam.question_count ?? 0} întrebări)</span>
                    </span>
                    <div className="flex items-center gap-2">
                      <Button
                        type="button"
                        size="sm"
                        variant="outline"
                        onClick={() => setQuestionEditorExam(exam)}
                        disabled={isBusy}
                      >
                        Editează Întrebări
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="secondary"
                        onClick={() => handleOpenUpdateModal(exam)}
                        disabled={isBusy}
                      >
                        Update
                      </Button>
                      <Button
                        type="button"
                        size="sm"
                        variant="destructive"
                        onClick={() => {
                          setDeleteTargetExam(exam)
                          setDeleteConfirmationInput("")
                        }}
                        disabled={isBusy}
                      >
                        Șterge
                      </Button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
          {toast ? (
            <div className={`mt-4 rounded-md border px-3 py-2 text-sm ${toastClasses}`}>
              {toast.message}
            </div>
          ) : null}
        </div>
      </div>

      {deleteTargetExam ? (
        <div className="fixed inset-0 z-[90] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            onClick={() => {
              if (!deleting) {
                setDeleteTargetExam(null)
                setDeleteConfirmationInput("")
              }
            }}
            aria-label="Închide confirmarea"
          />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-rose-500/40 bg-slate-950 p-5 shadow-2xl">
            <h4 className="text-lg font-semibold text-rose-300">Confirmă ștergerea examenului</h4>
            <p className="mt-2 text-sm text-slate-200">
              Această acțiune va șterge definitiv examenul, toate întrebările asociate și progresul
              utilizatorilor legat de acesta.
            </p>
            <p className="mt-3 text-sm text-slate-300">
              Pentru confirmare, tastați exact numele examenului:{" "}
              <span className="font-semibold text-white">{deleteTargetExam.nume_examen}</span>
            </p>
            <input
              value={deleteConfirmationInput}
              onChange={(event) => setDeleteConfirmationInput(event.target.value)}
              placeholder="Numele examenului"
              className="mt-3 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              disabled={deleting}
            />
            <div className="mt-4 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setDeleteTargetExam(null)
                  setDeleteConfirmationInput("")
                }}
                disabled={deleting}
              >
                Anulează
              </Button>
              <Button
                type="button"
                variant="destructive"
                onClick={handleDeleteExam}
                disabled={!canDeleteForever}
              >
                {deleting ? "Se șterge..." : "Șterge definitiv"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {editTargetExam ? (
        <div className="fixed inset-0 z-[95] flex items-center justify-center p-4">
          <button
            type="button"
            className="absolute inset-0 bg-black/60"
            aria-label="Închide editarea"
            onClick={() => {
              if (!savingUpdate) {
                setEditTargetExam(null)
                setEditExamName("")
                setEditFile(null)
              }
            }}
          />
          <div className="relative z-10 w-full max-w-lg rounded-xl border border-border bg-slate-950 p-5 shadow-2xl">
            <h4 className="text-lg font-semibold text-white">Update examen</h4>
            <p className="mt-2 text-sm text-slate-300">
              Poți modifica numele examenului și/sau încărca un Excel pentru întrebări noi.
            </p>

            <label className="mt-4 block text-sm font-medium text-slate-200">Nume examen</label>
            <input
              value={editExamName}
              onChange={(event) => setEditExamName(event.target.value)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100"
              disabled={savingUpdate}
            />

            <label className="mt-4 block text-sm font-medium text-slate-200">
              Fișier Excel (.xlsx) - opțional
            </label>
            <input
              type="file"
              accept=".xlsx"
              onChange={(event) => setEditFile(event.target.files?.[0] ?? null)}
              className="mt-1 w-full rounded-md border border-slate-700 bg-slate-900 px-3 py-2 text-sm text-slate-100 file:mr-3 file:rounded-md file:border-0 file:bg-slate-700 file:px-3 file:py-1.5 file:text-xs file:text-slate-100"
              disabled={savingUpdate}
            />

            <div className="mt-5 flex justify-end gap-2">
              <Button
                type="button"
                variant="secondary"
                onClick={() => {
                  setEditTargetExam(null)
                  setEditExamName("")
                  setEditFile(null)
                }}
                disabled={savingUpdate}
              >
                Anulează
              </Button>
              <Button type="button" onClick={handleSaveUpdate} disabled={!canSaveUpdate}>
                {savingUpdate ? "Se salvează..." : "Salvează modificările"}
              </Button>
            </div>
          </div>
        </div>
      ) : null}

      {questionEditorExam ? (
        <QuestionEditorModal
          examId={questionEditorExam.id}
          examName={questionEditorExam.nume_examen}
          onClose={() => setQuestionEditorExam(null)}
          onRefresh={() => router.refresh()}
        />
      ) : null}
    </section>
  )
}
