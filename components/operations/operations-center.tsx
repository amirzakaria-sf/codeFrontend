"use client"

import { useCallback, useEffect, useMemo, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import type { GitSyncJob, OperationsDashboard, OrchestrationRun, UserNotification } from "@/lib/types"

type Tab = "runs" | "sync" | "notifications" | "projects"

export function OperationsCenter() {
  const [payload, setPayload] = useState<OperationsDashboard | null>(null)
  const [error, setError] = useState("")
  const [tab, setTab] = useState<Tab>("runs")
  const [filter, setFilter] = useState("")
  const [isLoading, setIsLoading] = useState(true)

  const load = useCallback(async () => {
    setIsLoading(true)
    setError("")
    try {
      setPayload(await api.operations())
    } catch (loadError) {
      setError(loadError instanceof Error ? loadError.message : "Unable to load operations dashboard")
    } finally {
      setIsLoading(false)
    }
  }, [])

  useEffect(() => {
    queueMicrotask(() => {
      load()
    })
    const timer = window.setInterval(() => {
      load().catch(() => undefined)
    }, 15000)
    return () => window.clearInterval(timer)
  }, [load])

  const filteredRuns = useMemo(() => {
    const needle = filter.toLowerCase().trim()
    const runs = payload?.recent_runs ?? []
    if (!needle) return runs
    return runs.filter((run) => `${run.id} ${run.project} ${run.user_username ?? ""} ${run.status} ${run.prompt}`.toLowerCase().includes(needle))
  }, [filter, payload])

  const filteredSyncJobs = useMemo(() => {
    const needle = filter.toLowerCase().trim()
    const jobs = payload?.recent_sync_jobs ?? []
    if (!needle) return jobs
    return jobs.filter((job) => `${job.id} ${job.project} ${job.status} ${job.feature_branch} ${job.pr_url} ${job.last_error}`.toLowerCase().includes(needle))
  }, [filter, payload])

  const filteredNotifications = useMemo(() => {
    const needle = filter.toLowerCase().trim()
    const notifications = payload?.recent_notifications ?? []
    if (!needle) return notifications
    return notifications.filter((notification) => `${notification.title} ${notification.message} ${notification.kind} ${notification.project_name ?? ""}`.toLowerCase().includes(needle))
  }, [filter, payload])

  const filteredProjects = useMemo(() => {
    const needle = filter.toLowerCase().trim()
    const projects = payload?.projects ?? []
    if (!needle) return projects
    return projects.filter((project) => `${project.name} ${project.absolute_path} ${project.workspace_mode} ${project.locked_by_username ?? ""}`.toLowerCase().includes(needle))
  }, [filter, payload])

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <p className="text-sm font-medium text-cyan-300">Operations Center</p>
          <h1 className="mt-2 text-3xl font-semibold tracking-tight text-white">Platform observability</h1>
          <p className="mt-2 max-w-3xl text-slate-400">
            Cross-project view for orchestration runs, GitHub sync jobs, usage totals, daemon state, and durable notifications.
          </p>
        </div>
        <button
          onClick={load}
          disabled={isLoading}
          className="rounded-xl border border-cyan-300/30 px-4 py-3 text-sm font-medium text-cyan-100 hover:bg-cyan-300/10 disabled:opacity-60"
        >
          {isLoading ? "Refreshing…" : "Refresh"}
        </button>
      </header>

      {error ? <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

      {payload ? (
        <>
          <section className="grid gap-3 sm:grid-cols-2 xl:grid-cols-6">
            <Metric label="Projects" value={payload.summary.project_count} helper={`${payload.summary.locked_project_count} locked`} />
            <Metric label="Daemons" value={payload.summary.active_daemon_count} helper="active" />
            <Metric label="Runs" value={payload.summary.run_count} helper={`${payload.summary.active_run_count} active`} />
            <Metric label="Run failures" value={payload.summary.failed_run_count} helper="needs review" tone="red" />
            <Metric label="Sync jobs" value={payload.summary.sync_job_count} helper={`${payload.summary.failed_sync_job_count} failed`} />
            <Metric label="Tokens" value={payload.summary.total_tokens} helper={`${payload.summary.usage_event_count} events`} />
          </section>

          <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center lg:justify-between">
              <div className="flex flex-wrap gap-2">
                {(["runs", "sync", "notifications", "projects"] as Tab[]).map((item) => (
                  <button
                    key={item}
                    onClick={() => setTab(item)}
                    className={`rounded-xl px-4 py-2 text-sm font-medium capitalize ${tab === item ? "bg-cyan-300 text-slate-950" : "border border-white/10 text-slate-200 hover:bg-white/10"}`}
                  >
                    {item}
                  </button>
                ))}
              </div>
              <input
                value={filter}
                onChange={(event) => setFilter(event.target.value)}
                placeholder="Filter current table…"
                className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-4 py-2 text-sm text-white outline-none focus:border-cyan-300 lg:max-w-sm"
              />
            </div>

            <div className="mt-4 overflow-x-auto">
              {tab === "runs" ? <RunsTable runs={filteredRuns} /> : null}
              {tab === "sync" ? <SyncTable jobs={filteredSyncJobs} /> : null}
              {tab === "notifications" ? <NotificationsTable notifications={filteredNotifications} /> : null}
              {tab === "projects" ? <ProjectsTable projects={filteredProjects} /> : null}
            </div>
          </section>
        </>
      ) : (
        <div className="rounded-3xl border border-white/10 bg-white/[0.04] p-8 text-slate-300">Loading operations data…</div>
      )}
    </div>
  )
}

function Metric({ label, value, helper, tone = "cyan" }: { label: string; value: number; helper: string; tone?: "cyan" | "red" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-white/[0.04] p-4">
      <p className="text-xs uppercase tracking-wide text-slate-500">{label}</p>
      <p className={`mt-2 font-mono text-2xl font-semibold ${tone === "red" ? "text-red-200" : "text-cyan-100"}`}>{value.toLocaleString()}</p>
      <p className="mt-1 text-xs text-slate-400">{helper}</p>
    </div>
  )
}

function RunsTable({ runs }: { runs: OrchestrationRun[] }) {
  if (!runs.length) return <Empty />
  return (
    <table className="min-w-full text-left text-sm">
      <thead className="text-xs uppercase text-slate-500">
        <tr><th className="p-2">Run</th><th className="p-2">Status</th><th className="p-2">Progress</th><th className="p-2">Tokens</th><th className="p-2">Prompt</th></tr>
      </thead>
      <tbody className="divide-y divide-white/10 text-slate-300">
        {runs.map((run) => (
          <tr key={run.id}>
            <td className="p-2"><Link className="text-cyan-300 hover:text-cyan-200" href={`/dashboard/projects/${run.project}`}>#{run.id}</Link></td>
            <td className="p-2">{run.status}</td>
            <td className="p-2">{run.progress_percent}%</td>
            <td className="p-2 font-mono">{run.total_tokens.toLocaleString()}</td>
            <td className="max-w-xl truncate p-2">{run.prompt}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function SyncTable({ jobs }: { jobs: GitSyncJob[] }) {
  if (!jobs.length) return <Empty />
  return (
    <table className="min-w-full text-left text-sm">
      <thead className="text-xs uppercase text-slate-500">
        <tr><th className="p-2">Job</th><th className="p-2">Status</th><th className="p-2">Branch</th><th className="p-2">PR</th><th className="p-2">Error</th></tr>
      </thead>
      <tbody className="divide-y divide-white/10 text-slate-300">
        {jobs.map((job) => (
          <tr key={job.id}>
            <td className="p-2">#{job.id}</td><td className="p-2">{job.status}</td><td className="p-2 font-mono">{job.feature_branch || "—"}</td>
            <td className="p-2">{job.pr_url ? <a className="text-cyan-300 hover:text-cyan-200" href={job.pr_url} target="_blank" rel="noreferrer">PR #{job.pr_number}</a> : "—"}</td>
            <td className="max-w-md truncate p-2 text-red-200">{job.last_error}</td>
          </tr>
        ))}
      </tbody>
    </table>
  )
}

function NotificationsTable({ notifications }: { notifications: UserNotification[] }) {
  if (!notifications.length) return <Empty />
  return (
    <table className="min-w-full text-left text-sm">
      <thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Kind</th><th className="p-2">Title</th><th className="p-2">Project</th><th className="p-2">Read</th><th className="p-2">Created</th></tr></thead>
      <tbody className="divide-y divide-white/10 text-slate-300">
        {notifications.map((notification) => (
          <tr key={notification.id}><td className="p-2">{notification.kind}</td><td className="p-2">{notification.title}</td><td className="p-2">{notification.project_name ?? "—"}</td><td className="p-2">{notification.is_read ? "Yes" : "No"}</td><td className="p-2">{new Date(notification.created_at).toLocaleString()}</td></tr>
        ))}
      </tbody>
    </table>
  )
}

function ProjectsTable({ projects }: { projects: OperationsDashboard["projects"] }) {
  if (!projects.length) return <Empty />
  return (
    <table className="min-w-full text-left text-sm">
      <thead className="text-xs uppercase text-slate-500"><tr><th className="p-2">Project</th><th className="p-2">Mode</th><th className="p-2">Lock</th><th className="p-2">Daemon</th><th className="p-2">Targets</th></tr></thead>
      <tbody className="divide-y divide-white/10 text-slate-300">
        {projects.map((project) => (
          <tr key={project.id}><td className="p-2"><Link className="text-cyan-300 hover:text-cyan-200" href={`/dashboard/projects/${project.id}`}>{project.name}</Link></td><td className="p-2">{project.workspace_mode}</td><td className="p-2">{project.is_locked ? `Locked by ${project.locked_by_username ?? "unknown"}` : "Open"}</td><td className="p-2">{project.daemon_pid ? `${project.allocated_port}/${project.daemon_pid}` : "Stopped"}</td><td className="p-2">{project.targets.length}</td></tr>
        ))}
      </tbody>
    </table>
  )
}

function Empty() {
  return <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">No records match this view.</p>
}
