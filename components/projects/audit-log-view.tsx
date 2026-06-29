"use client"

import { useEffect, useState } from "react"
import Link from "next/link"
import { api } from "@/lib/api"
import type { AuditLog, Project } from "@/lib/types"

export function AuditLogView({ projectId }: { projectId: number }) {
  const [project, setProject] = useState<Project | null>(null)
  const [logs, setLogs] = useState<AuditLog[]>([])
  const [selected, setSelected] = useState<AuditLog | null>(null)
  const [error, setError] = useState("")

  useEffect(() => {
    Promise.all([api.project(projectId), api.audit(projectId)])
      .then(([projectPayload, auditPayload]) => {
        setProject(projectPayload)
        setLogs(auditPayload)
        setSelected(auditPayload[0] ?? null)
      })
      .catch((loadError) => setError(loadError instanceof Error ? loadError.message : "Unable to load audit log"))
  }, [projectId])

  return (
    <div className="space-y-8">
      <header>
        <Link href={`/dashboard/projects/${projectId}`} className="text-sm text-cyan-300 hover:text-cyan-200">
          ← Back to project
        </Link>
        <h1 className="mt-3 text-3xl font-semibold tracking-tight text-white">Audit log</h1>
        <p className="mt-2 text-slate-400">{project?.name ?? "Workspace"} diff history and user attribution.</p>
      </header>

      {error ? <div className="rounded-2xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

      <div className="grid gap-6 xl:grid-cols-[0.9fr_1.4fr]">
        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <h2 className="font-semibold text-white">Entries</h2>
          <div className="mt-4 space-y-3">
            {logs.length ? (
              logs.map((log) => (
                <button
                  key={log.id}
                  onClick={() => setSelected(log)}
                  className={`w-full rounded-2xl border p-4 text-left transition ${
                    selected?.id === log.id ? "border-cyan-300/50 bg-cyan-300/10" : "border-white/10 bg-slate-950/50 hover:bg-white/[0.06]"
                  }`}
                >
                  <p className="text-sm font-medium text-white">Audit #{log.id}</p>
                  <p className="mt-1 text-xs text-slate-400">{new Date(log.timestamp).toLocaleString()}</p>
                  <p className="mt-3 line-clamp-3 text-sm text-slate-300">{log.original_prompt}</p>
                </button>
              ))
            ) : (
              <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">No audit entries yet.</p>
            )}
          </div>
        </section>

        <section className="rounded-3xl border border-white/10 bg-white/[0.03] p-4">
          <div className="flex items-center justify-between gap-4">
            <h2 className="font-semibold text-white">Generated diff</h2>
            {selected ? <span className="text-xs text-slate-500">#{selected.id}</span> : null}
          </div>
          {selected ? (
            <pre className="mt-4 max-h-[70vh] overflow-auto rounded-2xl bg-slate-950 p-4 text-xs leading-6 text-slate-300 ring-1 ring-white/10">
              {selected.generated_diff || "No diff captured."}
            </pre>
          ) : (
            <p className="mt-4 rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">Select an audit entry.</p>
          )}
        </section>
      </div>
    </div>
  )
}
