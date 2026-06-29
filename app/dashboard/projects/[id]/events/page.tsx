import { KanbanBoard } from "@/components/projects/kanban-board"

export default async function ProjectEventsPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params
  return <KanbanBoard projectId={Number(id)} section="events" />
}
