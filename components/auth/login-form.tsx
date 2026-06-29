"use client"

import { FormEvent, useState } from "react"
import { useAuth } from "./auth-provider"

export function LoginForm() {
  const { login } = useAuth()
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [error, setError] = useState("")
  const [isSubmitting, setIsSubmitting] = useState(false)

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    setError("")
    setIsSubmitting(true)
    try {
      await login(username, password)
    } catch (loginError) {
      setError(loginError instanceof Error ? loginError.message : "Unable to log in")
    } finally {
      setIsSubmitting(false)
    }
  }

  return (
    <form onSubmit={onSubmit} className="space-y-5 rounded-3xl border border-white/10 bg-white/[0.06] p-6 shadow-2xl backdrop-blur">
      <div>
        <label htmlFor="username" className="text-sm font-medium text-slate-200">
          Username
        </label>
        <input
          id="username"
          value={username}
          onChange={(event) => setUsername(event.target.value)}
          autoComplete="username"
          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none ring-cyan-400/40 transition focus:border-cyan-300 focus:ring-4"
          required
        />
      </div>
      <div>
        <label htmlFor="password" className="text-sm font-medium text-slate-200">
          Password
        </label>
        <input
          id="password"
          type="password"
          value={password}
          onChange={(event) => setPassword(event.target.value)}
          autoComplete="current-password"
          className="mt-2 w-full rounded-xl border border-white/10 bg-slate-950/70 px-4 py-3 text-slate-100 outline-none ring-cyan-400/40 transition focus:border-cyan-300 focus:ring-4"
          required
        />
      </div>
      {error ? <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</p> : null}
      <button
        type="submit"
        disabled={isSubmitting}
        className="w-full rounded-xl bg-cyan-400 px-4 py-3 font-semibold text-slate-950 shadow-lg shadow-cyan-500/20 transition hover:bg-cyan-300 disabled:cursor-not-allowed disabled:opacity-60"
      >
        {isSubmitting ? "Signing in…" : "Sign in to Foundry-AI"}
      </button>
    </form>
  )
}
