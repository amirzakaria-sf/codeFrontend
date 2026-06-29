"use client"

import { useCallback, useEffect, useState } from "react"
import Link from "next/link"
import { usePathname } from "next/navigation"
import { AuthGuard } from "@/components/auth/auth-guard"
import { useAuth } from "@/components/auth/auth-provider"
import { api } from "@/lib/api"

const navigation = [
  { href: "/dashboard", label: "Workspaces" },
  { href: "/dashboard/operations", label: "Operations" },
]

export function DashboardShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname()
  const { user, logout } = useAuth()
  const [approvalCount, setApprovalCount] = useState(0)
  const [notificationCount, setNotificationCount] = useState(0)

  const loadApprovalCount = useCallback(async () => {
    if (!user) {
      setApprovalCount(0)
      return
    }
    try {
      const pending = await api.approvalInbox()
      setApprovalCount(pending.length)
    } catch {
      setApprovalCount(0)
    }
  }, [user])

  const loadNotificationCount = useCallback(async () => {
    if (!user) {
      setNotificationCount(0)
      return
    }
    try {
      const inbox = await api.notifications()
      setNotificationCount(inbox.unread_count)
    } catch {
      setNotificationCount(0)
    }
  }, [user])

  useEffect(() => {
    queueMicrotask(() => {
      loadApprovalCount()
      loadNotificationCount()
    })
    const timer = window.setInterval(() => {
      loadApprovalCount().catch(() => undefined)
      loadNotificationCount().catch(() => undefined)
    }, 15000)
    return () => window.clearInterval(timer)
  }, [loadApprovalCount, loadNotificationCount])

  function focusApprovalInbox() {
    if (approvalCount <= 0) return
    const target = document.getElementById("approval-inbox")
    if (!target) return
    target.scrollIntoView({ behavior: "smooth", block: "start" })
    target.focus({ preventScroll: true })
  }

  return (
    <AuthGuard>
      <div className="min-h-screen bg-slate-950 text-slate-100">
        <div className="flex min-h-screen flex-col lg:flex-row">
          <aside className="border-b border-white/10 bg-slate-900/70 px-4 py-4 backdrop-blur lg:w-72 lg:border-b-0 lg:border-r lg:px-6">
            <div className="flex items-center justify-between lg:block">
              <Link href="/dashboard" className="block">
                <p className="text-sm font-medium text-cyan-300">Foundry-AI</p>
                <h1 className="mt-1 text-xl font-semibold text-white">Orchestrator</h1>
              </Link>
              <button
                onClick={logout}
                className="rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-red-300/50 hover:text-red-100 lg:hidden"
              >
                Logout
              </button>
            </div>
            <nav className="mt-6 flex gap-2 overflow-x-auto lg:flex-col">
              {navigation.map((item) => {
                const active = pathname === item.href
                const href = approvalCount > 0 && item.href === "/dashboard" ? "/dashboard#approval-inbox" : item.href
                return (
                  <Link
                    key={item.href}
                    href={href}
                    onClick={() => {
                      if (pathname === "/dashboard") window.setTimeout(focusApprovalInbox, 0)
                    }}
                    className={`rounded-xl px-4 py-3 text-sm font-medium transition ${
                      active ? "bg-cyan-300 text-slate-950" : "text-slate-300 hover:bg-white/10 hover:text-white"
                    }`}
                  >
                    <span className="flex items-center justify-between gap-3">
                      <span>{item.label}</span>
                      {approvalCount > 0 && item.href === "/dashboard" ? (
                        <span className={`rounded-full px-2 py-0.5 text-xs ${active ? "bg-slate-950/20 text-slate-900" : "bg-amber-300/20 text-amber-100"}`}>
                          {approvalCount}
                        </span>
                      ) : null}
                    </span>
                  </Link>
                )
              })}
            </nav>
            <div className="mt-3 rounded-xl border border-white/10 bg-white/[0.03] px-3 py-2 text-xs text-slate-300">
              Notifications: <span className={notificationCount > 0 ? "text-amber-200" : "text-slate-400"}>{notificationCount}</span>
            </div>
            <div className="mt-8 hidden rounded-2xl border border-white/10 bg-white/[0.04] p-4 lg:block">
              <p className="text-sm text-slate-400">Signed in as</p>
              <p className="mt-1 font-medium text-white">{user?.username}</p>
              <p className="truncate text-sm text-slate-400">{user?.email || "No email set"}</p>
              <button
                onClick={logout}
                className="mt-4 w-full rounded-xl border border-white/10 px-3 py-2 text-sm text-slate-200 transition hover:border-red-300/50 hover:text-red-100"
              >
                Logout
              </button>
            </div>
          </aside>
          <main className="flex-1 overflow-x-hidden px-4 py-6 sm:px-6 lg:px-8">{children}</main>
        </div>
      </div>
    </AuthGuard>
  )
}
