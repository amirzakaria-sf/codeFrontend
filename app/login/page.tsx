import { LoginForm } from "@/components/auth/login-form"

export default function LoginPage() {
  return (
    <main className="min-h-screen overflow-hidden bg-[radial-gradient(circle_at_top_left,_rgba(34,211,238,0.18),_transparent_32%),radial-gradient(circle_at_bottom_right,_rgba(99,102,241,0.18),_transparent_32%),#020617] px-4 py-8 text-slate-100 sm:px-6 lg:px-8">
      <div className="mx-auto flex min-h-[calc(100vh-4rem)] max-w-6xl items-center">
        <div className="grid w-full gap-10 lg:grid-cols-[1.1fr_0.9fr] lg:items-center">
          <section>
            <p className="mb-5 inline-flex rounded-full border border-cyan-300/20 bg-cyan-300/10 px-4 py-2 text-sm font-medium text-cyan-100">
              Foundry-AI Multi-Agent Workspace Orchestrator
            </p>
            <h1 className="max-w-3xl text-4xl font-semibold tracking-tight text-white sm:text-5xl lg:text-6xl">
              Coordinate isolated OpenCode agents across every workspace.
            </h1>
            <p className="mt-6 max-w-2xl text-lg leading-8 text-slate-300">
              Provision three-folder projects, spawn isolated daemons, queue locked repository changes, and track supervisor-verified diffs from one control plane.
            </p>
            <div className="mt-8 grid max-w-2xl gap-3 sm:grid-cols-3">
              {["Project locks", "Agent Kanban", "Audit diffs"].map((item) => (
                <div key={item} className="rounded-2xl border border-white/10 bg-white/[0.05] p-4 text-sm text-slate-200">
                  {item}
                </div>
              ))}
            </div>
          </section>
          <section className="mx-auto w-full max-w-md">
            <LoginForm />
            <p className="mt-4 text-center text-sm text-slate-400">
              Users are managed from Django Admin at <span className="font-mono text-slate-200">/admin</span>.
            </p>
          </section>
        </div>
      </div>
    </main>
  )
}
