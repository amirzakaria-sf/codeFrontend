"use client"

import { FormEvent, useEffect, useRef } from "react"

type RejectionModalProps = {
  title: string
  description: string
  isOpen: boolean
  isSubmitting?: boolean
  onCancel: () => void
  onConfirm: (reason: string) => Promise<void> | void
}

export function RejectionModal({
  title,
  description,
  isOpen,
  isSubmitting = false,
  onCancel,
  onConfirm,
}: RejectionModalProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null)

  useEffect(() => {
    if (!isOpen) return
    window.setTimeout(() => textareaRef.current?.focus(), 0)
  }, [isOpen])

  if (!isOpen) return null

  async function submit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault()
    await onConfirm(textareaRef.current?.value ?? "")
  }

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-slate-950/80 px-4 backdrop-blur-sm" role="dialog" aria-modal="true" aria-labelledby="rejection-modal-title">
      <form onSubmit={submit} className="w-full max-w-lg rounded-3xl border border-white/10 bg-slate-900 p-5 shadow-2xl">
        <div className="flex items-start justify-between gap-4">
          <div>
            <h2 id="rejection-modal-title" className="text-lg font-semibold text-white">
              {title}
            </h2>
            <p className="mt-2 text-sm leading-6 text-slate-400">{description}</p>
          </div>
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-full border border-white/10 px-3 py-1 text-sm text-slate-300 hover:bg-white/10 disabled:opacity-60"
          >
            Esc
          </button>
        </div>

        <label htmlFor="rejection-reason" className="mt-5 block text-sm font-medium text-slate-200">
          Rejection reason
        </label>
        <textarea
          ref={textareaRef}
          id="rejection-reason"
          rows={5}
          placeholder="Explain what needs to change before this task can proceed…"
          className="mt-2 w-full rounded-2xl border border-white/10 bg-slate-950 px-4 py-3 text-sm text-white outline-none ring-red-300/30 focus:border-red-300 focus:ring-4"
        />

        <div className="mt-5 flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
          <button
            type="button"
            onClick={onCancel}
            disabled={isSubmitting}
            className="rounded-xl border border-white/10 px-4 py-3 text-sm font-medium text-slate-200 hover:bg-white/10 disabled:opacity-60"
          >
            Cancel
          </button>
          <button
            type="submit"
            disabled={isSubmitting}
            className="rounded-xl bg-red-300 px-4 py-3 text-sm font-semibold text-slate-950 hover:bg-red-200 disabled:cursor-not-allowed disabled:opacity-60"
          >
            {isSubmitting ? "Rejecting…" : "Reject task"}
          </button>
        </div>
      </form>
    </div>
  )
}
