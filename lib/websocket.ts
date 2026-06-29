import { getAccessToken } from "./token-storage"
import { refreshAccessToken, WS_BASE_URL } from "./api"
import type { WorkspaceEvent } from "./types"

type SocketStatus = "connecting" | "open" | "closed" | "reconnecting" | "failed"

export function openProjectSocket(
  projectId: number,
  onEvent: (event: WorkspaceEvent) => void,
  onStatus?: (status: SocketStatus) => void,
) {
  let closedByClient = false
  let socket: WebSocket | null = null
  let reconnectAttempt = 0

  function buildSocketUrl() {
    const token = getAccessToken()
    const query = token ? `?token=${encodeURIComponent(token)}` : ""
    return `${WS_BASE_URL}/ws/projects/${projectId}/${query}`
  }

  function reconnectDelay(attempt: number) {
    const capped = Math.min(10_000, 500 * 2 ** attempt)
    return capped + Math.floor(Math.random() * 200)
  }

  async function connect() {
    if (closedByClient) return
    onStatus?.(reconnectAttempt === 0 ? "connecting" : "reconnecting")

    socket = new WebSocket(buildSocketUrl())

    socket.addEventListener("open", () => {
      reconnectAttempt = 0
      onStatus?.("open")
    })

    socket.addEventListener("message", (message) => {
      try {
        onEvent(JSON.parse(message.data) as WorkspaceEvent)
      } catch {
        // Ignore malformed websocket events.
      }
    })

    socket.addEventListener("close", async (event) => {
      if (closedByClient) {
        onStatus?.("closed")
        return
      }

      if (event.code === 4401 || event.code === 4403) {
        const refreshed = await refreshAccessToken()
        if (!refreshed) {
          onStatus?.("failed")
          return
        }
      }

      reconnectAttempt += 1
      const delay = reconnectDelay(reconnectAttempt)
      window.setTimeout(() => {
        connect().catch(() => {
          onStatus?.("failed")
        })
      }, delay)
    })

    socket.addEventListener("error", () => {
      // Let close handler drive reconnect behavior.
    })
  }

  connect().catch(() => {
    onStatus?.("failed")
  })

  return {
    close() {
      closedByClient = true
      socket?.close()
      onStatus?.("closed")
    },
  }
}
