"use client"

import { useEffect, useMemo, useState, useTransition } from "react"
import { Loader2, Pencil, Save, Trash2, X } from "lucide-react"
import {
  deleteSingleQuestion,
  getQuestionsForExam,
  updateSingleQuestion,
  type AdminQuestionRow,
} from "@/app/admin/actions"
import { Button } from "@/components/ui/button"

type QuestionEditorModalProps = {
  examId: number
  examName: string
  onClose: () => void
  onRefresh: () => void
}

type QuestionDraft = {
  intrebare_text: string
  varianta_a: string
  varianta_b: string
  varianta_c: string
  raspuns_corect: "a" | "b" | "c"
}

const normalizeText = (text: string) =>
  text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/ș/g, "s")
    .replace(/ț/g, "t")

function toDraft(question: AdminQuestionRow): QuestionDraft {
  return {
    intrebare_text: question.intrebare_text,
    varianta_a: question.varianta_a,
    varianta_b: question.varianta_b,
    varianta_c: question.varianta_c,
    raspuns_corect: question.raspuns_corect,
  }
}

export function QuestionEditorModal({
  examId,
  examName,
  onClose,
  onRefresh,
}: QuestionEditorModalProps) {
  const [questions, setQuestions] = useState<AdminQuestionRow[]>([])
  const [searchTerm, setSearchTerm] = useState("")
  const [error, setError] = useState<string | null>(null)
  const [editingId, setEditingId] = useState<number | null>(null)
  const [draft, setDraft] = useState<QuestionDraft | null>(null)
  const [loading, startLoadingTransition] = useTransition()
  const [saving, startSavingTransition] = useTransition()
  const [deletingId, setDeletingId] = useState<number | null>(null)

  useEffect(() => {
    startLoadingTransition(() => {
      void (async () => {
        try {
          setError(null)
          const data = await getQuestionsForExam(examId)
          setQuestions(data)
        } catch (fetchError) {
          setError(fetchError instanceof Error ? fetchError.message : "Nu s-au putut încărca întrebările.")
        }
      })()
    })
  }, [examId])

  const filteredQuestions = useMemo(() => {
    const needle = normalizeText(searchTerm.trim())
    if (!needle) return questions

    return questions.filter((question) => {
      const haystack = normalizeText(
        `${question.intrebare_text} ${question.varianta_a} ${question.varianta_b} ${question.varianta_c}`
      )
      return haystack.includes(needle)
    })
  }, [questions, searchTerm])

  const closeEditor = () => {
    if (saving || deletingId !== null) return
    onClose()
  }

  const openEditMode = (question: AdminQuestionRow) => {
    setEditingId(question.id)
    setDraft(toDraft(question))
  }

  const updateDraftField = <K extends keyof QuestionDraft>(key: K, value: QuestionDraft[K]) => {
    setDraft((current) => (current ? { ...current, [key]: value } : current))
  }

  const handleSave = (questionId: number) => {
    if (!draft) return
    startSavingTransition(() => {
      void (async () => {
        try {
          setError(null)
          await updateSingleQuestion(questionId, {
            intrebare_text: draft.intrebare_text,
            varianta_a: draft.varianta_a,
            varianta_b: draft.varianta_b,
            varianta_c: draft.varianta_c,
            raspuns_corect: draft.raspuns_corect,
          })

          setQuestions((current) =>
            current.map((question) =>
              question.id === questionId
                ? {
                    ...question,
                    ...draft,
                  }
                : question
            )
          )
          setEditingId(null)
          setDraft(null)
          onRefresh()
        } catch (saveError) {
          setError(saveError instanceof Error ? saveError.message : "Nu s-a putut salva întrebarea.")
        }
      })()
    })
  }

  const handleDelete = (questionId: number) => {
    const confirmed = window.confirm("Sigur vrei să ștergi această întrebare?")
    if (!confirmed) return

    setDeletingId(questionId)
    void (async () => {
      try {
        setError(null)
        await deleteSingleQuestion(questionId)
        setQuestions((current) => current.filter((question) => question.id !== questionId))
        if (editingId === questionId) {
          setEditingId(null)
          setDraft(null)
        }
        onRefresh()
      } catch (deleteError) {
        setError(deleteError instanceof Error ? deleteError.message : "Nu s-a putut șterge întrebarea.")
      } finally {
        setDeletingId(null)
      }
    })()
  }

  return (
    <div className="fixed inset-0 z-[98] flex items-center justify-center p-4">
      <button
        type="button"
        className="absolute inset-0 bg-black/60"
        aria-label="Închide editorul de întrebări"
        onClick={closeEditor}
      />

      <div className="relative z-10 flex h-[88vh] w-full max-w-6xl flex-col rounded-xl border border-border bg-card shadow-2xl">
        <div className="flex items-center justify-between border-b border-border px-5 py-4">
          <div>
            <h4 className="text-lg font-semibold text-foreground">Editor întrebări</h4>
            <p className="text-sm text-muted-foreground">
              Examen: <span className="font-medium text-foreground">{examName}</span>
            </p>
          </div>
          <Button type="button" size="icon" variant="ghost" onClick={closeEditor} disabled={saving}>
            <X className="size-4" />
          </Button>
        </div>

        <div className="border-b border-border px-5 py-3">
          <input
            type="text"
            value={searchTerm}
            onChange={(event) => setSearchTerm(event.target.value)}
            placeholder="Caută după textul întrebării..."
            className="w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground outline-none transition-colors focus:border-primary/70"
          />
        </div>

        {error ? (
          <div className="mx-5 mt-4 rounded-md border border-destructive/40 bg-destructive/10 px-3 py-2 text-sm text-destructive">
            {error}
          </div>
        ) : null}

        <div className="min-h-0 flex-1 overflow-auto p-5">
          {loading ? (
            <div className="flex h-32 items-center justify-center text-sm text-muted-foreground">
              <Loader2 className="mr-2 size-4 animate-spin" /> Se încarcă întrebările...
            </div>
          ) : filteredQuestions.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nu există întrebări pentru filtrul curent.</p>
          ) : (
            <div className="space-y-3">
              {filteredQuestions.map((question, index) => {
                const isEditing = editingId === question.id && draft != null
                const isDeleting = deletingId === question.id
                return (
                  <div
                    key={question.id}
                    className="rounded-lg border border-border bg-background/50 p-4 transition-colors hover:bg-background"
                  >
                    <div className="mb-3 flex items-center justify-between gap-2">
                      <p className="text-xs font-medium text-muted-foreground">
                        Întrebarea #{index + 1} (ID: {question.id})
                      </p>
                      <div className="flex items-center gap-2">
                        {!isEditing ? (
                          <Button
                            type="button"
                            size="sm"
                            variant="secondary"
                            onClick={() => openEditMode(question)}
                            disabled={saving || isDeleting}
                          >
                            <Pencil className="mr-1 size-3.5" />
                            Edit
                          </Button>
                        ) : (
                          <>
                            <Button
                              type="button"
                              size="sm"
                              onClick={() => handleSave(question.id)}
                              disabled={saving || isDeleting}
                            >
                              <Save className="mr-1 size-3.5" />
                              {saving ? "Salvare..." : "Save"}
                            </Button>
                            <Button
                              type="button"
                              size="sm"
                              variant="ghost"
                              onClick={() => {
                                setEditingId(null)
                                setDraft(null)
                              }}
                              disabled={saving || isDeleting}
                            >
                              <X className="mr-1 size-3.5" />
                              Anulează
                            </Button>
                          </>
                        )}
                        <Button
                          type="button"
                          size="sm"
                          variant="destructive"
                          onClick={() => handleDelete(question.id)}
                          disabled={saving || isDeleting}
                        >
                          <Trash2 className="mr-1 size-3.5" />
                          {isDeleting ? "Ștergere..." : "Delete"}
                        </Button>
                      </div>
                    </div>

                    <div className="grid gap-3 md:grid-cols-2">
                      <label className="block text-xs font-medium text-muted-foreground md:col-span-2">
                        Întrebare
                        {isEditing ? (
                          <textarea
                            value={draft.intrebare_text}
                            onChange={(event) => updateDraftField("intrebare_text", event.target.value)}
                            rows={2}
                            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                          />
                        ) : (
                          <p className="mt-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground">
                            {question.intrebare_text}
                          </p>
                        )}
                      </label>

                      {(["varianta_a", "varianta_b", "varianta_c"] as const).map((fieldKey, variantIndex) => (
                        <label key={fieldKey} className="block text-xs font-medium text-muted-foreground">
                          Varianta {String.fromCharCode(65 + variantIndex)}
                          {isEditing ? (
                            <input
                              value={draft[fieldKey]}
                              onChange={(event) => updateDraftField(fieldKey, event.target.value)}
                              className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm text-foreground"
                            />
                          ) : (
                            <p className="mt-1 rounded-md border border-border bg-card px-3 py-2 text-sm text-foreground">
                              {question[fieldKey]}
                            </p>
                          )}
                        </label>
                      ))}

                      <label className="block text-xs font-medium text-muted-foreground">
                        Răspuns corect
                        {isEditing ? (
                          <select
                            value={draft.raspuns_corect}
                            onChange={(event) =>
                              updateDraftField("raspuns_corect", event.target.value as "a" | "b" | "c")
                            }
                            className="mt-1 w-full rounded-md border border-border bg-background px-3 py-2 text-sm uppercase text-foreground"
                          >
                            <option value="a">A</option>
                            <option value="b">B</option>
                            <option value="c">C</option>
                          </select>
                        ) : (
                          <p className="mt-1 rounded-md border border-border bg-card px-3 py-2 text-sm font-medium uppercase text-foreground">
                            {question.raspuns_corect}
                          </p>
                        )}
                      </label>
                    </div>
                  </div>
                )
              })}
            </div>
          )}
        </div>
      </div>
    </div>
  )
}
