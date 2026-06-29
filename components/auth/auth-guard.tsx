"use client"

import { useEffect } from "react"
import { useRouter } from "next/navigation"
import { useAuth } from "./auth-provider"

export function AuthGuard({ children }: { children: React.ReactNode }) {
  const router = useRouter()
  const { user, isLoading } = useAuth()

  useEffect(() => {
    if (!isLoading && !user) router.replace("/login")
  }, [isLoading, router, user])

  if (isLoading) {
    return (
      <div className="flex min-h-screen items-center justify-center bg-slate-950 text-slate-100">
        <div className="rounded-2xl border border-white/10 bg-white/5 px-5 py-4 text-sm text-slate-300 shadow-2xl">
          Loading secure workspace…
        </div>
      </div>
    )
  }

  if (!user) return null
  return <>{children}</>
}
