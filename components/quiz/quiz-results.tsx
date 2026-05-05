"use client"

import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"

type QuizResultsProps = {
  correctCount: number
  totalQuestions: number
  elapsedLabel: string
  finishedByTimeout: boolean
  onRestart: () => void
}

export function QuizResults({
  correctCount,
  totalQuestions,
  elapsedLabel,
  finishedByTimeout,
  onRestart,
}: QuizResultsProps) {
  return (
    <div className="min-h-screen bg-background">
      <main className="container mx-auto flex max-w-lg flex-col gap-8 px-4 py-16 md:py-24">
        <Card className="border-border bg-card shadow-sm quiz-question-animate">
          <CardHeader className="pb-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Rezultate
            </p>
            <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
              Ai terminat quiz-ul
            </h1>
          </CardHeader>
          <CardContent className="flex flex-col gap-6 pt-2">
            <div className="rounded-xl border border-border bg-secondary/40 px-5 py-4">
              <p className="text-sm text-muted-foreground">Scor final</p>
              <p className="mt-1 text-3xl font-bold tabular-nums text-foreground">
                {correctCount}
                <span className="text-lg font-medium text-muted-foreground">
                  {" "}
                  / {totalQuestions}
                </span>
              </p>
            </div>

            <div className="flex flex-col gap-1 text-sm">
              <p className="text-muted-foreground">Timp scurs</p>
              <p className="font-mono text-base font-medium text-foreground">
                {elapsedLabel}
              </p>
            </div>

            {finishedByTimeout && (
              <p className="rounded-lg bg-primary/10 px-3 py-2 text-sm text-primary">
                Timpul a expirat — răspunsurile tale au fost evaluate până în acest
                moment.
              </p>
            )}

            <Button
              type="button"
              onClick={onRestart}
              className="w-full rounded-xl bg-white px-8 py-6 text-base font-medium text-black shadow-sm hover:bg-white/90"
            >
              Restart
            </Button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
