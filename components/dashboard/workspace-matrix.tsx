"use client"

import { useCallback, useEffect, useState } from "react"
import { api } from "@/lib/api"
import type { PendingApprovalItem, Project, ProvisionProjectPayload, UserNotification } from "@/lib/types"
import { useToast } from "@/components/ui/toast-provider"
import { ApprovalInbox } from "./approval-inbox"
import { ProjectCard } from "./project-card"
import { ProjectProvisioner } from "./project-provisioner"

export function WorkspaceMatrix() {
  const { pushToast } = useToast()
  const [projects, setProjects] = useState<Project[]>([])
  const [approvals, setApprovals] = useState<PendingApprovalItem[]>([])
  const [notifications, setNotifications] = useState<UserNotification[]>([])
  const [unreadNotifications, setUnreadNotifications] = useState(0)
  const [portByProject, setPortByProject] = useState<Record<number, string>>({})
  const [error, setError] = useState("")
  const [isLoading, setIsLoading] = useState(true)
  const [isProvisioning, setIsProvisioning] = useState(false)

  const loadProjects = useCallback(async () => {
    setIsLoading(true)
    try {
      const [projectPayload, approvalPayload, notificationsPayload] = await Promise.all([
        api.projects(),
        api.approvalInbox(),
        api.notifications(),
      ])
      setProjects(projectPayload)
      setApprovals(approvalPayload)
      setNotifications(notificationsPayload.items)
      setUnreadNotifications(notificationsPayload.unread_count)
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load projects")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      loadProjects()
    })
  }, [loadProjects])

  useEffect(() => {
    if (window.location.hash !== "#approval-inbox") return
    window.setTimeout(() => {
      const target = document.getElementById("approval-inbox")
      target?.scrollIntoView({ behavior: "smooth", block: "start" })
      target?.focus({ preventScroll: true })
    }, 100)
  }, [])

  useEffect(() => {
    const timer = window.setInterval(() => {
      loadProjects().catch(() => undefined)
    }, 15000)
    return () => window.clearInterval(timer)
  }, [loadProjects])

  async function createProject(payload: ProvisionProjectPayload) {
    setError("")
    setIsProvisioning(true)
    try {
      await api.provisionProject(payload)
      await loadProjects()
      pushToast("Workspace provisioned successfully.", "success")
    } catch (createError) {
      pushToast("Unable to provision workspace.", "error")
      setError(createError instanceof Error ? createError.message : "Unable to provision workspace")
    } finally {
      setIsProvisioning(false)
    }
  }

  async function startDaemon(project: Project) {
    const rawPort = portByProject[project.id] || "8010"
    const port = Number.parseInt(rawPort, 10)
    if (Number.isNaN(port)) return
    setError("")
    try {
      await api.startDaemon(project.id, port)
      await loadProjects()
      pushToast(`Daemon started for ${project.name}.`, "success")
    } catch (startError) {
      pushToast("Unable to start daemon. Acquire lock first or check permissions.", "error")
      setError(startError instanceof Error ? startError.message : "Unable to start daemon")
    }
  }

  async function acquireLock(project: Project) {
    setError("")
    try {
      await api.acquireLock(project.id)
      await loadProjects()
      pushToast(`Lock acquired for ${project.name}.`, "success")
    } catch (acquireError) {
      pushToast("Unable to acquire lock.", "error")
      setError(acquireError instanceof Error ? acquireError.message : "Unable to acquire lock")
    }
  }

  async function releaseLock(project: Project) {
    setError("")
    try {
      await api.releaseLock(project.id)
      await loadProjects()
      pushToast(`Lock released for ${project.name}.`, "success")
    } catch (releaseError) {
      pushToast("Unable to release lock.", "error")
      setError(releaseError instanceof Error ? releaseError.message : "Unable to release lock")
    }
  }

  async function markNotificationRead(notificationId: number) {
    try {
      await api.markNotificationRead(notificationId)
      await loadProjects()
    } catch {
      // ignore
    }
  }

  async function markAllNotificationsRead() {
    try {
      await api.markAllNotificationsRead()
      await loadProjects()
      pushToast("Notifications marked as read.", "success")
    } catch {
      pushToast("Unable to mark notifications as read.", "error")
    }
  }

  return (
    <div>
      <div className="flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
        <div>
          <p className="text-sm font-medium text-cyan-300">Workspace Matrix</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Managed projects</h1>
          <p className="mt-2 max-w-2xl text-slate-400">
            Provision starter apps, clone active repos, attach reference repos, or model custom multi-target topologies.
          </p>
        </div>
      </div>

      {error ? <div className="mt-5 rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

      <div className="mt-8">
        <ProjectProvisioner onProvision={createProject} isSubmitting={isProvisioning} />
      </div>

      <ApprovalInbox approvals={approvals} onChange={loadProjects} />

      <section id="notifications-inbox" className="mt-8 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
        <div className="flex items-center justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">Notifications</h2>
            <p className="text-sm text-slate-400">Durable user inbox for approvals, runs, and GitHub sync updates.</p>
          </div>
          <button
            onClick={markAllNotificationsRead}
            disabled={unreadNotifications <= 0}
            className="rounded-xl border border-slate-300/30 px-3 py-2 text-xs text-slate-100 hover:bg-slate-300/10 disabled:opacity-50"
          >
            Mark all read ({unreadNotifications})
          </button>
        </div>
        <div className="mt-3 space-y-2">
          {notifications.length ? (
            notifications.slice(0, 30).map((notification) => (
              <article
                key={notification.id}
                className={`rounded-xl border px-3 py-2 ${notification.is_read ? "border-white/10 bg-slate-950/50" : "border-amber-300/20 bg-amber-300/10"}`}
              >
                <div className="flex items-start justify-between gap-2">
                  <div>
                    <p className="text-sm font-medium text-white">{notification.title}</p>
                    <p className="text-xs text-slate-300">{notification.message}</p>
                    <p className="mt-1 text-[11px] text-slate-500">
                      {notification.project_name ? `${notification.project_name} · ` : ""}
                      {new Date(notification.created_at).toLocaleString()}
                    </p>
                  </div>
                  {!notification.is_read ? (
                    <button
                      onClick={() => markNotificationRead(notification.id)}
                      className="rounded-lg border border-amber-300/30 px-2 py-1 text-[11px] text-amber-100 hover:bg-amber-300/10"
                    >
                      Mark read
                    </button>
                  ) : null}
                </div>
              </article>
            ))
          ) : (
            <p className="rounded-xl border border-dashed border-white/10 px-3 py-4 text-sm text-slate-500">
              No notifications yet.
            </p>
          )}
        </div>
      </section>

      {isLoading ? (
        <div className="mt-10 rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-slate-300">Loading projects…</div>
      ) : projects.length === 0 ? (
        <div className="mt-10 rounded-3xl border border-dashed border-white/15 bg-white/[0.03] p-8 text-center text-slate-400">
          No projects yet. Provision the first workspace to begin.
        </div>
      ) : (
        <div className="mt-8 grid gap-5 md:grid-cols-2 xl:grid-cols-3">
          {projects.map((project) => (
            <div key={project.id} className="space-y-3">
              <ProjectCard project={project} />
              <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
                <div className="flex flex-wrap items-center gap-2">
                  <button
                    onClick={() => acquireLock(project)}
                    className="rounded-lg border border-emerald-300/30 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-300/10"
                  >
                    Acquire lock
                  </button>
                  <button
                    onClick={() => releaseLock(project)}
                    className="rounded-lg border border-slate-300/30 px-3 py-1.5 text-xs font-medium text-slate-100 hover:bg-slate-300/10"
                  >
                    Release lock
                  </button>
                  {project.locked_by_username ? <span className="text-xs text-slate-400">Owner: {project.locked_by_username}</span> : null}
                </div>
                {!project.daemon_pid ? (
                  <div className="mt-3 space-y-2">
                    <p className="text-xs text-slate-400">Start daemon to enable workspace sessions and open the workspace detail view.</p>
                    <div className="flex gap-2">
                      <input
                        value={portByProject[project.id] ?? "8010"}
                        onChange={(event) => setPortByProject((current) => ({ ...current, [project.id]: event.target.value }))}
                        className="min-w-0 flex-1 rounded-xl border border-white/10 bg-slate-900 px-3 py-2 text-sm text-white outline-none"
                        aria-label={`Daemon port for ${project.name}`}
                      />
                      <button
                        onClick={() => startDaemon(project)}
                        className="rounded-xl border border-cyan-300/30 px-3 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-300/10"
                      >
                        Start daemon
                      </button>
                    </div>
                  </div>
                ) : (
                  <p className="mt-3 text-xs text-emerald-200">Daemon active on port {project.allocated_port}. Open workspace from card.</p>
                )}
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  )
}
