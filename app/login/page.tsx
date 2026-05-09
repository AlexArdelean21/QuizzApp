"use client"

import { FormEvent, useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"

type AuthMode = "login" | "signup"

export default function LoginPage() {
  const [mode, setMode] = useState<AuthMode>("login")
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)

  const router = useRouter()

  const clearFeedback = () => {
    setMessage(null)
    setErrorMessage(null)
  }

  const onSubmit = async (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault()
    clearFeedback()

    if (mode === "signup" && password !== confirmPassword) {
      setErrorMessage("Parolele nu coincid")
      return
    }

    setIsSubmitting(true)

    try {
      const supabase = getSupabaseBrowserClient()

      if (mode === "login") {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        })
        console.log("Rezultat Login:", { data, error })

        if (error) {
          setErrorMessage(error.message)
          setIsSubmitting(false)
          return
        }

        window.location.href = "/"
        return
      }

      const { error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setErrorMessage(error.message)
        return
      }

      router.push("/")
      router.refresh()
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "A apărut o eroare neașteptată."
      )
    } finally {
      setIsSubmitting(false)
    }
  }

  const handleForgotPassword = async () => {
    clearFeedback()
    if (!email) {
      setErrorMessage("Introdu mai întâi adresa de email.")
      return
    }

    setIsSubmitting(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        credentials: "include",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email }),
      })

      const data = await res.json()

      if (!res.ok) {
        setErrorMessage(data.error ?? "Nu s-a putut trimite email-ul.")
        return
      }

      setMessage("Am trimis email-ul pentru resetarea parolei.")
    } catch (error) {
      setErrorMessage(
        error instanceof Error ? error.message : "Nu s-a putut trimite email-ul."
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
              Autentificare
            </p>
            <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
              {mode === "login" ? "Log in" : "Sign up"}
            </h1>
          </CardHeader>
          <CardContent className="flex flex-col gap-5 pt-2">
            <div className="grid grid-cols-2 gap-2 rounded-lg bg-secondary p-1">
              <button
                type="button"
                onClick={() => {
                  clearFeedback()
                  setMode("login")
                  setConfirmPassword("")
                }}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  mode === "login"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Log in
              </button>
              <button
                type="button"
                onClick={() => {
                  clearFeedback()
                  setMode("signup")
                }}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  mode === "signup"
                    ? "bg-card text-foreground shadow-sm"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Sign up
              </button>
            </div>

            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="flex flex-col gap-1.5">
                <label htmlFor="email" className="text-sm font-medium text-foreground">
                  Email
                </label>
                <input
                  id="email"
                  type="email"
                  required
                  autoComplete="email"
                  value={email}
                  onChange={(event) => setEmail(event.target.value)}
                  className="rounded-lg border border-input bg-background px-3 py-2 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                />
              </div>

              <div className="flex flex-col gap-1.5">
                <label htmlFor="password" className="text-sm font-medium text-foreground">
                  Parolă
                </label>
                <div className="relative">
                  <input
                    id="password"
                    type={showPassword ? "text" : "password"}
                    required
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    value={password}
                    onChange={(event) => setPassword(event.target.value)}
                    className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    className="absolute inset-y-0 right-2 inline-flex items-center text-muted-foreground transition hover:text-foreground"
                    aria-label={showPassword ? "Ascunde parola" : "Arată parola"}
                  >
                    {showPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                  </button>
                </div>
              </div>

              {mode === "signup" && (
                <div className="flex flex-col gap-1.5">
                  <label htmlFor="confirm-password" className="text-sm font-medium text-foreground">
                    Confirmă Parola
                  </label>
                  <div className="relative">
                    <input
                      id="confirm-password"
                      type={showConfirmPassword ? "text" : "password"}
                      required
                      autoComplete="new-password"
                      value={confirmPassword}
                      onChange={(event) => setConfirmPassword(event.target.value)}
                      className="w-full rounded-lg border border-input bg-background px-3 py-2 pr-10 text-sm text-foreground outline-none transition focus:border-primary focus:ring-2 focus:ring-primary/30"
                    />
                    <button
                      type="button"
                      onClick={() => setShowConfirmPassword((prev) => !prev)}
                      className="absolute inset-y-0 right-2 inline-flex items-center text-muted-foreground transition hover:text-foreground"
                      aria-label={showConfirmPassword ? "Ascunde parola" : "Arată parola"}
                    >
                      {showConfirmPassword ? <EyeOff className="size-4" /> : <Eye className="size-4" />}
                    </button>
                  </div>
                </div>
              )}

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
                {isSubmitting
                  ? "Se procesează..."
                  : mode === "login"
                    ? "Log in"
                    : "Sign up"}
              </Button>
            </form>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleForgotPassword}
              className="text-left text-sm text-primary underline-offset-4 transition hover:underline disabled:opacity-50"
            >
              Forgot Password?
            </button>
          </CardContent>
        </Card>
      </main>
    </div>
  )
}
