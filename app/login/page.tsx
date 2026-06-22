"use client"

import { FormEvent, Suspense, useEffect, useState } from "react"
import { useSearchParams } from "next/navigation"
import Link from "next/link"
import { Eye, EyeOff } from "lucide-react"
import { Button } from "@/components/ui/button"
import { Checkbox } from "@/components/ui/checkbox"
import { getSupabaseBrowserClient } from "@/lib/supabase/client"
import { cn } from "@/lib/utils"

type AuthMode = "login" | "signup"

function LoginForm() {
  const searchParams = useSearchParams()
  const [mode, setMode] = useState<AuthMode>("login")

  useEffect(() => {
    if (searchParams.get("tab") === "signup") {
      setMode("signup")
    }
  }, [searchParams])
  const [email, setEmail] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [showConfirmPassword, setShowConfirmPassword] = useState(false)
  const [isSubmitting, setIsSubmitting] = useState(false)
  const [loginSuccess, setLoginSuccess] = useState(false)
  const [message, setMessage] = useState<string | null>(null)
  const [errorMessage, setErrorMessage] = useState<string | null>(null)
  const [signupDone, setSignupDone] = useState(false)
  const [acceptedTerms, setAcceptedTerms] = useState(false)
  const [acceptedPrivacy, setAcceptedPrivacy] = useState(false)

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
      if (mode === "login") {
        const response = await fetch("/api/auth/login", {
          method: "POST",
          credentials: "include",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({
            email,
            password,
            rememberMe,
          }),
        })
        const result = await response.json()

        if (!response.ok) {
          setErrorMessage(result.error ?? "Nu s-a putut face autentificarea.")
          setIsSubmitting(false)
          return
        }

        // Briefly morph the button into a green checkmark before navigating
        // so the success is visible. The full reload happens right after.
        setLoginSuccess(true)
        await new Promise((resolve) => setTimeout(resolve, 700))
        window.location.href = result.redirectTo ?? "/"
        return
      }

      const supabase = getSupabaseBrowserClient()
      const { data, error } = await supabase.auth.signUp({
        email,
        password,
      })

      if (error) {
        setErrorMessage(error.message)
        return
      }

      if (data.user) {
        try {
          const res = await fetch("/api/legal/record-signup-consent", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              userId: data.user.id,
              userAgent: navigator.userAgent,
            }),
          })
          if (!res.ok) {
            console.error("[signup] Consent recording failed:", await res.text())
          }
        } catch (consentErr) {
          console.error("[signup] Consent recording error:", consentErr)
        }
      }

      setSignupDone(true)
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
        <div className="self-center text-center">
          <h1 className="bg-gradient-to-r from-primary via-sky-400 to-blue-500 bg-clip-text text-3xl font-bold text-transparent md:text-4xl">
            QuizHub
          </h1>
        </div>
        {signupDone ? (
          <div className="card-surface w-full max-w-md self-center">
            <div className="flex flex-col items-center gap-4 px-6 py-10 text-center md:px-8">
              <div className="flex size-16 items-center justify-center rounded-full bg-emerald-500/10">
                <svg
                  xmlns="http://www.w3.org/2000/svg"
                  className="size-8 text-emerald-500"
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                  strokeWidth={1.5}
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    d="M21.75 6.75v10.5a2.25 2.25 0 01-2.25 2.25h-15a2.25 2.25 0 01-2.25-2.25V6.75m19.5 0A2.25 2.25 0 0019.5 4.5h-15a2.25 2.25 0 00-2.25 2.25m19.5 0v.243a2.25 2.25 0 01-1.07 1.916l-7.5 4.615a2.25 2.25 0 01-2.36 0L3.32 8.91a2.25 2.25 0 01-1.07-1.916V6.75"
                  />
                </svg>
              </div>
              <div className="flex flex-col gap-1">
                <h2 className="text-xl font-semibold text-foreground">
                  Verifică-ți emailul
                </h2>
                <p className="text-sm text-muted-foreground">
                  Am trimis un link de confirmare la{" "}
                  <span className="font-medium text-foreground">{email}</span>.
                  Accesează linkul pentru a-ți activa contul.
                </p>
              </div>
              <p className="text-xs text-muted-foreground">
                Nu ai primit emailul? Verifică folderul spam sau{" "}
                <button
                  type="button"
                  className="text-primary underline-offset-4 hover:underline"
                  onClick={() => setSignupDone(false)}
                >
                  încearcă din nou
                </button>
                .
              </p>
            </div>
          </div>
        ) : (
        <div className="card-surface w-full max-w-md self-center">
          <div className="px-6 pt-6 pb-2 md:px-8 md:pt-8">
            <p className="section-label">Autentificare</p>
            <h1 className="text-2xl font-semibold text-foreground md:text-3xl">
              {mode === "login" ? "Conectare" : "Creare cont"}
            </h1>
          </div>
          <div className="flex flex-col gap-5 px-6 pb-6 pt-2 md:px-8 md:pb-8">
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
                    ? "bg-card shadow-sm section-label"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Conectare
              </button>
              <button
                type="button"
                onClick={() => {
                  clearFeedback()
                  setMode("signup")
                }}
                className={`rounded-md px-3 py-2 text-sm font-medium transition ${
                  mode === "signup"
                    ? "bg-card shadow-sm section-label"
                    : "text-muted-foreground hover:text-foreground"
                }`}
              >
                Creare cont
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

              {mode === "login" && (
                <label className="flex items-center gap-2 text-sm text-muted-foreground">
                  <input
                    type="checkbox"
                    checked={rememberMe}
                    onChange={(event) => setRememberMe(event.target.checked)}
                    className="w-4 h-4 rounded border-slate-600 bg-slate-800 accent-sky-600 focus:outline-none focus:ring-0 focus-visible:outline-none outline-none"
                  />
                  Ține-mă minte
                </label>
              )}

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

              {mode === "signup" && (
                <div className="space-y-3">
                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="accept-terms"
                      checked={acceptedTerms}
                      onCheckedChange={(checked) => setAcceptedTerms(checked === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor="accept-terms" className="text-sm leading-tight text-muted-foreground cursor-pointer">
                      Sunt de acord cu{" "}
                      <Link
                        href="/legal/termeni"
                        target="_blank"
                        className="underline underline-offset-4 text-foreground"
                      >
                        Termenii și condițiile
                      </Link>
                    </label>
                  </div>

                  <div className="flex items-start gap-2">
                    <Checkbox
                      id="accept-privacy"
                      checked={acceptedPrivacy}
                      onCheckedChange={(checked) => setAcceptedPrivacy(checked === true)}
                      className="mt-0.5"
                    />
                    <label htmlFor="accept-privacy" className="text-sm leading-tight text-muted-foreground cursor-pointer">
                      Am citit și sunt de acord cu{" "}
                      <Link
                        href="/legal/confidentialitate"
                        target="_blank"
                        className="underline underline-offset-4 text-foreground"
                      >
                        Politica de confidențialitate
                      </Link>
                    </label>
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
                disabled={
                  isSubmitting ||
                  loginSuccess ||
                  (mode === "signup" && (!acceptedTerms || !acceptedPrivacy))
                }
                className={cn(
                  "btn-primary w-full py-3.5 text-base disabled:opacity-60",
                  loginSuccess && "button-success"
                )}
              >
                {loginSuccess ? (
                  <span className="flex items-center justify-center gap-2">
                    <svg
                      className="check-draw size-5"
                      viewBox="0 0 24 24"
                      fill="none"
                      xmlns="http://www.w3.org/2000/svg"
                    >
                      <path
                        d="M5 13l4 4L19 7"
                        stroke="white"
                        strokeWidth="3"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                    <span>Conectat</span>
                  </span>
                ) : isSubmitting ? (
                  "Se procesează..."
                ) : mode === "login" ? (
                  "Conectare"
                ) : (
                  "Creare cont"
                )}
              </Button>
            </form>

            <button
              type="button"
              disabled={isSubmitting}
              onClick={handleForgotPassword}
              className="text-left text-sm text-primary underline-offset-4 transition hover:underline disabled:opacity-50"
            >
              Ai uitat parola?
            </button>
          </div>
        </div>
        )}
      </main>
    </div>
  )
}

export default function LoginPage() {
  return (
    <Suspense>
      <LoginForm />
    </Suspense>
  )
}
