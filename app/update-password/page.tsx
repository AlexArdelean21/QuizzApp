"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

export default function UpdatePasswordPage() {
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const router = useRouter()

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    setMessage(null)
    setErrorMessage(null)

    if (password !== confirmPassword) {
      setErrorMessage("Parolele nu coincid.")
      return
    }

    if (password.length < 6) {
      setErrorMessage("Parola trebuie să aibă cel puțin 6 caractere.")
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = getSupabaseBrowserClient()
      const { error } = await supabase.auth.updateUser({ password })

      if (error) {
        setErrorMessage(error.message)
        return
      }

      setMessage("Parola a fost actualizată cu succes! Te redirecționăm...")
      setTimeout(() => router.push("/login?reset=true"), 1500)
    } catch (err) {
      setErrorMessage(
        err instanceof Error ? err.message : "A apărut o eroare neașteptată."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <div className="min-h-screen bg-background">
      <main className="mx-auto flex w-full max-w-5xl flex-col gap-8 px-4 py-12 sm:px-6 md:py-16 lg:px-8 lg:py-20">
        <Card className="w-full max-w-md self-center border-2 border-border/90 bg-card shadow-xl shadow-primary/10 ring-1 ring-primary/15">
          <CardHeader className="pb-2">
            <p className="text-xs font-medium uppercase tracking-wider text-muted-foreground">
              Resetare parolă
            </p>
            <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
              Parolă nouă
            </h1>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-2">
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="password"
                  className="text-sm font-medium text-foreground"
                >
                  Parolă nouă
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-2 inline-flex items-center text-muted-foreground transition hover:text-foreground"
                    aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
                  >
                    {showPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              <div className="flex flex-col gap-1.5">
                <label
                  htmlFor="confirm-password"
                  className="text-sm font-medium text-foreground"
                >
                  Confirmă parola
                </label>
                <div className="relative">
                  <input
                    id="confirm-password"
                    type={showConfirmPassword ? "text" : "password"}
                    required
                    autoComplete="new-password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowConfirmPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-2 inline-flex items-center text-muted-foreground transition hover:text-foreground"
                    aria-label={
                      showConfirmPassword ? "Ascunde parola" : "Arată parola"
                    }
                  >
                    {showConfirmPassword ? (
                      <EyeOff className="size-4" />
                    ) : (
                      <Eye className="size-4" />
                    )}
                  </button>
                </div>
              </div>

              {errorMessage && (
                <p className="rounded-md bg-rose-500/10 px-3 py-2 text-sm text-rose-600 dark:text-rose-400">
                  {errorMessage}
                </p>
              )}
              {message && (
                <p className="rounded-md bg-emerald-500/10 px-3 py-2 text-sm text-emerald-600 dark:text-emerald-400">
                  {message}
                </p>
              )}

              <Button
                type="submit"
                disabled={isSubmitting}
                className="w-full rounded-xl bg-white py-5 text-base font-medium text-black hover:bg-white/90"
              >
                {isSubmitting ? "Se salvează..." : "Salvează parola nouă"}
              </Button>
            </form>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
