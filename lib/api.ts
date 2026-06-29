import { clearTokens, getAccessToken, getRefreshToken, setAccessToken, setTokens } from "./token-storage"
import type {
  AuditLog,
  ExecuteResponse,
  GitSyncJob,
  LoginResponse,
  NotificationInboxResponse,
  OpenCodeSession,
  OpenCodeSessionActiveResponse,
  OpenCodeSessionStatusMap,
  OperationsDashboard,
  OrchestrationRun,
  PendingApprovalItem,
  ProjectUsageSummary,
  Project,
  ProvisionProjectPayload,
  TaskQueue,
  TokenUsageEvent,
  UploadedReference,
  User,
} from "./types"

export const API_BASE_URL = process.env.NEXT_PUBLIC_API_BASE_URL ?? "http://127.0.0.1:8000/api"
export const WS_BASE_URL = process.env.NEXT_PUBLIC_WS_BASE_URL ?? "ws://127.0.0.1:8000"

type RequestOptions = RequestInit & {
  authenticated?: boolean
  retryOn401?: boolean
}

export class ApiError extends Error {
  status: number

  constructor(message: string, status: number) {
    super(message)
    this.name = "ApiError"
    this.status = status
  }
}

let refreshPromise: Promise<string | null> | null = null

export async function refreshAccessToken(): Promise<string | null> {
  if (refreshPromise) return refreshPromise

  refreshPromise = (async () => {
    const refresh = getRefreshToken()
    if (!refresh) return null

    const response = await fetch(`${API_BASE_URL}/auth/token/refresh/`, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({ refresh }),
    })

    if (!response.ok) {
      clearTokens()
      return null
    }

    const payload = (await response.json()) as { access?: string; refresh?: string }
    if (!payload.access) {
      clearTokens()
      return null
    }

    if (payload.refresh) setTokens(payload.access, payload.refresh)
    else setAccessToken(payload.access)

    return payload.access
  })()

  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

async function request<T>(path: string, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  headers.set("Content-Type", "application/json")

  if (options.authenticated !== false) {
    const token = getAccessToken()
    if (token) headers.set("Authorization", `Bearer ${token}`)
  }

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    headers,
  })

  if (response.status === 401 && options.authenticated !== false && options.retryOn401 !== false) {
    const refreshedToken = await refreshAccessToken()
    if (refreshedToken) {
      const retryHeaders = new Headers(options.headers)
      retryHeaders.set("Content-Type", "application/json")
      retryHeaders.set("Authorization", `Bearer ${refreshedToken}`)
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        headers: retryHeaders,
      })
    }
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const payload = await response.json()
      message = payload.detail ?? JSON.stringify(payload)
    } catch {
      // Keep fallback message.
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

async function requestFormData<T>(path: string, formData: FormData, options: RequestOptions = {}): Promise<T> {
  const headers = new Headers(options.headers)
  if (options.authenticated !== false) {
    const token = getAccessToken()
    if (token) headers.set("Authorization", `Bearer ${token}`)
  }

  let response = await fetch(`${API_BASE_URL}${path}`, {
    ...options,
    method: options.method ?? "POST",
    body: formData,
    headers,
  })

  if (response.status === 401 && options.authenticated !== false && options.retryOn401 !== false) {
    const refreshedToken = await refreshAccessToken()
    if (refreshedToken) {
      const retryHeaders = new Headers(options.headers)
      retryHeaders.set("Authorization", `Bearer ${refreshedToken}`)
      response = await fetch(`${API_BASE_URL}${path}`, {
        ...options,
        method: options.method ?? "POST",
        body: formData,
        headers: retryHeaders,
      })
    }
  }

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`
    try {
      const payload = await response.json()
      message = payload.detail ?? JSON.stringify(payload)
    } catch {
      // Keep fallback message.
    }
    throw new ApiError(message, response.status)
  }

  if (response.status === 204) return undefined as T
  return response.json() as Promise<T>
}

export const api = {
  login: (username: string, password: string) =>
    request<LoginResponse>("/auth/token/", {
      method: "POST",
      authenticated: false,
      body: JSON.stringify({ username, password }),
    }),
  logout: (refresh: string) =>
    request<{ detail: string }>("/auth/logout/", {
      method: "POST",
      body: JSON.stringify({ refresh }),
    }),
  me: () => request<User>("/auth/me/"),
  projects: () => request<Project[]>("/projects/"),
  operations: () => request<OperationsDashboard>("/projects/operations/"),
  project: (id: number) => request<Project>(`/projects/${id}/`),
  provisionProject: (payload: ProvisionProjectPayload) =>
    request<Project>("/projects/provision/", {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  startDaemon: (projectId: number, allocated_port: number) =>
    request<{ project_id: number; name: string; allocated_port: number; daemon_pid: number; message: string }>(
      `/projects/${projectId}/start-daemon/`,
      {
        method: "POST",
        body: JSON.stringify({ allocated_port }),
      },
    ),
  prepareWorkspace: (projectId: number) =>
    request<{ detail: string; project: Project }>(`/projects/${projectId}/prepare-workspace/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  acquireLock: (projectId: number, force = false) =>
    request<{ detail: string; project: Project }>(`/projects/${projectId}/lock-acquire/`, {
      method: "POST",
      body: JSON.stringify({ force }),
    }),
  releaseLock: (projectId: number) =>
    request<{ detail: string; project: Project }>(`/projects/${projectId}/lock-release/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  stopDaemon: (projectId: number) =>
    request<{ project_id: number; name: string; message: string }>(`/projects/${projectId}/stop-daemon/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  restartDaemon: (projectId: number, allocated_port?: number) =>
    request<{ project_id: number; name: string; allocated_port: number; daemon_pid: number; message: string }>(
      `/projects/${projectId}/restart-daemon/`,
      {
        method: "POST",
        body: JSON.stringify(allocated_port ? { allocated_port } : {}),
      },
    ),
  daemonStatus: (projectId: number) =>
    request<{ project_id: number; daemon_pid: number | null; allocated_port: number | null; running: boolean; health: { reachable: boolean; healthy: boolean; version?: string } }>(
      `/projects/${projectId}/daemon-status/`,
    ),
  executePrompt: (projectId: number, prompt: string) =>
    request<ExecuteResponse>(`/projects/${projectId}/execute/`, {
      method: "POST",
      body: JSON.stringify({ prompt }),
    }),
  uploadReference: (projectId: number, file: File) => {
    const payload = new FormData()
    payload.append("file", file, file.name)
    return requestFormData<UploadedReference>(`/projects/${projectId}/references/upload/`, payload, {
      method: "POST",
    })
  },
  runs: (projectId: number) => request<OrchestrationRun[]>(`/projects/${projectId}/runs/`),
  run: (projectId: number, runId: number) => request<OrchestrationRun>(`/projects/${projectId}/runs/${runId}/`),
  usageSummary: (projectId: number) => request<ProjectUsageSummary>(`/projects/${projectId}/usage-summary/`),
  runUsageEvents: (projectId: number, runId: number) =>
    request<TokenUsageEvent[]>(`/projects/${projectId}/runs/${runId}/usage-events/`),
  syncJobs: (projectId: number) => request<GitSyncJob[]>(`/projects/${projectId}/sync-jobs/`),
  retrySyncJob: (projectId: number, syncJobId: number) =>
    request<GitSyncJob>(`/projects/${projectId}/sync-jobs/${syncJobId}/retry/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  sessions: (projectId: number) => request<OpenCodeSession[] | Record<string, OpenCodeSession>>(`/projects/${projectId}/sessions/`),
  session: (projectId: number, sessionId: string) => request<OpenCodeSession>(`/projects/${projectId}/sessions/${sessionId}/`),
  sessionMessages: (projectId: number, sessionId: string) =>
    request<Array<Record<string, unknown>>>(`/projects/${projectId}/sessions/${sessionId}/messages/`),
  sessionDiff: (projectId: number, sessionId: string) =>
    request<Array<Record<string, unknown>>>(`/projects/${projectId}/sessions/${sessionId}/diff/`),
  sessionTodos: (projectId: number, sessionId: string) =>
    request<Array<Record<string, unknown>>>(`/projects/${projectId}/sessions/${sessionId}/todos/`),
  sessionsStatus: (projectId: number) => request<OpenCodeSessionStatusMap>(`/projects/${projectId}/sessions-status/`),
  activeSessions: (projectId: number) => request<OpenCodeSessionActiveResponse>(`/projects/${projectId}/sessions-active/`),
  interruptSession: (projectId: number, sessionId: string) =>
    request<Record<string, unknown>>(`/projects/${projectId}/sessions/${sessionId}/interrupt/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  forkSession: (projectId: number, sessionId: string, payload: { title?: string; agent?: string } = {}) =>
    request<OpenCodeSession>(`/projects/${projectId}/sessions/${sessionId}/fork/`, {
      method: "POST",
      body: JSON.stringify(payload),
    }),
  summarizeSession: (projectId: number, sessionId: string, prompt = "") =>
    request<Record<string, unknown>>(`/projects/${projectId}/sessions/${sessionId}/summarize/`, {
      method: "POST",
      body: JSON.stringify(prompt ? { prompt } : {}),
    }),
  tasks: (projectId: number) => request<TaskQueue[]>(`/projects/${projectId}/tasks/`),
  audit: (projectId: number) => request<AuditLog[]>(`/projects/${projectId}/audit/`),
  approvalInbox: () => request<PendingApprovalItem[]>("/projects/approval-inbox/"),
  approveTask: (projectId: number, task_id: number) =>
    request<{ mode: string; approved_task_id?: number; result?: unknown }>(`/projects/${projectId}/approve-task/`, {
      method: "POST",
      body: JSON.stringify({ task_id }),
    }),
  rejectTask: (projectId: number, task_id: number, reason?: string) =>
    request<{ mode: string; task_id: number; status: string; reason: string }>(`/projects/${projectId}/reject-task/`, {
      method: "POST",
      body: JSON.stringify({ task_id, reason }),
    }),
  notifications: () => request<NotificationInboxResponse>("/projects/notifications/"),
  markNotificationRead: (notificationId: number) =>
    request<{ id: number }>(`/projects/notifications/${notificationId}/mark-read/`, {
      method: "POST",
      body: JSON.stringify({}),
    }),
  markAllNotificationsRead: () =>
    request<{ updated: number }>("/projects/notifications/mark-all-read/", {
      method: "POST",
      body: JSON.stringify({}),
    }),
}
