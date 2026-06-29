"use client"

import { type Dispatch, type ReactNode, type SetStateAction, useMemo, useState } from "react"
import type {
  Project,
  ProvisionProjectPayload,
  StarterTemplate,
  WorkspaceMode,
  WorkspaceTargetInput,
  WorkspaceTargetRole,
  WorkspaceTargetSourceType,
} from "@/lib/types"

const workspaceModeOptions: Array<{ value: WorkspaceMode; label: string; description: string }> = [
  { value: "STARTER", label: "Starter workspace", description: "Guided scaffold for full-stack, backend, frontend, mobile, or desktop setups." },
  { value: "ACTIVE_CLONE", label: "Clone working repo", description: "Clone an existing repository as the main editable target." },
  { value: "REFERENCE_CLONE", label: "Clone reference repo", description: "Bring in a repository as read-only context for the agents." },
  { value: "CUSTOM", label: "Custom topology", description: "Define multiple targets, custom roles, and clone or empty-folder sources." },
]

const starterTemplateOptions: Array<{ value: StarterTemplate; label: string }> = [
  { value: "FULLSTACK", label: "Full-stack (frontend + backend + documents)" },
  { value: "FRONTEND", label: "Frontend + documents" },
  { value: "BACKEND", label: "Backend + documents" },
  { value: "MOBILE_BACKEND", label: "Mobile + backend + documents" },
  { value: "DESKTOP_BACKEND", label: "Desktop + backend + documents" },
]

const roleOptions: Array<{ value: WorkspaceTargetRole; label: string }> = [
  { value: "FRONTEND", label: "Frontend" },
  { value: "BACKEND", label: "Backend" },
  { value: "MOBILE", label: "Mobile" },
  { value: "DESKTOP", label: "Desktop" },
  { value: "SHARED", label: "Shared" },
  { value: "INFRA", label: "Infrastructure" },
  { value: "DOCS", label: "Documents" },
  { value: "REFERENCE", label: "Reference" },
  { value: "CUSTOM", label: "Custom" },
]

const sourceTypeOptions: Array<{ value: WorkspaceTargetSourceType; label: string }> = [
  { value: "EMPTY_DIR", label: "Empty directory" },
  { value: "SCAFFOLD", label: "Scaffolded directory" },
  { value: "GIT_CLONE", label: "Git clone" },
]

type TargetDraft = WorkspaceTargetInput & { id: string }

function createTargetDraft(): TargetDraft {
  return {
    id: crypto.randomUUID(),
    name: "",
    role: "CUSTOM",
    source_type: "EMPTY_DIR",
    relative_path: "",
    remote_url: "",
    default_branch: "",
    is_primary: false,
    is_editable: true,
  }
}

function modeLabel(project: Project) {
  return workspaceModeOptions.find((option) => option.value === project.workspace_mode)?.label ?? project.workspace_mode
}

type ProjectProvisionerProps = {
  onProvision: (payload: ProvisionProjectPayload) => Promise<void>
  isSubmitting: boolean
}

export function ProjectProvisioner({ onProvision, isSubmitting }: ProjectProvisionerProps) {
  const [name, setName] = useState("")
  const [workspaceMode, setWorkspaceMode] = useState<WorkspaceMode>("STARTER")
  const [starterTemplate, setStarterTemplate] = useState<StarterTemplate>("FULLSTACK")
  const [bootstrapEnabled, setBootstrapEnabled] = useState(false)
  const [cloneRemoteUrl, setCloneRemoteUrl] = useState("")
  const [cloneBranch, setCloneBranch] = useState("")
  const [cloneTargetName, setCloneTargetName] = useState("")
  const [cloneTargetRole, setCloneTargetRole] = useState<WorkspaceTargetRole>("CUSTOM")
  const [targets, setTargets] = useState<TargetDraft[]>([createTargetDraft()])

  const selectedMode = useMemo(
    () => workspaceModeOptions.find((option) => option.value === workspaceMode),
    [workspaceMode],
  )

  async function submit() {
    const payload: ProvisionProjectPayload = {
      name,
      workspace_mode: workspaceMode,
      bootstrap_enabled: bootstrapEnabled,
    }

    if (workspaceMode === "STARTER") {
      payload.starter_template = starterTemplate
    }

    if (workspaceMode === "ACTIVE_CLONE" || workspaceMode === "REFERENCE_CLONE") {
      payload.clone_remote_url = cloneRemoteUrl
      payload.clone_branch = cloneBranch
      payload.clone_target_name = cloneTargetName
      payload.clone_target_role = cloneTargetRole
    }

    if (workspaceMode === "CUSTOM") {
      payload.targets = targets.map((target) => ({
        name: target.name,
        role: target.role,
        source_type: target.source_type,
        relative_path: target.relative_path,
        remote_url: target.remote_url,
        default_branch: target.default_branch,
        is_primary: target.is_primary,
        is_editable: target.is_editable,
      }))
    }

    await onProvision(payload)
    setName("")
    setWorkspaceMode("STARTER")
    setStarterTemplate("FULLSTACK")
    setBootstrapEnabled(false)
    setCloneRemoteUrl("")
    setCloneBranch("")
    setCloneTargetName("")
    setCloneTargetRole("CUSTOM")
    setTargets([createTargetDraft()])
  }

  return (
    <section className="rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-slate-950/20">
      <div className="flex flex-col gap-3 lg:flex-row lg:items-end lg:justify-between">
        <div>
          <p className="text-sm font-medium text-cyan-300">Provision workspace</p>
          <h2 className="mt-2 text-2xl font-semibold text-white">Create a new managed topology</h2>
          <p className="mt-2 max-w-3xl text-sm text-slate-400">
            Choose a starter, clone a working repo, attach a reference repo, or define a custom multi-target workspace.
          </p>
        </div>
        <label className="flex items-center gap-3 rounded-2xl border border-white/10 bg-slate-950/60 px-4 py-3 text-sm text-slate-200">
          <input
            type="checkbox"
            checked={bootstrapEnabled}
            onChange={(event) => setBootstrapEnabled(event.target.checked)}
            className="h-4 w-4 rounded border-white/20 bg-slate-900"
          />
          Enable bootstrap setup mode
        </label>
      </div>

      <div className="mt-5 grid gap-3 lg:grid-cols-4">
        {workspaceModeOptions.map((option) => {
          const active = option.value === workspaceMode
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => setWorkspaceMode(option.value)}
              className={`rounded-2xl border p-4 text-left transition ${
                active
                  ? "border-cyan-300/40 bg-cyan-300/10 text-white"
                  : "border-white/10 bg-slate-950/60 text-slate-300 hover:border-white/20 hover:bg-white/[0.05]"
              }`}
            >
              <p className="text-sm font-semibold">{option.label}</p>
              <p className="mt-2 text-xs leading-5 text-slate-400">{option.description}</p>
            </button>
          )
        })}
      </div>

      <div className="mt-5 grid gap-4 lg:grid-cols-[1.4fr_1fr]">
        <div>
          <label className="text-sm font-medium text-slate-200">Workspace name</label>
          <input
            value={name}
            onChange={(event) => setName(event.target.value)}
            placeholder="workspace-name"
            className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none ring-cyan-300/30 focus:border-cyan-300 focus:ring-4"
          />
        </div>
        <div className="rounded-2xl border border-white/10 bg-slate-950/60 p-4 text-sm text-slate-300">
          <p className="font-medium text-white">Selected mode</p>
          <p className="mt-2 text-sm">{selectedMode?.label}</p>
          <p className="mt-2 text-xs leading-5 text-slate-400">{selectedMode?.description}</p>
        </div>
      </div>

      {workspaceMode === "STARTER" ? (
        <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-3">
          {starterTemplateOptions.map((option) => {
            const active = option.value === starterTemplate
            return (
              <button
                key={option.value}
                type="button"
                onClick={() => setStarterTemplate(option.value)}
                className={`rounded-2xl border px-4 py-3 text-left text-sm transition ${
                  active
                    ? "border-emerald-300/40 bg-emerald-300/10 text-white"
                    : "border-white/10 bg-slate-950/60 text-slate-300 hover:border-white/20"
                }`}
              >
                {option.label}
              </button>
            )
          })}
        </div>
      ) : null}

      {workspaceMode === "ACTIVE_CLONE" || workspaceMode === "REFERENCE_CLONE" ? (
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <Field label="Repository URL">
            <input
              value={cloneRemoteUrl}
              onChange={(event) => setCloneRemoteUrl(event.target.value)}
              placeholder="https://github.com/org/repo.git"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none"
            />
          </Field>
          <Field label="Default branch (optional)">
            <input
              value={cloneBranch}
              onChange={(event) => setCloneBranch(event.target.value)}
              placeholder="dev"
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none"
            />
          </Field>
          <Field label="Target name (optional)">
            <input
              value={cloneTargetName}
              onChange={(event) => setCloneTargetName(event.target.value)}
              placeholder={workspaceMode === "ACTIVE_CLONE" ? "web-app" : "ui-reference"}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none"
            />
          </Field>
          <Field label="Target role">
            <select
              value={cloneTargetRole}
              onChange={(event) => setCloneTargetRole(event.target.value as WorkspaceTargetRole)}
              className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950/80 px-4 py-3 text-sm text-white outline-none"
            >
              {roleOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </select>
          </Field>
        </div>
      ) : null}

      {workspaceMode === "CUSTOM" ? (
        <div className="mt-5 space-y-4">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-sm font-medium text-white">Custom targets</p>
              <p className="mt-1 text-xs text-slate-400">Model multiple repos or folders in one workspace. Mark one editable target as primary.</p>
            </div>
            <button
              type="button"
              onClick={() => setTargets((current) => [...current, createTargetDraft()])}
              className="rounded-xl border border-cyan-300/30 px-3 py-2 text-sm font-medium text-cyan-100 hover:bg-cyan-300/10"
            >
              Add target
            </button>
          </div>
          {targets.map((target, index) => (
            <div key={target.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex items-center justify-between gap-3">
                <p className="text-sm font-semibold text-white">Target #{index + 1}</p>
                {targets.length > 1 ? (
                  <button
                    type="button"
                    onClick={() => setTargets((current) => current.filter((item) => item.id !== target.id))}
                    className="rounded-lg border border-red-300/30 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-300/10"
                  >
                    Remove
                  </button>
                ) : null}
              </div>
              <div className="mt-4 grid gap-4 xl:grid-cols-2">
                <Field label="Name">
                  <input
                    value={target.name}
                    onChange={(event) => updateTarget(setTargets, target.id, { name: event.target.value })}
                    placeholder="frontend"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                  />
                </Field>
                <Field label="Relative path (optional)">
                  <input
                    value={target.relative_path ?? ""}
                    onChange={(event) => updateTarget(setTargets, target.id, { relative_path: event.target.value })}
                    placeholder="apps/frontend"
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                  />
                </Field>
                <Field label="Role">
                  <select
                    value={target.role}
                    onChange={(event) => updateTarget(setTargets, target.id, { role: event.target.value as WorkspaceTargetRole })}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                  >
                    {roleOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                <Field label="Source type">
                  <select
                    value={target.source_type}
                    onChange={(event) => updateTarget(setTargets, target.id, { source_type: event.target.value as WorkspaceTargetSourceType })}
                    className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                  >
                    {sourceTypeOptions.map((option) => (
                      <option key={option.value} value={option.value}>
                        {option.label}
                      </option>
                    ))}
                  </select>
                </Field>
                {target.source_type === "GIT_CLONE" ? (
                  <>
                    <Field label="Repository URL">
                      <input
                        value={target.remote_url ?? ""}
                        onChange={(event) => updateTarget(setTargets, target.id, { remote_url: event.target.value })}
                        placeholder="https://github.com/org/repo.git"
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                      />
                    </Field>
                    <Field label="Branch (optional)">
                      <input
                        value={target.default_branch ?? ""}
                        onChange={(event) => updateTarget(setTargets, target.id, { default_branch: event.target.value })}
                        placeholder="dev"
                        className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-900 px-4 py-3 text-sm text-white outline-none"
                      />
                    </Field>
                  </>
                ) : null}
              </div>
              <div className="mt-4 flex flex-wrap gap-4 text-sm text-slate-300">
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(target.is_primary)}
                    onChange={(event) =>
                      setTargets((current) =>
                        current.map((item) => ({
                          ...item,
                          is_primary: item.id === target.id ? event.target.checked : false,
                        })),
                      )
                    }
                  />
                  Primary target
                </label>
                <label className="flex items-center gap-2">
                  <input
                    type="checkbox"
                    checked={Boolean(target.is_editable)}
                    onChange={(event) => updateTarget(setTargets, target.id, { is_editable: event.target.checked })}
                  />
                  Editable
                </label>
              </div>
            </div>
          ))}
        </div>
      ) : null}

      <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="text-xs text-slate-500">Starter workspaces use the managed sample OpenCode template. Existing clones keep their repo topology and inherit the managed template if none exists.</div>
        <button
          type="button"
          onClick={() => void submit()}
          disabled={isSubmitting || !name.trim()}
          className="rounded-xl bg-cyan-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-cyan-200 disabled:cursor-not-allowed disabled:opacity-60"
        >
          {isSubmitting ? "Provisioning…" : "Create workspace"}
        </button>
      </div>
    </section>
  )
}

function Field({ label, children }: { label: string; children: ReactNode }) {
  return (
    <label className="block text-sm font-medium text-slate-200">
      {label}
      {children}
    </label>
  )
}

function updateTarget(
  setTargets: Dispatch<SetStateAction<TargetDraft[]>>,
  targetID: string,
  patch: Partial<TargetDraft>,
) {
  setTargets((current) => current.map((target) => (target.id === targetID ? { ...target, ...patch } : target)))
}

export function projectModeLabel(project: Project) {
  return modeLabel(project)
}
