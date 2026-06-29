"use client"

import { useState } from "react"
import { api } from "@/lib/api"
import { useToast } from "@/components/ui/toast-provider"
import { RejectionModal } from "@/components/ui/rejection-modal"
import type { PendingApprovalItem } from "@/lib/types"

export function ApprovalInbox({
  approvals,
  onChange,
}: {
  approvals: PendingApprovalItem[]
  onChange: () => Promise<void>
}) {
  const { pushToast } = useToast()
  const [error, setError] = useState("")
  const [busyTaskId, setBusyTaskId] = useState<number | null>(null)
  const [rejectingItem, setRejectingItem] = useState<PendingApprovalItem | null>(null)

  async function approve(item: PendingApprovalItem) {
    setBusyTaskId(item.id)
    setError("")
    try {
      await api.approveTask(item.project, item.id)
      await onChange()
      pushToast(`Approved task #${item.id} for ${item.project_name}.`, "success")
    } catch (approvalError) {
      pushToast("Unable to approve task.", "error")
      setError(approvalError instanceof Error ? approvalError.message : "Unable to approve task")
    } finally {
      setBusyTaskId(null)
    }
  }

  async function reject(item: PendingApprovalItem, reason: string) {
    setBusyTaskId(item.id)
    setError("")
    try {
      await api.rejectTask(item.project, item.id, reason)
      await onChange()
      pushToast(`Rejected task #${item.id} for ${item.project_name}.`, "info")
      setRejectingItem(null)
    } catch (rejectionError) {
      pushToast("Unable to reject task.", "error")
      setError(rejectionError instanceof Error ? rejectionError.message : "Unable to reject task")
    } finally {
      setBusyTaskId(null)
    }
  }

  return (
    <section id="approval-inbox" tabIndex={-1} className="mt-8 scroll-mt-6 rounded-3xl border border-white/10 bg-white/[0.04] p-5 outline-none focus:ring-4 focus:ring-amber-300/20">
      <div className="flex items-start justify-between gap-4">
        <div>
          <p className="text-sm font-medium text-amber-200">Approval Inbox</p>
          <h2 className="mt-2 text-xl font-semibold text-white">Queued requests from locked workspaces</h2>
          <p className="mt-1 text-sm text-slate-400">
            Only lock owners or admins can review these requests.
          </p>
        </div>
        <span className="rounded-full bg-white/10 px-3 py-1 text-xs font-medium text-slate-200">{approvals.length} pending</span>
      </div>

      {error ? <div className="mt-4 rounded-xl bg-red-500/10 px-4 py-3 text-sm text-red-200">{error}</div> : null}

      <div className="mt-4 space-y-3">
        {approvals.length ? (
          approvals.map((item) => (
            <article key={item.id} className="rounded-2xl border border-white/10 bg-slate-950/60 p-4">
              <div className="flex flex-wrap items-center justify-between gap-2">
                <p className="font-medium text-white">
                  {item.project_name} · Task #{item.id}
                </p>
                <p className="text-xs text-slate-400">Requested by {item.requested_by}</p>
              </div>
              <p className="mt-2 text-sm text-slate-300">{item.instruction_payload}</p>
              <p className="mt-2 text-xs text-slate-500">{new Date(item.created_at).toLocaleString()}</p>
              <div className="mt-3 flex gap-2">
                <button
                  onClick={() => approve(item)}
                  disabled={busyTaskId === item.id}
                  className="rounded-lg border border-emerald-300/30 px-3 py-1.5 text-xs font-medium text-emerald-100 hover:bg-emerald-300/10 disabled:opacity-60"
                >
                  Approve
                </button>
                <button
                  onClick={() => setRejectingItem(item)}
                  disabled={busyTaskId === item.id}
                  className="rounded-lg border border-red-300/30 px-3 py-1.5 text-xs font-medium text-red-100 hover:bg-red-300/10 disabled:opacity-60"
                >
                  Reject
                </button>
              </div>
            </article>
          ))
        ) : (
          <p className="rounded-2xl border border-dashed border-white/10 p-4 text-sm text-slate-500">No pending approvals.</p>
        )}
      </div>
      <RejectionModal
        isOpen={Boolean(rejectingItem)}
        title={rejectingItem ? `Reject task #${rejectingItem.id}` : "Reject task"}
        description={rejectingItem ? `Provide feedback for ${rejectingItem.project_name}. The requester will see this reason in task feedback.` : "Provide a rejection reason."}
        isSubmitting={Boolean(rejectingItem && busyTaskId === rejectingItem.id)}
        onCancel={() => setRejectingItem(null)}
        onConfirm={async (reason) => {
          if (rejectingItem) await reject(rejectingItem, reason)
        }}
      />
    </section>
  )
}
