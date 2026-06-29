"use client"

import { createContext, useCallback, useContext, useMemo, useState } from "react"

type ToastType = "success" | "error" | "info"

type ToastItem = {
  id: number
  type: ToastType
  message: string
}

type ToastContextValue = {
  pushToast: (message: string, type?: ToastType) => void
}

const ToastContext = createContext<ToastContextValue | null>(null)

export function ToastProvider({ children }: { children: React.ReactNode }) {
  const [toasts, setToasts] = useState<ToastItem[]>([])

  const pushToast = useCallback((message: string, type: ToastType = "info") => {
    const id = Date.now() + Math.floor(Math.random() * 1000)
    setToasts((current) => [...current, { id, type, message }])
    window.setTimeout(() => {
      setToasts((current) => current.filter((item) => item.id !== id))
    }, 3500)
  }, [])

  const value = useMemo(() => ({ pushToast }), [pushToast])

  return (
    <ToastContext.Provider value={value}>
      {children}
      <div className="pointer-events-none fixed right-4 top-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <div
            key={toast.id}
            className={`rounded-xl border px-4 py-3 text-sm shadow-xl backdrop-blur ${
              toast.type === "success"
                ? "border-emerald-300/30 bg-emerald-300/10 text-emerald-100"
                : toast.type === "error"
                  ? "border-red-300/30 bg-red-300/10 text-red-100"
                  : "border-cyan-300/30 bg-cyan-300/10 text-cyan-100"
            }`}
          >
            {toast.message}
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  )
}

export function useToast() {
  const value = useContext(ToastContext)
  if (!value) throw new Error("useToast must be used inside ToastProvider")
  return value
}
