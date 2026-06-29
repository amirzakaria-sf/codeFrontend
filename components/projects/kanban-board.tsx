"use client"

import { ChangeEvent, ClipboardEvent, FormEvent, useCallback, useEffect, useMemo, useRef, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import { openProjectSocket } from "@/lib/websocket"
import { useToast } from "@/components/ui/toast-provider"
import { RejectionModal } from "@/components/ui/rejection-modal"
import type {
  GitSyncJob,
  OpenCodeSession,
  OpenCodeSessionStatusMap,
  OrchestrationRun,
  ProjectUsageSummary,
  Project,
  TaskQueue,
  TaskStatus,
  TokenUsageEvent,
  UploadedReference,
  WorkspaceEvent,
} from "@/lib/types"

const columns: Array<{ status: TaskStatus; label: string; tone: string }> = [
  { status: "PENDING_APPROVAL", label: "Approval", tone: "border-amber-300/30 text-amber-200" },
  { status: "QUEUED", label: "Queued", tone: "border-sky-300/30 text-sky-200" },
  { status: "RUNNING", label: "In Progress", tone: "border-cyan-300/30 text-cyan-200" },
  { status: "VERIFYING", label: "Supervisor Review", tone: "border-violet-300/30 text-violet-200" },
  { status: "COMPLETED", label: "Completed", tone: "border-emerald-300/30 text-emerald-200" },
  { status: "FAILED", label: "Failed", tone: "border-red-300/30 text-red-200" },
]

const ACCEPTED_REFERENCE_FILE_EXTENSIONS =
  ".pdf,.md,.txt,.png,.jpg,.jpeg,.gif,.webp,.svg,.py,.js,.jsx,.ts,.tsx,.json,.yaml,.yml,.html,.css,.scss,.java,.go,.rs,.c,.cpp,.h,.hpp,.sh,.sql,.xml,.toml,.ini"

export function KanbanBoard({ projectId }: { projectId: number }) {
  const { pushToast } = useToast()
  const [project, setProject] = useState<Project | null>(null)
  const [tasks, setTasks] = useState<TaskQueue[]>([])
  const [runs, setRuns] = useState<OrchestrationRun[]>([])
  const [prompt, setPrompt] = useState("")
  const [events, setEvents] = useState<WorkspaceEvent[]>([])
  const [error, setError] = useState("")
  const [isExecuting, setIsExecuting] = useState(false)
  const [isChangingDaemon, setIsChangingDaemon] = useState(false)
  const [rejectingTask, setRejectingTask] = useState<TaskQueue | null>(null)
  const [rejectingTaskId, setRejectingTaskId] = useState<number | null>(null)
  const [sessions, setSessions] = useState<OpenCodeSession[]>([])
  const [sessionStatus, setSessionStatus] = useState<OpenCodeSessionStatusMap>({})
  const [selectedSessionId, setSelectedSessionId] = useState("")
  const [selectedSession, setSelectedSession] = useState<OpenCodeSession | null>(null)
  const [sessionMessages, setSessionMessages] = useState<Array<Record<string, unknown>>>([])
  const [sessionDiff, setSessionDiff] = useState<Array<Record<string, unknown>>>([])
  const [sessionTodos, setSessionTodos] = useState<Array<Record<string, unknown>>>([])
  const [sessionError, setSessionError] = useState("")
  const [isLoadingSessionDetails, setIsLoadingSessionDetails] = useState(false)
  const [isSessionActionLoading, setIsSessionActionLoading] = useState(false)
  const [forkTitle, setForkTitle] = useState("")
  const [forkAgent, setForkAgent] = useState("")
  const [summaryPrompt, setSummaryPrompt] = useState("")
  const [syncJobs, setSyncJobs] = useState<GitSyncJob[]>([])
  const [usageSummary, setUsageSummary] = useState<ProjectUsageSummary | null>(null)
  const [latestRunUsageEvents, setLatestRunUsageEvents] = useState<TokenUsageEvent[]>([])
  const [daemonPortInput, setDaemonPortInput] = useState("8010")
  const [pendingReferences, setPendingReferences] = useState<UploadedReference[]>([])
  const [isUploadingReference, setIsUploadingReference] = useState(false)
  const fileInputRef = useRef<HTMLInputElement | null>(null)

  const loadSessionDetails = useCallback(
    async (sessionId: string) => {
      if (!sessionId) return
      setIsLoadingSessionDetails(true)
      setSessionError("")
      try {
        const [sessionPayload, messagesPayload, diffPayload, todosPayload] = await Promise.all([
          api.session(projectId, sessionId),
          api.sessionMessages(projectId, sessionId),
          api.sessionDiff(projectId, sessionId),
          api.sessionTodos(projectId, sessionId),
        ])
        setSelectedSession(sessionPayload)
        setSessionMessages(messagesPayload)
        setSessionDiff(diffPayload)
        setSessionTodos(todosPayload)
      } catch (loadError) {
        setSessionError(loadError instanceof Error ? loadError.message : "Unable to load session details")
      } finally {
        setIsLoadingSessionDetails(false)
      }
    },
    [projectId],
  )

  const load = useCallback(async () => {
    const [projectPayload, taskPayload, runPayload] = await Promise.all([
      api.project(projectId),
      api.tasks(projectId),
      api.runs(projectId),
    ])
    const [syncJobsPayload, usageSummaryPayload] = await Promise.all([api.syncJobs(projectId), api.usageSummary(projectId)])
    setProject(projectPayload)
    setTasks(taskPayload)
    setRuns(runPayload)
    setSyncJobs(syncJobsPayload)
    setUsageSummary(usageSummaryPayload)
    setDaemonPortInput(String(projectPayload.allocated_port ?? 8010))

    if (!projectPayload.allocated_port) {
      setSessions([])
      setSessionStatus({})
      setSelectedSessionId("")
      setSelectedSession(null)
      setSessionMessages([])
      setSessionDiff([])
      setSessionTodos([])
      setSessionError("Start daemon to enable OpenCode sessions for this workspace.")
      return
    }

    try {
      const [sessionsPayload, sessionStatusPayload] = await Promise.all([api.sessions(projectId), api.sessionsStatus(projectId)])
      const normalizedSessions = normalizeSessions(sessionsPayload)
      setSessions(normalizedSessions)
      setSessionStatus(sessionStatusPayload)

      const nextSessionId = normalizedSessions.some((session) => session.id === selectedSessionId)
        ? selectedSessionId
        : (normalizedSessions[0]?.id ?? "")
      setSelectedSessionId(nextSessionId)

      if (!nextSessionId) {
        setSelectedSession(null)
        setSessionMessages([])
        setSessionDiff([])
        setSessionTodos([])
      } else {
        await loadSessionDetails(nextSessionId)
      }
      setSessionError("")
    } catch (sessionLoadError) {
      setSessions([])
      setSessionStatus({})
      setSelectedSessionId("")
      setSelectedSession(null)
      setSessionMessages([])
      setSessionDiff([])
      setSessionTodos([])
      setSessionError(sessionLoadError instanceof Error ? sessionLoadError.message : "Unable to load OpenCode sessions")
    }

    if (runPayload[0]?.id) {
      try {
        const usageEventsPayload = await api.runUsageEvents(projectId, runPayload[0].id)
        setLatestRunUsageEvents(usageEventsPayload)
      } catch {
        setLatestRunUsageEvents([])
      }
    } else {
      setLatestRunUsageEvents([])
    }
  }, [loadSessionDetails, projectId, selectedSessionId])

  useEffect(() => {
    queueMicrotask(() => {
      load().catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load project"))
    })
    const socket = openProjectSocket(projectId, (event) => {
      setEvents((current) => [event, ...current].slice(0, 20))
      if (
        event.kind === "task_status_changed" ||
        event.kind === "approval_requested" ||
        event.kind === "lock_status_changed" ||
        event.kind === "daemon_recovered" ||
        event.kind === "orchestration_run_updated"
      ) {
        load().catch(() => undefined)
      }
    })
    return () => socket.close()
  }, [load, projectId])

  const tasksByStatus = useMemo(() => {
    return columns.reduce<Record<TaskStatus, TaskQueue[]>>((accumulator, column) => {
      accumulator[column.status] = tasks.filter((task) => task.status === column.status)
      return accumulator
    }, {} as Record<TaskStatus, TaskQueue[]>)
  }, [tasks])

  const latestRun = runs[0] ?? null
  const latestSyncJob = syncJobs[0] ?? null
  const activeSessionCount = useMemo(
    () => Object.values(sessionStatus).filter((entry) => (entry.type ?? "idle") !== "idle").length,
    [sessionStatus],
  )

  async function execute(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    if (!prompt.trim()) return
    setError("")
    setIsExecuting(true)
    try {
      const referenceContext = pendingReferences.length
        ? `\n\nReference files available in doc-references/ for this run:\n${pendingReferences.map((reference) => `- ${reference.relative_path}`).join("\n")}`
        : ""
      const response = await api.executePrompt(projectId, `${prompt}${referenceContext}`)
      setPrompt("")
      setPendingReferences([])
      await load()
      if (response.mode === "queued") pushToast(`Run #${response.run_id} queued in background.`, "success")
      if (response.mode === "queued_for_approval") pushToast(`Run #${response.run_id} is waiting for approval.`, "info")
    } catch (executeError) {
      setError(executeError instanceof Error ? executeError.message : "Unable to execute prompt")
    } finally {
      setIsExecuting(false)
    }
  }

  async function stopDaemon() {
    setError("")
    setIsChangingDaemon(true)
    try {
      await api.stopDaemon(projectId)
      await load()
      pushToast("Daemon stopped.", "success")
    } catch (stopError) {
      pushToast("Unable to stop daemon.", "error")
      setError(stopError instanceof Error ? stopError.message : "Unable to stop daemon")
    } finally {
      setIsChangingDaemon(false)
    }
  }

  async function startDaemon() {
    if (!project) return
    const parsedPort = Number.parseInt(daemonPortInput, 10)
    if (Number.isNaN(parsedPort) || parsedPort <= 0) {
      setError("Provide a valid daemon port.")
      return
    }

    setError("")
    setIsChangingDaemon(true)
    try {
      await api.startDaemon(project.id, parsedPort)
      await load()
      pushToast("Daemon started.", "success")
    } catch (startError) {
      pushToast("Unable to start daemon. Ensure you hold the lock.", "error")
      setError(startError instanceof Error ? startError.message : "Unable to start daemon")
    } finally {
      setIsChangingDaemon(false)
    }
  }

  async function restartDaemon() {
    setError("")
    setIsChangingDaemon(true)
    try {
      await api.restartDaemon(projectId)
      await load()
      pushToast("Daemon restarted.", "success")
    } catch (restartError) {
      pushToast("Unable to restart daemon. Ensure you hold the lock.", "error")
      setError(restartError instanceof Error ? restartError.message : "Unable to restart daemon")
    } finally {
      setIsChangingDaemon(false)
    }
  }

  async function approveTask(taskId: number) {
    setError("")
    try {
      await api.approveTask(projectId, taskId)
      await load()
      pushToast(`Approved task #${taskId}.`, "success")
    } catch (approvalError) {
      pushToast("Unable to approve task.", "error")
      setError(approvalError instanceof Error ? approvalError.message : "Unable to approve task")
    }
  }

  async function rejectTask(task: TaskQueue, reason: string) {
    setError("")
    setRejectingTaskId(task.id)
    try {
      await api.rejectTask(projectId, task.id, reason)
      await load()
      pushToast(`Rejected task #${task.id}.`, "info")
      setRejectingTask(null)
    } catch (rejectionError) {
      pushToast("Unable to reject task.", "error")
      setError(rejectionError instanceof Error ? rejectionError.message : "Unable to reject task")
    } finally {
      setRejectingTaskId(null)
    }
  }

  async function acquireLock() {
    if (!project) return
    setError("")
    try {
      await api.acquireLock(project.id)
      await load()
      pushToast(`Lock acquired for ${project.name}.`, "success")
    } catch (acquireError) {
      pushToast("Unable to acquire lock. It may be held by another user.", "error")
      setError(acquireError instanceof Error ? acquireError.message : "Unable to acquire lock")
    }
  }

  async function releaseLock() {
    if (!project) return
    setError("")
    try {
      await api.releaseLock(project.id)
      await load()
      pushToast(`Lock released for ${project.name}.`, "success")
    } catch (releaseError) {
      pushToast("Unable to release lock.", "error")
      setError(releaseError instanceof Error ? releaseError.message : "Unable to release lock")
    }
  }

  async function interruptSession() {
    if (!selectedSessionId) return
    setIsSessionActionLoading(true)
    setSessionError("")
    try {
      await api.interruptSession(projectId, selectedSessionId)
      await load()
      await loadSessionDetails(selectedSessionId)
      pushToast(`Interrupted session ${selectedSessionId}.`, "success")
    } catch (interruptError) {
      setSessionError(interruptError instanceof Error ? interruptError.message : "Unable to interrupt session")
      pushToast("Unable to interrupt session.", "error")
    } finally {
      setIsSessionActionLoading(false)
    }
  }

  async function forkSession() {
    if (!selectedSessionId) return
    setIsSessionActionLoading(true)
    setSessionError("")
    try {
      await api.forkSession(projectId, selectedSessionId, { title: forkTitle, agent: forkAgent })
      setForkTitle("")
      setForkAgent("")
      await load()
      pushToast(`Forked session ${selectedSessionId}.`, "success")
    } catch (forkError) {
      setSessionError(forkError instanceof Error ? forkError.message : "Unable to fork session")
      pushToast("Unable to fork session.", "error")
    } finally {
      setIsSessionActionLoading(false)
    }
  }

  async function summarizeSession() {
    if (!selectedSessionId) return
    setIsSessionActionLoading(true)
    setSessionError("")
    try {
      await api.summarizeSession(projectId, selectedSessionId, summaryPrompt)
      setSummaryPrompt("")
      await loadSessionDetails(selectedSessionId)
      pushToast(`Requested summary for session ${selectedSessionId}.`, "success")
    } catch (summarizeError) {
      setSessionError(summarizeError instanceof Error ? summarizeError.message : "Unable to summarize session")
      pushToast("Unable to summarize session.", "error")
    } finally {
      setIsSessionActionLoading(false)
    }
  }

  async function retryLatestSyncJob() {
    if (!latestSyncJob || !project) return
    setError("")
    try {
      await api.retrySyncJob(project.id, latestSyncJob.id)
      await load()
      pushToast(`Requeued sync job #${latestSyncJob.id}.`, "success")
    } catch (retryError) {
      pushToast("Unable to requeue sync job.", "error")
      setError(retryError instanceof Error ? retryError.message : "Unable to requeue sync job")
    }
  }

  async function selectSession(sessionId: string) {
    setSelectedSessionId(sessionId)
    await loadSessionDetails(sessionId)
  }

  async function uploadReferenceFiles(files: File[]) {
    if (!project || !files.length) return
    setIsUploadingReference(true)
    setError("")
    try {
      const uploaded = await Promise.all(files.map((file) => api.uploadReference(project.id, file)))
      setPendingReferences((current) => [...uploaded, ...current])
      pushToast(`Uploaded ${uploaded.length} reference file${uploaded.length === 1 ? "" : "s"}.`, "success")
    } catch (uploadError) {
      pushToast("Unable to upload reference file(s). Acquire lock first and retry.", "error")
      setError(uploadError instanceof Error ? uploadError.message : "Unable to upload reference files")
    } finally {
      setIsUploadingReference(false)
    }
  }

  async function handleReferenceFileSelection(event: ChangeEvent<HTMLInputElement>) {
    const target = event.currentTarget
    const fileList = target.files
    if (!fileList || fileList.length === 0) return
    await uploadReferenceFiles(Array.from(fileList))
    target.value = ""
  }

  async function handlePromptPaste(event: ClipboardEvent<HTMLTextAreaElement>) {
    const imageFiles: File[] = []
    for (const item of Array.from(event.clipboardData.items)) {
      if (!item.type.startsWith("image/")) continue
      const blob = item.getAsFile()
      if (!blob) continue
      const extension = blob.type.split("/")[1] || "png"
      imageFiles.push(new File([blob], `clipboard-${Date.now()}.${extension}`, { type: blob.type }))
    }

    if (!imageFiles.length) return
    event.preventDefault()
    await uploadReferenceFiles(imageFiles)
  }

  return (
    <div className="space-y-8">
      <header className="flex flex-col gap-4 xl:flex-row xl:items-end xl:justify-between">
        <div>
          <Link href="/dashboard" className="text-sm text-cyan-300 hover:text-cyan-200">
            ← Back to workspaces
          </Link>
          <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">{project?.name ?? "Workspace"}</h1>
          <p className="mt-2 max-w-3xl text-slate-400">{project?.absolute_path ?? "Loading project path…"}</p>
          <div className="mt-4 flex flex-wrap items-center gap-2 text-xs">
            <span className={`rounded-full border px-3 py-1 ${project?.is_locked ? "border-amber-300/30 bg-amber-300/10 text-amber-100" : "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"}`}>
              {project?.is_locked ? `Locked by ${project.locked_by_username ?? "unknown"}` : "Unlocked"}
            </span>
            <button
              onClick={acquireLock}
              className="rounded-full border border-emerald-300/30 px-3 py-1 text-emerald-100 hover:bg-emerald-300/10"
            >
              Acquire lock
            </button>
            <button
              onClick={releaseLock}
              className="rounded-full border border-slate-300/30 px-3 py-1 text-slate-100 hover:bg-slate-300/10"
            >
              Release lock
            </button>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-slate-300">
              Port: {project?.allocated_port ?? "Not assigned"}
            </span>
            <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-slate-300">
              PID: {project?.daemon_pid ?? "Not running"}
            </span>
            <button
              onClick={restartDaemon}
              disabled={isChangingDaemon}
              className="rounded-full border border-cyan-300/30 px-3 py-1 text-cyan-100 hover:bg-cyan-300/10 disabled:opacity-60"
            >
              Restart daemon
            </button>
            <button
              onClick={stopDaemon}
              disabled={isChangingDaemon || !project?.daemon_pid}
              className="rounded-full border border-red-300/30 px-3 py-1 text-red-100 hover:bg-red-300/10 disabled:opacity-60"
            >
              Stop daemon
            </button>
            {!project?.daemon_pid ? (
              <div className="flex items-center gap-2">
                <input
                  value={daemonPortInput}
                  onChange={(event) => setDaemonPortInput(event.target.value)}
                  className="w-28 rounded-full border border-white/10 bg-slate-950/70 px-3 py-1 text-xs text-white outline-none"
                  aria-label="Daemon port"
                />
                <button
                  onClick={startDaemon}
                  disabled={isChangingDaemon}
                  className="rounded-full border border-cyan-300/30 px-3 py-1 text-cyan-100 hover:bg-cyan-300/10 disabled:opacity-60"
                >
                  Start daemon
                </button>
              </div>
            ) : null}
          </div>
        </div>
        <Link
          href={`/dashboard/projects/${projectId}/audit`}
          className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10"
        >
          View audit logs
        </Link>
      </header>

      <form onSubmit={execute} className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl">
        <label htmlFor="prompt" className="text-sm font-medium text-slate-200">
          Dispatch multi-agent prompt
        </label>
        <textarea
          id="prompt"
          value={prompt}
          onChange={(event) => setPrompt(event.target.value)}
          onPaste={handlePromptPaste}
          rows={4}
          placeholder="Describe what Foundry-AI should build or modify…"
          className="mt-3 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none ring-cyan-300/30 focus:border-cyan-300 focus:ring-4"
        />
        <input
          ref={fileInputRef}
          type="file"
          multiple
          accept={ACCEPTED_REFERENCE_FILE_EXTENSIONS}
          onChange={handleReferenceFileSelection}
          className="hidden"
        />
        <div className="mt-3 rounded-2xl border border-white/10 bg-slate-950/60 p-3">
          <div className="flex flex-wrap items-center justify-between gap-2">
            <p className="text-xs text-slate-400">
              Upload references (.pdf, .md, .txt, images, code files). Files are saved to <span className="font-mono text-slate-300">doc-references/</span>.
            </p>
            <button
              type="button"
              onClick={() => fileInputRef.current?.click()}
              disabled={isUploadingReference}
              className="rounded-lg border border-violet-300/30 px-3 py-1.5 text-xs font-medium text-violet-100 hover:bg-violet-300/10 disabled:opacity-60"
            >
              {isUploadingReference ? "Uploading…" : "Upload files"}
            </button>
          </div>
          {pendingReferences.length ? (
            <div className="mt-3 flex flex-wrap gap-2">
              {pendingReferences.map((reference) => (
                <span key={`${reference.relative_path}-${reference.size_bytes}`} className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-slate-900/70 px-3 py-1 text-xs text-slate-200">
                  <span className="font-mono">{reference.relative_path}</span>
                  <button
                    type="button"
                    onClick={() => setPendingReferences((current) => current.filter((item) => item.relative_path !== reference.relative_path))}
                    className="text-slate-400 hover:text-red-200"
                    aria-label={`Remove ${reference.filename}`}
                  >
                    ✕
                  </button>
                </span>
              ))}
            </div>
          ) : (
            <p className="mt-2 text-xs text-slate-500">You can also paste an image directly from clipboard into the prompt box.</p>
          )}
        </div>
        <div className="mt-3 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-sm text-slate-400">
            Lock-aware execution queues a durable background run that continues through plan → supervisor → worker phases.
          </p>
          <button
            disabled={isExecuting}
            className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isExecuting ? "Dispatching…" : "Run orchestration"}
          </button>
        </div>
      </form>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">Latest orchestration run</h2>
            <p className="mt-1 text-sm text-slate-400">Background runs continue even after the browser disconnects.</p>
          </div>
          {latestRun ? <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">Run #{latestRun.id}</span> : null}
        </div>
        {latestRun ? (
          <div className="mt-4 space-y-3">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-cyan-100">{latestRun.status}</span>
              <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-slate-300">{latestRun.current_phase}</span>
              <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1 text-slate-300">{latestRun.completed_steps}/{latestRun.total_steps || 0} steps</span>
            </div>
            <div>
              <div className="mb-2 flex items-center justify-between text-xs text-slate-400">
                <span>Progress</span>
                <span>{latestRun.progress_percent}%</span>
              </div>
              <div className="h-3 overflow-hidden rounded-full bg-slate-900">
                <div className="h-full rounded-full bg-cyan-300 transition-all" style={{ width: `${latestRun.progress_percent}%` }} />
              </div>
            </div>
            <p className="text-sm text-slate-300">{latestRun.prompt}</p>
            {latestRun.stuck_recovery_count > 0 ? (
              <div className="rounded-xl border border-amber-300/20 bg-amber-300/10 px-4 py-3 text-sm text-amber-100">
                Recovery attempts: {latestRun.stuck_recovery_count}
                {latestRun.last_recovery_error ? <span className="mt-2 block text-amber-200/90">Last recovery error: {latestRun.last_recovery_error}</span> : null}
              </div>
            ) : null}
            {latestRun.last_error ? <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{latestRun.last_error}</p> : null}
          </div>
        ) : (
          <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">No orchestration runs yet.</p>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl">
        <div className="flex flex-wrap items-start justify-between gap-3">
          <div>
            <h2 className="text-lg font-semibold text-white">GitHub sync</h2>
            <p className="mt-1 text-sm text-slate-400">Dev-branch PR automation from completed runs.</p>
          </div>
          {latestSyncJob ? <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">Sync #{latestSyncJob.id}</span> : null}
        </div>
        {latestSyncJob ? (
          <div className="mt-3 space-y-2 text-sm text-slate-300">
            <div className="flex flex-wrap items-center gap-2 text-xs">
              <span className="rounded-full border border-cyan-300/30 bg-cyan-300/10 px-3 py-1 text-cyan-100">{latestSyncJob.status}</span>
              <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1">{latestSyncJob.feature_branch || "(pending branch)"}</span>
              <span className="rounded-full border border-white/10 bg-slate-950/60 px-3 py-1">base: {latestSyncJob.base_branch}</span>
            </div>
            {latestSyncJob.pr_url ? (
              <a href={latestSyncJob.pr_url} target="_blank" rel="noreferrer" className="text-cyan-300 hover:text-cyan-200">
                Open PR #{latestSyncJob.pr_number}
              </a>
            ) : null}
            {latestSyncJob.last_error ? <p className="rounded-xl bg-red-500/10 px-3 py-2 text-red-200">{latestSyncJob.last_error}</p> : null}
            {(latestSyncJob.status === "FAILED" || latestSyncJob.status === "SKIPPED") && project ? (
              <button
                onClick={retryLatestSyncJob}
                className="rounded-lg border border-cyan-300/30 px-3 py-1.5 text-xs font-medium text-cyan-100 hover:bg-cyan-300/10"
              >
                Retry sync
              </button>
            ) : null}
          </div>
        ) : (
          <p className="mt-3 rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">No sync jobs yet.</p>
        )}
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl">
        <h2 className="text-lg font-semibold text-white">Token usage</h2>
        {usageSummary ? (
          <div className="mt-3 grid gap-3 sm:grid-cols-4">
            <Metric label="Prompt" value={usageSummary.prompt_tokens} />
            <Metric label="Completion" value={usageSummary.completion_tokens} />
            <Metric label="Total" value={usageSummary.total_tokens} />
            <Metric label="Events" value={usageSummary.usage_event_count} />
          </div>
        ) : (
          <p className="mt-3 text-sm text-slate-500">No usage metrics yet.</p>
        )}
        <div className="mt-3 rounded-xl border border-white/10 bg-slate-950/70 p-3">
          <h3 className="text-xs font-semibold uppercase tracking-wide text-slate-400">Latest run usage events ({latestRunUsageEvents.length})</h3>
          <pre className="mt-2 max-h-64 overflow-auto rounded-lg bg-slate-950/80 p-2 text-[11px] text-slate-300">{JSON.stringify(latestRunUsageEvents, null, 2)}</pre>
        </div>
      </section>

      <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-4 shadow-xl">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div>
            <h2 className="text-lg font-semibold text-white">OpenCode sessions</h2>
            <p className="mt-1 text-sm text-slate-400">Inspect live sessions, messages, diffs, todos, and run controls.</p>
          </div>
          <span className="rounded-full border border-white/10 bg-white/[0.05] px-3 py-1 text-xs text-slate-300">
            {activeSessionCount} active · {sessions.length} total
          </span>
        </div>

        <div className="mt-4 grid gap-3 lg:grid-cols-[minmax(0,240px)_minmax(0,1fr)]">
          <div className="space-y-3">
            <select
              value={selectedSessionId}
              onChange={(event) => {
                selectSession(event.target.value).catch(() => undefined)
              }}
              className="w-full rounded-xl border border-white/10 bg-slate-950/80 px-3 py-2 text-sm text-white outline-none focus:border-cyan-300"
            >
              {!sessions.length ? <option value="">No sessions available</option> : null}
              {sessions.map((session) => (
                <option key={session.id} value={session.id}>
                  {session.title ?? session.id}
                </option>
              ))}
            </select>
            <button
              onClick={() => selectedSessionId && loadSessionDetails(selectedSessionId)}
              disabled={!selectedSessionId || isLoadingSessionDetails}
              className="w-full rounded-xl border border-slate-300/30 px-3 py-2 text-sm text-slate-100 hover:bg-slate-300/10 disabled:opacity-60"
            >
              Refresh session details
            </button>
            <button
              onClick={interruptSession}
              disabled={!selectedSessionId || isSessionActionLoading}
              className="w-full rounded-xl border border-red-300/30 px-3 py-2 text-sm text-red-100 hover:bg-red-300/10 disabled:opacity-60"
            >
              Interrupt session
            </button>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Fork session</p>
              <input
                value={forkTitle}
                onChange={(event) => setForkTitle(event.target.value)}
                placeholder="Fork title (optional)"
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300"
              />
              <input
                value={forkAgent}
                onChange={(event) => setForkAgent(event.target.value)}
                placeholder="Agent (optional)"
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300"
              />
              <button
                onClick={forkSession}
                disabled={!selectedSessionId || isSessionActionLoading}
                className="mt-2 w-full rounded-lg border border-cyan-300/30 px-3 py-2 text-xs font-medium text-cyan-100 hover:bg-cyan-300/10 disabled:opacity-60"
              >
                Create fork
              </button>
            </div>
            <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-3">
              <p className="text-xs font-semibold uppercase tracking-wide text-slate-400">Summarize session</p>
              <textarea
                value={summaryPrompt}
                onChange={(event) => setSummaryPrompt(event.target.value)}
                rows={3}
                placeholder="Optional summary prompt"
                className="mt-2 w-full rounded-lg border border-white/10 bg-slate-950/70 px-3 py-2 text-xs text-white outline-none focus:border-cyan-300"
              />
              <button
                onClick={summarizeSession}
                disabled={!selectedSessionId || isSessionActionLoading}
                className="mt-2 w-full rounded-lg border border-violet-300/30 px-3 py-2 text-xs font-medium text-violet-100 hover:bg-violet-300/10 disabled:opacity-60"
              >
                Request summary
              </button>
            </div>
          </div>

          <div className="space-y-3">
            {selectedSession ? (
              <pre className="overflow-auto rounded-xl bg-slate-950/80 p-3 text-xs text-slate-300">{JSON.stringify(selectedSession, null, 2)}</pre>
            ) : (
              <p className="rounded-xl border border-dashed border-white/10 p-4 text-sm text-slate-500">
                {isLoadingSessionDetails ? "Loading session details…" : "Select a session to inspect details."}
              </p>
            )}
            <div className="grid gap-3 xl:grid-cols-3">
              <section className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Messages ({sessionMessages.length})</h3>
                <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950/80 p-2 text-[11px] text-slate-300">{JSON.stringify(sessionMessages, null, 2)}</pre>
              </section>
              <section className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Diff ({sessionDiff.length})</h3>
                <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950/80 p-2 text-[11px] text-slate-300">{JSON.stringify(sessionDiff, null, 2)}</pre>
              </section>
              <section className="rounded-xl border border-white/10 bg-slate-950/70 p-3">
                <h3 className="mb-2 text-xs font-semibold uppercase tracking-wide text-slate-400">Todos ({sessionTodos.length})</h3>
                <pre className="max-h-72 overflow-auto rounded-lg bg-slate-950/80 p-2 text-[11px] text-slate-300">{JSON.stringify(sessionTodos, null, 2)}</pre>
              </section>
            </div>
            {sessionError ? <p className="rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{sessionError}</p> : null}
          </div>
        </div>
      </section>

      {error ? <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

      <div className="grid gap-4 xl:grid-cols-6">
        {columns.map((column) => (
          <section key={column.status} className="min-h-60 rounded-3xl border border-white/10 bg-white/[0.03] p-4">
            <div className={`mb-4 rounded-full border px-3 py-1 text-xs font-semibold ${column.tone}`}>{column.label}</div>
            <div className="space-y-3">
              {tasksByStatus[column.status]?.length ? (
                tasksByStatus[column.status].map((task) => (
                  <TaskCard key={task.id} task={task} onApprove={approveTask} onReject={setRejectingTask} />
                ))
              ) : (
                <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">No tasks</p>
              )}
            </div>
          </section>
        ))}
      </div>

      <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
        <h2 className="font-semibold text-white">Live events</h2>
        <div className="mt-3 space-y-2">
          {events.length ? (
            events.map((event, index) => (
              <pre key={`${event.kind}-${index}`} className="overflow-auto rounded-xl bg-slate-950/80 p-3 text-xs text-slate-300">
                {JSON.stringify(event, null, 2)}
              </pre>
            ))
          ) : (
            <p className="text-sm text-slate-500">No websocket events yet.</p>
          )}
        </div>
      </section>
      <RejectionModal
        isOpen={Boolean(rejectingTask)}
        title={rejectingTask ? `Reject task #${rejectingTask.id}` : "Reject task"}
        description="Provide supervisor-visible feedback explaining why this task cannot proceed."
        isSubmitting={Boolean(rejectingTask && rejectingTaskId === rejectingTask.id)}
        onCancel={() => setRejectingTask(null)}
        onConfirm={async (reason) => {
          if (rejectingTask) await rejectTask(rejectingTask, reason)
        }}
      />
    </div>
  )
}

function normalizeSessions(payload: OpenCodeSession[] | Record<string, OpenCodeSession>): OpenCodeSession[] {
  if (Array.isArray(payload)) {
    return payload
      .filter((item): item is OpenCodeSession => Boolean(item && typeof item === "object" && "id" in item))
      .map((item) => ({ ...item, id: String(item.id) }))
  }

  return Object.entries(payload ?? {}).map(([sessionId, value]) => ({
    ...(value ?? {}),
    id: String(value?.id ?? sessionId),
  }))
}

function TaskCard({
  task,
  onApprove,
  onReject,
}: {
  task: TaskQueue
  onApprove: (taskId: number) => void
  onReject: (task: TaskQueue) => void
}) {
  return (
    <article className="rounded-2xl border border-white/10 bg-slate-950/70 p-4">
      <div className="flex items-center justify-between gap-2">
        <span className="rounded-full bg-white/10 px-2 py-1 text-xs text-slate-300">#{task.sequence_order}</span>
        <span className="text-xs font-medium text-cyan-200">@{task.assigned_agent}</span>
      </div>
      <p className="mt-3 line-clamp-5 text-sm leading-6 text-slate-300">{task.instruction_payload}</p>
      {task.supervisor_feedback ? <p className="mt-3 rounded-xl bg-white/[0.05] p-3 text-xs text-slate-400">{task.supervisor_feedback}</p> : null}
      {task.status === "PENDING_APPROVAL" ? (
        <div className="mt-3 flex gap-2">
          <button
            onClick={() => onApprove(task.id)}
            className="rounded-lg border border-emerald-300/30 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-300/10"
          >
            Approve
          </button>
          <button
            onClick={() => onReject(task)}
            className="rounded-lg border border-red-300/30 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-300/10"
          >
            Reject
          </button>
        </div>
      ) : null}
    </article>
  )
}

function Metric({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-2xl bg-slate-950/60 p-3">
      <p className="text-xs text-slate-500">{label}</p>
      <p className="mt-1 font-mono text-slate-100">{value.toLocaleString()}</p>
    </div>
  )
}
