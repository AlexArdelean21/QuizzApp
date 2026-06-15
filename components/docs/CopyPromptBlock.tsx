"use client"

import { useState } from "react"
import { Check, Copy } from "lucide-react"

type CopyPromptBlockProps = {
  prompt: string
}

export function CopyPromptBlock({ prompt }: CopyPromptBlockProps) {
  const [copied, setCopied] = useState(false)

  const handleCopy = async () => {
    try {
      await navigator.clipboard.writeText(prompt)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      // clipboard not available — no-op
    }
  }

  return (
    <div className="mt-4 rounded-xl border border-blue-200 bg-blue-50/60 p-4 dark:border-blue-900/40 dark:bg-blue-950/20">
      <div className="mb-2 flex items-center justify-between gap-3">
        <p className="text-sm font-semibold text-blue-900 dark:text-blue-200">
          Prompt pentru AI
        </p>
        <button
          type="button"
          onClick={handleCopy}
          className="inline-flex items-center gap-1.5 rounded-md bg-blue-600 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-blue-700"
        >
          {copied ? <Check className="size-3.5" /> : <Copy className="size-3.5" />}
          {copied ? "Copiat!" : "Copiază prompt"}
        </button>
      </div>
      <p className="mb-3 text-xs text-blue-800/80 dark:text-blue-300/80">
        Copiază promptul de mai jos, lipește-l într-un asistent AI (ChatGPT,
        Claude, Gemini) împreună cu documentul tău (PDF, Word, poză cu
        întrebări), iar AI-ul îți va genera conținutul în formatul corect pentru
        QuizHub. Apoi copiază rezultatul în câmpul de import.
      </p>
      <pre className="overflow-x-auto rounded-lg bg-white p-3 text-xs leading-relaxed text-slate-700 dark:bg-slate-900 dark:text-slate-300 no-scrollbar">
        {prompt}
      </pre>
    </div>
  )
}
