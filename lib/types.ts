export type User = {
  id: number
  username: string
  email: string
  first_name: string
  last_name: string
  is_staff: boolean
  is_superuser: boolean
}

export type LoginResponse = {
  access: string
  refresh: string
  user: User
}

export type WorkspaceMode = "STARTER" | "ACTIVE_CLONE" | "REFERENCE_CLONE" | "CUSTOM"

export type StarterTemplate =
  | "FULLSTACK"
  | "FRONTEND"
  | "BACKEND"
  | "MOBILE_BACKEND"
  | "DESKTOP_BACKEND"

export type ProjectSetupStatus = "READY" | "DRAFT"

export type WorkspaceTargetRole =
  | "FRONTEND"
  | "BACKEND"
  | "MOBILE"
  | "DESKTOP"
  | "SHARED"
  | "INFRA"
  | "DOCS"
  | "REFERENCE"
  | "CUSTOM"

export type WorkspaceTargetSourceType = "SCAFFOLD" | "EMPTY_DIR" | "GIT_CLONE"

export type WorkspaceTarget = {
  id: number
  name: string
  relative_path: string
  absolute_path: string
  role: WorkspaceTargetRole
  source_type: WorkspaceTargetSourceType
  remote_url: string
  default_branch: string
  is_primary: boolean
  is_editable: boolean
  created_at: string
  updated_at: string
}

export type Project = {
  id: number
  owner: number | null
  owner_username?: string | null
  path_owner_username: string
  name: string
  absolute_path: string
  runtime_path: string
  host_path: string | null
  storage_mode: string
  workspace_mode: WorkspaceMode
  starter_template: StarterTemplate | ""
  setup_status: ProjectSetupStatus
  bootstrap_enabled: boolean
  allocated_port: number | null
  is_locked: boolean
  locked_by: number | null
  locked_by_username?: string | null
  daemon_pid: number | null
  created_at: string
  updated_at: string
  targets: WorkspaceTarget[]
}

export type WorkspaceTargetInput = {
  name: string
  role: WorkspaceTargetRole
  source_type: WorkspaceTargetSourceType
  relative_path?: string
  remote_url?: string
  default_branch?: string
  is_primary?: boolean
  is_editable?: boolean
}

export type ProvisionProjectPayload = {
  name: string
  workspace_mode?: WorkspaceMode
  starter_template?: StarterTemplate
  bootstrap_enabled?: boolean
  clone_remote_url?: string
  clone_branch?: string
  clone_target_name?: string
  clone_target_role?: WorkspaceTargetRole
  targets?: WorkspaceTargetInput[]
}

export type TaskStatus =
  | "PENDING_APPROVAL"
  | "QUEUED"
  | "RUNNING"
  | "VERIFYING"
  | "COMPLETED"
  | "FAILED"

export type TaskQueue = {
  id: number
  project: number
  run: number | null
  user: number | null
  assigned_agent: string
  instruction_payload: string
  sequence_order: number
  status: TaskStatus
  supervisor_feedback: string
  created_at: string
  updated_at: string
}

export type OrchestrationRunStatus =
  | "PENDING_APPROVAL"
  | "QUEUED"
  | "PLANNING"
  | "BREAKING_DOWN"
  | "PLAN_READY"
  | "AWAITING_PLAN_APPROVAL"
  | "RUNNING"
  | "VERIFYING"
  | "COMPLETED"
  | "FAILED"
  | "CANCELLED"

export type OrchestrationApprovalScope = "NONE" | "LOCK" | "PLAN"
export type OrchestrationComplexityLevel = "SIMPLE" | "COMPLEX"

export type OrchestrationPlanStepStatus = "DRAFT" | "APPROVED" | "REPLACED"

export type OrchestrationPlanStep = {
  id: number
  run: number
  sequence_order: number
  assigned_agent: string
  instruction_payload: string
  status: OrchestrationPlanStepStatus
  planner_notes: string
  created_at: string
  updated_at: string
}

export type OrchestrationStep = {
  id: number
  run: number
  task: number | null
  sequence_order: number
  assigned_agent: string
  instruction_payload: string
  status: TaskStatus
  attempt_count: number
  worker_session_id: string
  generated_diff: string
  supervisor_feedback: string
  created_at: string
  updated_at: string
}

export type OrchestrationRun = {
  id: number
  project: number
  user: number | null
  user_username: string | null
  prompt: string
  approval_scope: OrchestrationApprovalScope
  complexity_level: OrchestrationComplexityLevel
  plan_requires_approval: boolean
  status: OrchestrationRunStatus
  current_phase: string
  progress_percent: number
  total_steps: number
  completed_steps: number
  failed_steps: number
  celery_task_id: string
  plan_session_id: string
  supervisor_session_id: string
  active_session_id: string
  blueprint: string
  last_error: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  stuck_recovery_count: number
  last_recovery_at: string | null
  last_recovery_error: string
  plan_approved_at: string | null
  started_at: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
  plan_steps: OrchestrationPlanStep[]
  steps: OrchestrationStep[]
}

export type OrchestrationRunActivity = {
  id: number
  run: number
  step: number | null
  task: number | null
  kind: string
  level: "INFO" | "WARNING" | "ERROR"
  session_id: string
  attempt_count: number
  message: string
  payload: Record<string, unknown>
  created_at: string
}

export type OrchestrationArtifact = {
  id: number
  run: number
  step: number | null
  task: number | null
  artifact_type: string
  session_id: string
  label: string
  content: string
  payload: Record<string, unknown>
  created_at: string
}

export type RunPlanResponse = {
  run_id: number
  status: OrchestrationRunStatus
  approval_scope: OrchestrationApprovalScope
  complexity_level: OrchestrationComplexityLevel
  plan_requires_approval: boolean
  plan_approved_at: string | null
  steps: OrchestrationPlanStep[]
}

export type AuditLog = {
  id: number
  project: number
  user: number
  timestamp: string
  original_prompt: string
  generated_diff: string
}

export type WorkspaceEvent = {
  kind:
    | "lock_status_changed"
    | "task_status_changed"
    | "approval_requested"
    | "daemon_recovered"
    | "orchestration_run_updated"
    | "github_sync_updated"
    | "notification_created"
  project_id: number
  task_id?: number
  run_id?: number
  status?: TaskStatus | OrchestrationRunStatus
  current_phase?: string
  progress_percent?: number
  total_steps?: number
  completed_steps?: number
  failed_steps?: number
  last_error?: string
  prompt_tokens?: number
  completion_tokens?: number
  total_tokens?: number
  stuck_recovery_count?: number
  last_recovery_error?: string
  assigned_agent?: string
  sequence_order?: number
  supervisor_feedback?: string
  is_locked?: boolean
  locked_by?: string | null
  requested_by?: string
  old_pid?: number | null
  new_pid?: number
  allocated_port?: number
  sync_job_id?: number
  sync_status?: GitSyncStatus
  feature_branch?: string
  base_branch?: string
  pr_number?: number
  pr_url?: string
  notification_id?: number
  notification_kind?: string
  title?: string
  message?: string
}

export type PendingApprovalItem = {
  id: number
  project: number
  project_name: string
  requested_by: string
  run: number | null
  instruction_payload: string
  sequence_order: number
  status: TaskStatus
  created_at: string
}

export type ExecuteResponse = {
  mode: "queued_for_approval" | "queued"
  task_id?: number
  run_id?: number
  status?: TaskStatus
  progress_percent?: number
}

export type UploadedReference = {
  filename: string
  relative_path: string
  absolute_path: string
  size_bytes: number
  content_type: string
}

export type OpenCodeSession = {
  id: string
  title?: string
  agent?: string
  created_at?: string
  updated_at?: string
  [key: string]: unknown
}

export type OpenCodeSessionStatusMap = Record<string, { type?: string; [key: string]: unknown }>

export type OpenCodeSessionActiveResponse = {
  sessions: OpenCodeSession[] | Record<string, OpenCodeSession>
  status: OpenCodeSessionStatusMap
}

export type GitSyncStatus = "QUEUED" | "RUNNING" | "COMPLETED" | "FAILED" | "SKIPPED"

export type GitSyncJob = {
  id: number
  project: number
  run: number | null
  user: number | null
  user_username: string | null
  status: GitSyncStatus
  base_branch: string
  feature_branch: string
  commit_sha: string
  pr_number: number | null
  pr_url: string
  attempts: number
  last_error: string
  started_at: string | null
  finished_at: string | null
  created_at: string
  updated_at: string
}

export type TokenUsageEvent = {
  id: number
  run: number
  session_id: string
  endpoint: string
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  raw_usage: Record<string, unknown>
  created_at: string
}

export type ProjectUsageSummary = {
  project_id: number
  run_count: number
  tracked_run_count: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  usage_event_count: number
}

export type UserNotification = {
  id: number
  user: number
  project: number | null
  project_name: string | null
  run: number | null
  kind: string
  title: string
  message: string
  payload: Record<string, unknown>
  is_read: boolean
  read_at: string | null
  created_at: string
  updated_at: string
}

export type NotificationInboxResponse = {
  unread_count: number
  items: UserNotification[]
}

export type OperationsSummary = {
  project_count: number
  locked_project_count: number
  active_daemon_count: number
  run_count: number
  active_run_count: number
  failed_run_count: number
  sync_job_count: number
  failed_sync_job_count: number
  unread_notification_count: number
  prompt_tokens: number
  completion_tokens: number
  total_tokens: number
  usage_event_count: number
}

export type OperationsDashboard = {
  summary: OperationsSummary
  run_status_counts: Partial<Record<OrchestrationRunStatus, number>>
  sync_status_counts: Partial<Record<GitSyncStatus, number>>
  projects: Project[]
  recent_runs: OrchestrationRun[]
  recent_sync_jobs: GitSyncJob[]
  recent_notifications: UserNotification[]
}
