"use client"

import * as React from "react"
import { useState } from "react"
import { useRouter } from "next/navigation"
import { Eye, EyeOff } from "lucide-react"
import icon from "public/favicon.png"

import { supabase } from "@/lib/supabaseClient"
import { Button } from "@/components/ui/button"

export default function LoginPage() {
  const router = useRouter()

  const [email, setEmail] = useState("")
  const [emailError, setEmailError] = useState<string | null>(null)
  const [password, setPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [status, setStatus] = useState<null | {
    type: "ok" | "err"
    msg: string
  }>()
  const [isSignUp, setIsSignUp] = useState(false)

  // Email Validation
  function validateEmail(email: string) {
    const pattern = /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/
    return pattern.test(email.trim())
  }

  function authError(message: string) {
    if (/invalid login credentials/i.test(message))
      return "Incorrect email or password."
    if (/user already registered/i.test(message))
      return "This email is already registered. Try signing in."
    if (/email rate limit/i.test(message))
      return "Too many attempts. Please wait a moment and try again."
    return message
  }

  // Authentication
  async function handleAuth(e: React.FormEvent) {
    e.preventDefault()

    // reset UI state
    setStatus(null)
    setEmailError(null)

    // basic validation before we flip loading on
    if (!validateEmail(email)) {
      setEmailError("Please enter a valid email.")
      return
    }
    if (!password.trim()) {
      setStatus({ type: "err", msg: "Please enter your password." })
      return
    }

    setLoading(true)

    try {
      if (isSignUp) {
        // --- SIGN UP ---
        const { error } = await supabase.auth.signUp({
          email: email.trim(),
          password: password.trim(),
        })
        if (error) throw error

        setStatus({
          type: "ok",
          msg: "Success! Please verify your email before signing in",
        })
        setIsSignUp(false)
      } else {
        // --- SIGN IN ---
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password: password.trim(),
        })
        if (error) throw error

        // 1) Read session from client
        const {
          data: { session },
        } = await supabase.auth.getSession()
        if (!session) throw new Error("No session after sign in")

        // 2) Ask the server to set HTTP-only cookies
        await fetch("/api/auth/set-session", {
          method: "POST",
          headers: { "content-type": "application/json" },
          credentials: "include",
          body: JSON.stringify({
            access_token: session.access_token,
            refresh_token: session.refresh_token,
          }),
        })

        // 3) Use session.user.email for the message
        const emailFromSession = session.user?.email ?? "unknown user"

        setStatus({
          type: "ok",
          msg: `Signed in successfully.`,
        })

        console.log("Signed in session:", session)

        // 4) Redirect AFTER a short delay so you can see the banner
        setTimeout(() => {
          router.replace("/")
        }, 800)
      }
    } catch (err: any) {
      console.error("Auth error:", err)
      setStatus({
        type: "err",
        msg: authError(err?.message ?? "Authentication failed."),
      })
    } finally {
      setLoading(false)
    }
  }

  // Flag for button disable
  const emailIsValid = email.length > 0 && !emailError

  return (
    <div className="flex min-h-screen items-center justify-center bg-slate-950">
      <div className="mx-20 w-full max-w-5xl rounded-3xl border border-slate-800 bg-slate-900 shadow-2xl">
        {/* Card grid: left brand, right form */}
        <div className="grid grid-cols-1 md:grid-cols-2">
          {/* LEFT: brand / headline */}
          <div className="hidden md:flex flex-col justify-start gap-4 p-10 mt-3">
            <img src="/favicon.png" className="h-12 w-12 object-contain" />
            <h1 className="text-4xl font-semibold tracking-tight text-slate-100">
              {isSignUp ? "Create account" : "Sign in"}
            </h1>
            <p className="text-sm text-slate-400">
              {isSignUp
                ? "Use your email and password to get started."
                : "to continue to TradeLens"}
            </p>
          </div>

          {/* RIGHT: form panel */}
          <div className="p-8 md:p-10">
            <h2 className="mb-1 text-2xl font-semibold text-slate-200 md:hidden">
              {isSignUp ? "Create account" : "Sign in"}
            </h2>
            <p className="mb-6 text-sm text-slate-400 md:hidden">
              {isSignUp
                ? "Use your email and password to get started."
                : "to continue to TradeLens"}
            </p>

            <form onSubmit={handleAuth} noValidate className="space-y-5">
              {/* Email */}
              <label className="block text-sm text-slate-300">
                Email
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => {
                    const v = e.target.value
                    setEmail(v)
                    setEmailError(
                      validateEmail(v) ? null : "Please enter a valid email."
                    )
                  }}
                  placeholder="you@example.com"
                  inputMode="email"
                  autoComplete="email"
                  aria-invalid={!!emailError}
                  aria-describedby={emailError ? "email-error" : undefined}
                  className={`mt-1 h-12 w-full rounded-xl border px-4 text-base text-slate-100 bg-slate-900 outline-none ${
                    emailError
                      ? "border-rose-500 focus:border-rose-500"
                      : "border-slate-700 focus:border-teal-500"
                  }`}
                />
                {emailError && (
                  <p
                    id="email-error"
                    className="mt-1 text-xs text-rose-400 px-1"
                  >
                    {emailError}
                  </p>
                )}
              </label>

              {/* Password */}
              <label className="block text-sm text-slate-300">
                Password
                <div className="relative mt-1">
                  <input
                    type={showPassword ? "text" : "password"}
                    required
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="••••••••"
                    minLength={8}
                    autoComplete={
                      isSignUp ? "new-password" : "current-password"
                    }
                    className="h-12 w-full rounded-xl border border-slate-700 bg-slate-900 px-4 pr-10 text-base text-slate-100 outline-none focus:border-teal-500"
                  />
                  <button
                    type="button"
                    onClick={() => setShowPassword((prev) => !prev)}
                    aria-label={
                      showPassword ? "Hide password" : "Show password"
                    }
                    className="absolute inset-y-0 right-3 flex items-center text-slate-400 hover:text-slate-200 transition"
                  >
                    {showPassword ? (
                      <EyeOff className="h-5 w-5" strokeWidth={1.75} />
                    ) : (
                      <Eye className="h-5 w-5" strokeWidth={1.75} />
                    )}
                  </button>
                </div>
              </label>

              {/* Action row */}
              <div className="mt-2 flex items-center justify-between">
                <button
                  type="button"
                  onClick={() => {
                    setStatus(null)
                    setIsSignUp((v) => !v)
                  }}
                  className="text-sm font-medium text-teal-400 hover:underline"
                >
                  {isSignUp ? "Sign in instead" : "Create account"}
                </button>

                <Button
                  type="submit"
                  disabled={loading || !emailIsValid || password.length === 0}
                  aria-busy={loading}
                  className="rounded-full px-6"
                >
                  {loading
                    ? isSignUp
                      ? "Creating..."
                      : "Signing in"
                    : isSignUp
                    ? "Create"
                    : "Sign In"}
                </Button>
              </div>

              {/* Status */}
              {status && (
                <div
                  className={`mt-4 rounded-2xl px-4 py-2 text-sm ${
                    status.type === "ok"
                      ? "bg-emerald-500/10 text-emerald-400 border border-emerald-500/30"
                      : "bg-rose-500/10 text-rose-400 border border-rose-500/30"
                  }`}
                >
                  {status.type === "err" &&
                  status.msg.includes("Password should contain") ? (
                    <>
                      <strong className="block mb-1 font-medium text-rose-400">
                        Password must include:
                      </strong>
                      <ul className="ml-4 list-disc text-rose-300/90 space-y-0.5">
                        <li>1 lowercase letter (a–z)</li>
                        <li>1 uppercase letter (A–Z)</li>
                        <li>1 number (0–9)</li>
                        <li>1 special symbol (@$!%*?&)</li>
                      </ul>
                    </>
                  ) : (
                    status.msg
                  )}
                </div>
              )}
            </form>
          </div>
        </div>
      </div>
    </div>
  )
}
