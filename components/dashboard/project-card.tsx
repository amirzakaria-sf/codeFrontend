import Link from "next/link"
import type { Project } from "@/lib/types"
import { projectModeLabel } from "./project-provisioner"

export function ProjectCard({ project }: { project: Project }) {
  const primaryTarget = project.targets.find((target) => target.is_primary) ?? project.targets[0]
  const workspaceReady = Boolean(project.allocated_port && project.daemon_pid)

  const cardContent = (
    <>
      <div className="flex items-start justify-between gap-4">
        <div>
          <h2 className="text-xl font-semibold text-white">{project.name}</h2>
          <p className="mt-1 text-[11px] uppercase tracking-wide text-slate-500">Workspace path</p>
          <p className="mt-1 max-w-full truncate font-mono text-sm text-slate-400">{project.host_path ?? project.runtime_path ?? project.absolute_path}</p>
          <div className="mt-3 flex flex-wrap gap-2 text-xs">
            <span className="rounded-full border border-cyan-300/20 bg-cyan-300/10 px-2.5 py-1 text-cyan-100">{projectModeLabel(project)}</span>
            {project.path_owner_username ? (
              <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-300">owner path: {project.path_owner_username}</span>
            ) : null}
            <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-slate-300">
              {project.targets.length} target{project.targets.length === 1 ? "" : "s"}
            </span>
            <span className={`rounded-full border px-2.5 py-1 ${project.setup_status === "READY" ? "border-emerald-300/20 bg-emerald-300/10 text-emerald-100" : "border-amber-300/20 bg-amber-300/10 text-amber-100"}`}>
              {project.setup_status === "READY" ? "Ready" : "Setup draft"}
            </span>
          </div>
        </div>
        <span
          className={`rounded-full px-3 py-1 text-xs font-semibold ${
            project.is_locked ? "bg-amber-300/15 text-amber-200" : "bg-emerald-300/15 text-emerald-200"
          }`}
        >
          {project.is_locked ? "Locked" : "Open"}
        </span>
      </div>
      <div className="mt-6 grid grid-cols-2 gap-3 text-sm">
        <div className="rounded-2xl bg-slate-950/60 p-3">
          <p className="text-slate-500">Primary target</p>
          <p className="mt-1 font-mono text-slate-100">{primaryTarget?.name ?? "—"}</p>
        </div>
        <div className="rounded-2xl bg-slate-950/60 p-3">
          <p className="text-slate-500">Port / PID</p>
          <p className="mt-1 font-mono text-slate-100">{project.allocated_port ?? "—"} / {project.daemon_pid ?? "—"}</p>
        </div>
      </div>
      {project.targets.length ? (
        <div className="mt-4 flex flex-wrap gap-2">
          {project.targets.slice(0, 3).map((target) => (
            <span key={target.id} className="rounded-full border border-white/10 bg-slate-950/60 px-2.5 py-1 text-[11px] text-slate-300">
              {target.name} · {target.role.toLowerCase()}
            </span>
          ))}
          {project.targets.length > 3 ? <span className="rounded-full border border-white/10 bg-slate-950/60 px-2.5 py-1 text-[11px] text-slate-400">+{project.targets.length - 3} more</span> : null}
        </div>
      ) : null}
      <p className="mt-5 text-sm font-medium text-cyan-200 opacity-0 transition group-hover:opacity-100">
        {workspaceReady ? "Open workspace →" : "Open & prepare workspace →"}
      </p>
    </>
  )

  return (
    <Link
      href={`/dashboard/projects/${project.id}?prepare=1`}
      className="group rounded-3xl border border-white/10 bg-white/[0.04] p-5 shadow-xl shadow-slate-950/20 transition hover:-translate-y-1 hover:border-cyan-300/40 hover:bg-white/[0.07]"
    >
      {cardContent}
    </Link>
  )
}
